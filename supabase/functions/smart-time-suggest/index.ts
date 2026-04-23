import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { pickModel, logAICall } from "../_shared/ai-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Get user's active tasks (in_progress, todo) with project info
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, title, status, priority, estimated_hours, project_id, project:projects(name)")
      .eq("assigned_to", user.id)
      .in("status", ["in_progress", "todo", "in_review"])
      .order("priority", { ascending: true });

    // Get today's existing time entries
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    const { data: todayEntries } = await supabase
      .from("time_entries")
      .select("task_id, duration_minutes, description")
      .eq("user_id", user.id)
      .gte("start_time", todayStart)
      .eq("is_running", false);

    // Get recent time patterns (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: recentEntries } = await supabase
      .from("time_entries")
      .select("task_id, duration_minutes, start_time")
      .eq("user_id", user.id)
      .gte("start_time", weekAgo)
      .eq("is_running", false);

    if (!tasks?.length) {
      return new Response(JSON.stringify({ suggestions: [], summary: "Δεν υπάρχουν ενεργές εργασίες." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const todayEntriesMap: Record<string, number> = {};
    (todayEntries || []).forEach((e: any) => {
      if (e.task_id) todayEntriesMap[e.task_id] = (todayEntriesMap[e.task_id] || 0) + (e.duration_minutes || 0);
    });

    const patternMap: Record<string, { totalMin: number; days: number }> = {};
    (recentEntries || []).forEach((e: any) => {
      if (e.task_id) {
        if (!patternMap[e.task_id]) patternMap[e.task_id] = { totalMin: 0, days: 0 };
        patternMap[e.task_id].totalMin += e.duration_minutes || 0;
        patternMap[e.task_id].days += 1;
      }
    });

    const prompt = `You are a smart time tracking assistant. Based on the user's active tasks, today's logged hours, and recent patterns, suggest time entries for today.

Active tasks:
${JSON.stringify(tasks?.map(t => ({
  id: t.id,
  title: t.title,
  status: t.status,
  priority: t.priority,
  estimated_hours: t.estimated_hours,
  project: (t as any).project?.name,
})), null, 2)}

Already logged today (task_id → minutes):
${JSON.stringify(todayEntriesMap)}

Recent patterns (task_id → avg daily minutes):
${JSON.stringify(Object.fromEntries(Object.entries(patternMap).map(([k, v]) => [k, Math.round(v.totalMin / Math.max(v.days, 1))])))}

Rules:
- Suggest 2-5 time entries for the rest of today
- Higher priority and in_progress tasks should get more time
- Don't suggest entries for tasks that already have significant logged time today (>2h)
- Each suggestion should have: task_id, task_title, project_name, suggested_minutes (15-480), description (brief activity description in Greek)
- Also provide a brief daily summary in Greek

Use the suggest_entries tool.`;

    const MODEL = pickModel("simple_extraction");
    const start = Date.now();
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        tools: [{
          type: "function",
          function: {
            name: "suggest_entries",
            description: "Return suggested time entries for today",
            parameters: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      task_id: { type: "string" },
                      task_title: { type: "string" },
                      project_name: { type: "string" },
                      suggested_minutes: { type: "number" },
                      description: { type: "string" },
                    },
                    required: ["task_id", "task_title", "suggested_minutes", "description"],
                    additionalProperties: false,
                  },
                },
                summary: { type: "string", description: "Brief daily summary in Greek" },
              },
              required: ["suggestions", "summary"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "suggest_entries" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      return new Response(JSON.stringify({ error: "AI suggestion failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const args = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;

      return new Response(JSON.stringify(args), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ suggestions: [], summary: "Δεν ήταν δυνατή η δημιουργία προτάσεων." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("smart-time-suggest error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
