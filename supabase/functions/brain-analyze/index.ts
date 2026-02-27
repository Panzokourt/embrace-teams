import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const perplexityApiKey = Deno.env.get("PERPLEXITY_API_KEY");
    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub;

    // Get company_id
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await serviceClient
      .from("user_company_roles")
      .select("company_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .single();

    if (!roleData?.company_id) {
      return new Response(JSON.stringify({ error: "No company found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const companyId = roleData.company_id;

    // Step 1: Data Aggregation (parallel)
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

    // Get profiles for team context
    const { data: profiles } = await serviceClient.from("profiles").select("id, full_name, job_title, department_id, status").eq("status", "active").limit(100);

    // Step 2: Perplexity market intelligence (if available)
    let marketIntel = "";
    if (perplexityApiKey && clients.length > 0) {
      const sectors = [...new Set(clients.filter(c => c.sector).map(c => c.sector))].slice(0, 5);
      if (sectors.length > 0) {
        try {
          const perplexityRes = await fetch("https://api.perplexity.ai/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${perplexityApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "sonar",
              messages: [
                { role: "system", content: "You are a market intelligence analyst. Provide concise, actionable insights about industry trends, opportunities, and threats. Focus on digital marketing and advertising industry in Greece/Europe. Write in Greek." },
                { role: "user", content: `Analyze current trends and opportunities for these sectors: ${sectors.join(", ")}. Focus on: 1) Digital marketing trends 2) New advertising channels 3) Budget allocation shifts 4) Technology adoption. Keep it concise and actionable.` },
              ],
              search_recency_filter: "month",
            }),
          });
          if (perplexityRes.ok) {
            const perplexityData = await perplexityRes.json();
            marketIntel = perplexityData.choices?.[0]?.message?.content || "";
            const citations = perplexityData.citations || [];
            if (citations.length > 0) {
              marketIntel += "\n\nΠηγές: " + citations.join(", ");
            }
          }
        } catch (e) {
          console.error("Perplexity error:", e);
        }
      }
    }

    // Step 3: Firecrawl (if available) - scrape client websites for context
    let firecrawlContext = "";
    if (firecrawlApiKey && clients.length > 0) {
      const clientsWithWebsites = clients.filter(c => c.website).slice(0, 3);
      for (const client of clientsWithWebsites) {
        try {
          let url = client.website!.trim();
          if (!url.startsWith("http")) url = `https://${url}`;
          const fcRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${firecrawlApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ url, formats: ["summary"], onlyMainContent: true }),
          });
          if (fcRes.ok) {
            const fcData = await fcRes.json();
            const summary = fcData.data?.summary || fcData.summary || "";
            if (summary) {
              firecrawlContext += `\n[${client.name}] Website summary: ${summary}\n`;
            }
          }
        } catch (e) {
          console.error("Firecrawl error for", client.name, e);
        }
      }
    }

    // Step 4: Build comprehensive prompt with NLP + Neuromarketing instructions
    const dataContext = JSON.stringify({
      projects: projects.map(p => ({
        id: p.id, name: p.name, status: p.status, budget: p.budget,
        net_budget: p.net_budget, progress: p.progress,
        start_date: p.start_date, end_date: p.end_date, client_id: p.client_id,
      })),
      clients: clients.map(c => ({
        id: c.id, name: c.name, sector: c.sector, status: c.status,
        notes: c.notes?.slice(0, 300), tags: c.tags, website: c.website,
      })),
      tasks_summary: {
        total: tasks.length,
        overdue: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done").length,
        by_status: tasks.reduce((acc: Record<string, number>, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {}),
        by_priority: tasks.reduce((acc: Record<string, number>, t) => { acc[t.priority || "none"] = (acc[t.priority || "none"] || 0) + 1; return acc; }, {}),
      },
      recent_comments: comments.slice(0, 30).map(c => ({ content: c.content?.slice(0, 200), project_id: c.project_id })),
      expenses_summary: {
        total: expenses.reduce((s, e) => s + (e.amount || 0), 0),
        by_category: expenses.reduce((acc: Record<string, number>, e) => { acc[e.category || "other"] = (acc[e.category || "other"] || 0) + e.amount; return acc; }, {}),
      },
      team_size: (profiles || []).length,
    }, null, 0);

    const systemPrompt = `You are "Brain", an elite AI business intelligence analyst for a marketing/advertising agency. You combine NLP analysis with neuromarketing psychology to generate actionable insights.

## Your NLP Capabilities:
1. **Sentiment Analysis**: Analyze the tone of comments, notes, and client communications. Detect frustration, satisfaction, urgency, or disengagement.
2. **Keyword Extraction**: Identify recurring themes, service gaps, and trending topics from project descriptions and client notes.
3. **Pattern Recognition**: Spot behavioral patterns (clients reducing engagement, projects consistently over budget, seasonal trends).
4. **Intent Detection**: Infer what clients truly need based on their activity history, not just what they explicitly ask for.

## Neuromarketing Tactics (MUST apply at least one per insight):
1. **Loss Aversion**: Frame opportunities as potential losses. "Client X is losing ~€5K/month without SEO" instead of "Could gain €5K".
2. **Anchoring**: Compare with benchmarks. "Similar clients spend 3x more on digital".
3. **Social Proof**: "80% of your retail clients also have influencer campaigns".
4. **Scarcity/Urgency**: "Google Ads Q1 offer expires in 2 weeks".
5. **Reciprocity**: "After +30% ROI on Social, ideal time for upsell".
6. **Peak-End Rule**: Suggest follow-up after successful project delivery.
7. **Decoy Effect**: Suggest presenting 3 packages (Basic/Pro/Enterprise) for upsell.

## MANDATORY CATEGORY DISTRIBUTION:
You MUST generate insights across these categories. AT MINIMUM:
- At least 1 insight with category **"market"**: Pure EXTERNAL market news, industry trends, competitor moves, regulatory changes. This MUST be based on the Perplexity/market intelligence data provided. NOT internal company data.
- At least 1 insight with category **"neuro"**: A pure neuromarketing SELLING play — a specific psychological tactic with a ready-to-use script or framing for a specific client. Example: "Πείτε στον πελάτη Χ: Κάθε μέρα χωρίς SEO χάνετε €200 σε organic traffic (Loss Aversion)".
- At least 1 "strategic", 1 "sales", 1 "productivity" or "alert" insight.

Category definitions:
- **strategic**: Long-term business decisions, resource allocation, growth opportunities
- **sales**: Upsell, cross-sell, retention opportunities with specific clients
- **productivity**: Team efficiency, workload, process improvements, deadline risks
- **market**: EXTERNAL market trends, industry news, competitor analysis — NOT internal data
- **alert**: Urgent issues requiring immediate attention (overdue tasks, budget overruns, client churn risk)
- **neuro**: A pure neuromarketing play — a specific psychological selling tactic with a ready-to-use approach for a named client

## Output Rules:
- Generate 6-12 insights covering ALL categories above
- Each insight MUST have evidence linking to specific entities (clients, projects, users)
- Each insight MUST apply at least one neuromarketing tactic
- Write everything in GREEK
- Be specific with numbers, names, and actionable recommendations
- Include sentiment scores where relevant in nlp_metadata
- For "market" insights: include the market_context field with the source data
- For "neuro" insights: include a ready-to-use selling script in the body`;

    const userPrompt = `Analyze this company data and generate intelligence insights:

${dataContext}

${marketIntel ? `\n## Market Intelligence (from Perplexity):\n${marketIntel}` : ""}
${firecrawlContext ? `\n## Client Website Analysis (from Firecrawl):\n${firecrawlContext}` : ""}

Generate actionable insights using NLP analysis and neuromarketing framing.`;

    // Step 5: Call Lovable AI with tool calling for structured output
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_brain_insights",
              description: "Generate structured business intelligence insights with NLP metadata and neuromarketing framing",
              parameters: {
                type: "object",
                properties: {
                  insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string", enum: ["strategic", "sales", "productivity", "market", "alert", "neuro"] },
                        subcategory: { type: "string", enum: ["upsell", "cross_sell", "retention", "framing", "anchoring", "sentiment", "workload", "deadline", "budget", "trend"] },
                        priority: { type: "string", enum: ["high", "medium", "low"] },
                        title: { type: "string", description: "Concise Greek title" },
                        body: { type: "string", description: "Detailed insight in Greek with markdown formatting" },
                        evidence: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              type: { type: "string", enum: ["client", "project", "user", "task"] },
                              id: { type: "string" },
                              name: { type: "string" },
                            },
                            required: ["type", "id", "name"],
                          },
                        },
                        nlp_metadata: {
                          type: "object",
                          properties: {
                            sentiment: { type: "string", enum: ["positive", "negative", "neutral", "mixed"] },
                            sentiment_score: { type: "number" },
                            keywords: { type: "array", items: { type: "string" } },
                            detected_intent: { type: "string" },
                          },
                        },
                        neuro_tactic: { type: "string", enum: ["loss_aversion", "anchoring", "social_proof", "scarcity", "reciprocity", "peak_end_rule", "decoy_effect"] },
                        neuro_rationale: { type: "string", description: "Explain in Greek why this neuromarketing tactic works here" },
                        market_context: { type: "string", description: "External market context if relevant" },
                      },
                      required: ["category", "priority", "title", "body", "evidence", "neuro_tactic", "neuro_rationale"],
                    },
                  },
                },
                required: ["insights"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_brain_insights" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No insights generated" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let insightsPayload;
    try {
      insightsPayload = JSON.parse(toolCall.function.arguments);
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const insights = insightsPayload.insights || [];

    // Build evidence URLs
    const enrichedInsights = insights.map((insight: any) => ({
      ...insight,
      evidence: (insight.evidence || []).map((ev: any) => ({
        ...ev,
        url: ev.type === "client" ? `/clients/${ev.id}` :
             ev.type === "project" ? `/projects/${ev.id}` :
             ev.type === "user" ? `/hr/employee/${ev.id}` :
             ev.type === "task" ? `/tasks/${ev.id}` : "#",
      })),
    }));

    // Step 6: Store in database
    const insightRows = enrichedInsights.map((i: any) => ({
      company_id: companyId,
      category: i.category,
      subcategory: i.subcategory || null,
      priority: i.priority,
      title: i.title,
      body: i.body,
      evidence: i.evidence,
      nlp_metadata: i.nlp_metadata || {},
      neuro_tactic: i.neuro_tactic,
      neuro_rationale: i.neuro_rationale,
      market_context: i.market_context || null,
      citations: [],
      is_dismissed: false,
      is_actioned: false,
    }));

    if (insightRows.length > 0) {
      const { error: insertError } = await serviceClient.from("brain_insights").insert(insightRows);
      if (insertError) {
        console.error("Insert error:", insertError);
      }
    }

    return new Response(JSON.stringify({ success: true, insights: enrichedInsights, count: enrichedInsights.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Brain analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
