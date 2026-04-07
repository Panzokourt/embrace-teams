import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tasks, workSchedule, existingSlots } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!tasks || tasks.length === 0) {
      return new Response(JSON.stringify({ assignments: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().split("T")[0];

    // Pre-compute working days list for the prompt
    const workingDays = (workSchedule || [])
      .filter((ws: any) => ws.is_working_day)
      .map((ws: any) => ws.day_of_week);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const workingDayNames = workingDays.map((d: number) => `${dayNames[d]} (${d})`).join(', ');
    const nonWorkingDays = [0,1,2,3,4,5,6].filter((d: number) => !workingDays.includes(d));
    const nonWorkingDayNames = nonWorkingDays.map((d: number) => dayNames[d]).join(', ');

    const systemPrompt = `You are a task scheduling assistant. Given a list of tasks (with priority and estimated_hours), work schedule (working days and hours), and already-scheduled slots, assign each task to an optimal time slot.

Rules:
- CRITICAL: ONLY schedule on working days: ${workingDayNames}
- NEVER schedule on non-working days: ${nonWorkingDayNames}
- Only schedule during the working hours defined in the work schedule
- Higher priority tasks (high > medium > low) should be scheduled earlier
- Don't overlap with existing scheduled slots
- Each task needs consecutive hours equal to its estimated_hours (if it exceeds daily working hours, split across multiple working days)
- Start scheduling from today: ${today}
- Return ISO date strings for due_date (with time, e.g. "2026-04-08T09:00:00")
- If no slots available in the next 14 days, skip the task
- Double-check that the day of the week of each assignment is a working day before returning

Use the schedule_tasks tool to return your assignments.`;

    const userPrompt = `Tasks to schedule:
${JSON.stringify(tasks, null, 2)}

Work schedule (day_of_week: 0=Sun, 1=Mon, ...):
${JSON.stringify(workSchedule, null, 2)}

Already scheduled slots:
${JSON.stringify(existingSlots, null, 2)}

Schedule all unscheduled/overdue tasks into available working hour slots.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "schedule_tasks",
              description: "Return task scheduling assignments",
              parameters: {
                type: "object",
                properties: {
                  assignments: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        task_id: { type: "string", description: "The task ID" },
                        due_date: { type: "string", description: "ISO datetime for the scheduled slot" },
                      },
                      required: ["task_id", "due_date"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["assignments"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "schedule_tasks" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI scheduling failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    
    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const args = typeof toolCall.function.arguments === 'string' 
        ? JSON.parse(toolCall.function.arguments) 
        : toolCall.function.arguments;
      
      return new Response(JSON.stringify({ assignments: args.assignments || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ assignments: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("smart-reschedule error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
