import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const perplexityApiKey = Deno.env.get("PERPLEXITY_API_KEY");
    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");

    if (!ANTHROPIC_API_KEY) return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    const userId = claimsData.claims.sub;

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await serviceClient.from("user_company_roles").select("company_id").eq("user_id", userId).eq("status", "active").limit(1).single();
    if (!roleData?.company_id) return new Response(JSON.stringify({ error: "No company found" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const companyId = roleData.company_id;

    const [projectsRes, clientsRes, tasksRes, commentsRes, financialsRes] = await Promise.all([
      serviceClient.from("projects").select("id, name, status, budget, net_budget, commission_rate, progress, start_date, end_date, client_id").eq("company_id", companyId).limit(100),
      serviceClient.from("clients").select("id, name, sector, status, notes, contact_email, website, tags, social_accounts, strategy").eq("company_id", companyId).limit(100),
      serviceClient.from("tasks").select("id, title, status, priority, assigned_to, due_date, project_id, created_at").limit(500),
      serviceClient.from("comments").select("id, content, user_id, project_id, task_id, created_at").order("created_at", { ascending: false }).limit(200),
      serviceClient.from("expenses").select("id, amount, category, expense_type, project_id, client_id, expense_date").limit(200),
    ]);

    const projects = projectsRes.data || [];
    const clients = clientsRes.data || [];
    const tasks = tasksRes.data || [];
    const comments = commentsRes.data || [];
    const expenses = financialsRes.data || [];
    const { data: profiles } = await serviceClient.from("profiles").select("id, full_name, job_title, department_id, status").eq("status", "active").limit(100);

    // Perplexity market intelligence
    let marketIntel = "";
    if (perplexityApiKey && clients.length > 0) {
      const sectors = [...new Set(clients.filter(c => c.sector).map(c => c.sector))].slice(0, 5);
      if (sectors.length > 0) {
        try {
          const perplexityRes = await fetch("https://api.perplexity.ai/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${perplexityApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "sonar",
              messages: [
                { role: "system", content: "You are a market intelligence analyst. Provide concise, actionable insights about industry trends. Focus on digital marketing in Greece/Europe. Write in Greek." },
                { role: "user", content: `Analyze current trends for: ${sectors.join(", ")}. Focus on digital marketing trends, new channels, budget shifts, tech adoption.` },
              ],
              search_recency_filter: "month",
            }),
          });
          if (perplexityRes.ok) {
            const d = await perplexityRes.json();
            marketIntel = d.choices?.[0]?.message?.content || "";
            const citations = d.citations || [];
            if (citations.length > 0) marketIntel += "\n\nΠηγές: " + citations.join(", ");
          }
        } catch (e) { console.error("Perplexity error:", e); }
      }
    }

    // Firecrawl
    let firecrawlContext = "";
    if (firecrawlApiKey && clients.length > 0) {
      for (const client of clients.filter(c => c.website).slice(0, 3)) {
        try {
          let url = client.website!.trim();
          if (!url.startsWith("http")) url = `https://${url}`;
          const fcRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: { Authorization: `Bearer ${firecrawlApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ url, formats: ["summary"], onlyMainContent: true }),
          });
          if (fcRes.ok) {
            const fcData = await fcRes.json();
            const summary = fcData.data?.summary || "";
            if (summary) firecrawlContext += `\n[${client.name}] Website: ${summary}\n`;
          }
        } catch (e) { console.error("Firecrawl error:", e); }
      }
    }

    const dataContext = JSON.stringify({
      projects: projects.map(p => ({ id: p.id, name: p.name, status: p.status, budget: p.budget, net_budget: p.net_budget, progress: p.progress, start_date: p.start_date, end_date: p.end_date, client_id: p.client_id })),
      clients: clients.map(c => ({ id: c.id, name: c.name, sector: c.sector, status: c.status, notes: c.notes?.slice(0, 300), tags: c.tags, website: c.website })),
      tasks_summary: {
        total: tasks.length,
        overdue: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done").length,
        by_status: tasks.reduce((acc: Record<string, number>, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {}),
      },
      recent_comments: comments.slice(0, 30).map(c => ({ content: c.content?.slice(0, 200), project_id: c.project_id })),
      expenses_summary: { total: expenses.reduce((s, e) => s + (e.amount || 0), 0) },
      team_size: (profiles || []).length,
    }, null, 0);

    const systemPrompt = `You are "Brain", an elite AI business intelligence analyst for a marketing agency. Combine NLP analysis with neuromarketing psychology.

MANDATORY CATEGORY DISTRIBUTION:
- At least 1 "market" insight (external trends from Perplexity data)
- At least 1 "neuro" insight (psychological selling tactic with ready script)
- At least 1 "strategic", 1 "sales", 1 "productivity" or "alert"

Generate 6-12 insights in GREEK. Each must have evidence linking to specific entities and apply neuromarketing tactics.`;

    const userPrompt = `Analyze this company data:\n\n${dataContext}\n${marketIntel ? `\nMarket Intelligence:\n${marketIntel}` : ""}\n${firecrawlContext ? `\nClient Websites:\n${firecrawlContext}` : ""}`;

    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        tools: [{
          name: "generate_brain_insights",
          description: "Generate structured business intelligence insights",
          input_schema: {
            type: "object",
            properties: {
              insights: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    category: { type: "string", enum: ["strategic", "sales", "productivity", "market", "alert", "neuro"] },
                    subcategory: { type: "string" },
                    priority: { type: "string", enum: ["high", "medium", "low"] },
                    title: { type: "string" },
                    body: { type: "string" },
                    evidence: { type: "array", items: { type: "object", properties: { type: { type: "string" }, id: { type: "string" }, name: { type: "string" } }, required: ["type", "id", "name"] } },
                    nlp_metadata: { type: "object", properties: { sentiment: { type: "string" }, sentiment_score: { type: "number" }, keywords: { type: "array", items: { type: "string" } }, detected_intent: { type: "string" } } },
                    neuro_tactic: { type: "string", enum: ["loss_aversion", "anchoring", "social_proof", "scarcity", "reciprocity", "peak_end_rule", "decoy_effect"] },
                    neuro_rationale: { type: "string" },
                    market_context: { type: "string" },
                  },
                  required: ["category", "priority", "title", "body", "evidence", "neuro_tactic", "neuro_rationale"],
                },
              },
            },
            required: ["insights"],
          },
        }],
        tool_choice: { type: "tool", name: "generate_brain_insights" },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResponse.status === 402) return new Response(JSON.stringify({ error: "Payment required." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const errText = await aiResponse.text();
      console.error("Anthropic error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResponse.json();
    const toolUse = aiData.content?.find((c: any) => c.type === "tool_use");
    if (!toolUse) return new Response(JSON.stringify({ error: "No insights generated" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const insightsPayload = toolUse.input;
    const insights = insightsPayload.insights || [];

    const enrichedInsights = insights.map((insight: any) => ({
      ...insight,
      evidence: (insight.evidence || []).map((ev: any) => ({
        ...ev,
        url: ev.type === "client" ? `/clients/${ev.id}` : ev.type === "project" ? `/projects/${ev.id}` : ev.type === "user" ? `/hr/employee/${ev.id}` : "#",
      })),
    }));

    const insightRows = enrichedInsights.map((i: any) => ({
      company_id: companyId, category: i.category, subcategory: i.subcategory || null,
      priority: i.priority, title: i.title, body: i.body, evidence: i.evidence,
      nlp_metadata: i.nlp_metadata || {}, neuro_tactic: i.neuro_tactic,
      neuro_rationale: i.neuro_rationale, market_context: i.market_context || null,
      citations: [], is_dismissed: false, is_actioned: false,
    }));

    if (insightRows.length > 0) {
      const { error: insertError } = await serviceClient.from("brain_insights").insert(insightRows);
      if (insertError) console.error("Insert error:", insertError);
    }

    return new Response(JSON.stringify({ success: true, insights: enrichedInsights, count: enrichedInsights.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("brain-analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
