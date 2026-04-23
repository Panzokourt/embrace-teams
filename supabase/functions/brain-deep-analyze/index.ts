import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { pickModel, logAICall } from "../_shared/ai-router.ts";

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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const perplexityApiKey = Deno.env.get("PERPLEXITY_API_KEY");

    if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const { insight } = await req.json();
    if (!insight) return new Response(JSON.stringify({ error: "Missing insight" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const evidence = insight.evidence || [];
    const clientIds = evidence.filter((e: any) => e.type === "client").map((e: any) => e.id);
    const projectIds = evidence.filter((e: any) => e.type === "project").map((e: any) => e.id);
    const taskIds = evidence.filter((e: any) => e.type === "task").map((e: any) => e.id);

    const [clientsRes, projectsRes, tasksRes] = await Promise.all([
      clientIds.length > 0 ? serviceClient.from("clients").select("*").in("id", clientIds) : Promise.resolve({ data: [] }),
      projectIds.length > 0 ? serviceClient.from("projects").select("*").in("id", projectIds) : Promise.resolve({ data: [] }),
      taskIds.length > 0 ? serviceClient.from("tasks").select("*").in("id", taskIds) : Promise.resolve({ data: [] }),
    ]);

    let marketResearch = "";
    if (perplexityApiKey) {
      try {
        const pRes = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${perplexityApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "sonar-pro",
            messages: [
              { role: "system", content: "You are a market research analyst. Provide detailed, sourced analysis. Focus on digital marketing/advertising in Greece/Europe. Write in Greek." },
              { role: "user", content: `Deep dive analysis on: "${insight.title}"\n\nContext: ${insight.body}\n\nProvide: 1) Market data & benchmarks 2) Competitor landscape 3) Opportunities & threats 4) Recommended actions with ROI estimates` },
            ],
            search_recency_filter: "month",
          }),
        });
        if (pRes.ok) {
          const pData = await pRes.json();
          marketResearch = pData.choices?.[0]?.message?.content || "";
          const citations = pData.citations || [];
          if (citations.length > 0) marketResearch += "\n\nΠηγές: " + citations.join(", ");
        }
      } catch (e) { console.error("Perplexity deep dive error:", e); }
    }

    const entityContext = JSON.stringify({
      clients: clientsRes.data || [],
      projects: (projectsRes.data || []).map((p: any) => ({ id: p.id, name: p.name, status: p.status, budget: p.budget, net_budget: p.net_budget, progress: p.progress, start_date: p.start_date, end_date: p.end_date })),
      tasks: (tasksRes.data || []).map((t: any) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, due_date: t.due_date })),
    });

    const systemPrompt = `You are "Brain Deep Dive", an expert AI analyst for a marketing agency. You are given an existing insight and must provide a comprehensive deep analysis.

Your output must include:
1. **Extended Analysis**: A thorough markdown report (500-1000 words in Greek)
2. **Action Plan**: 3-6 concrete steps with timeline and effort estimates
3. **Suggested Project**: If warranted, suggest one with name, description, and budget estimate
4. **Suggested Task**: If warranted, suggest a task with title, description, and priority

Write everything in GREEK. Be specific with numbers and names.`;

    const userPrompt = `## Original Insight
Title: ${insight.title}
Category: ${insight.category}
Priority: ${insight.priority}
Body: ${insight.body}
Neuro Tactic: ${insight.neuro_tactic}
Neuro Rationale: ${insight.neuro_rationale}

## Related Entity Data
${entityContext}

${marketResearch ? `## Market Research (Perplexity)\n${marketResearch}` : ""}

Provide a deep dive analysis.`;

    const MODEL = pickModel("deep_analysis");
    const start = Date.now();
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "deep_dive_result",
            description: "Return deep dive analysis results",
            parameters: {
              type: "object",
              properties: {
                extended_analysis: { type: "string", description: "Extended markdown analysis in Greek (500-1000 words)" },
                action_plan: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      step: { type: "string" },
                      timeline: { type: "string" },
                      effort: { type: "string", enum: ["low", "medium", "high"] },
                    },
                    required: ["step", "timeline", "effort"],
                  },
                },
                suggested_project: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    client_id: { type: "string" },
                    budget: { type: "number" },
                    estimated_duration_days: { type: "number" },
                  },
                  required: ["name", "description"],
                },
                suggested_task: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                    estimated_hours: { type: "number" },
                  },
                  required: ["title", "description", "priority"],
                },
              },
              required: ["extended_analysis", "action_plan"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "deep_dive_result" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResponse.status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return new Response(JSON.stringify({ error: "No analysis generated" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const result = typeof toolCall.function.arguments === "string"
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;

    if (result.suggested_project && !result.suggested_project.client_id && clientIds.length > 0) {
      result.suggested_project.client_id = clientIds[0];
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Brain deep analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
