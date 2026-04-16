import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ISO_DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function jsDayToIsoDay(day: number): number {
  return day === 0 ? 6 : day - 1;
}

function parseTimeToMinutes(time: string | undefined, fallback: string): number {
  const [fallbackHours, fallbackMinutes] = fallback.split(":").map((value) => Number.parseInt(value, 10));
  const [hours, minutes] = (time || fallback).split(":").map((value) => Number.parseInt(value, 10));

  return (Number.isFinite(hours) ? hours : fallbackHours) * 60 + (Number.isFinite(minutes) ? minutes : fallbackMinutes);
}

function parseLocalDateTime(dateStr: string): Date | null {
  const parts = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (parts) {
    const [, year, month, day, hours = "0", minutes = "0", seconds = "0"] = parts;
    return new Date(
      Number.parseInt(year, 10),
      Number.parseInt(month, 10) - 1,
      Number.parseInt(day, 10),
      Number.parseInt(hours, 10),
      Number.parseInt(minutes, 10),
      Number.parseInt(seconds, 10),
    );
  }

  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

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
    const effectiveWorkSchedule = Array.isArray(workSchedule) && workSchedule.length > 0
      ? workSchedule
      : [0, 1, 2, 3, 4].map((day_of_week) => ({
          day_of_week,
          start_time: "09:00",
          end_time: "17:00",
          is_working_day: true,
        }));

    // work_schedules uses ISO indexing: 0=Mon ... 6=Sun
    const workingDays = effectiveWorkSchedule
      .filter((ws: any) => ws.is_working_day)
      .map((ws: any) => ws.day_of_week);
    const workingDayNames = workingDays.map((d: number) => `${ISO_DAY_NAMES[d]} (${d})`).join(', ');
    const nonWorkingDays = [0,1,2,3,4,5,6].filter((d: number) => !workingDays.includes(d));
    const nonWorkingDayNames = nonWorkingDays.map((d: number) => ISO_DAY_NAMES[d]).join(', ');

    if (workingDays.length === 0) {
      return new Response(JSON.stringify({ assignments: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
- NEVER modify or return estimated_hours — use them only for calculating scheduling duration, but do NOT include them in the response

Use the schedule_tasks tool to return your assignments.`;

    const userPrompt = `Tasks to schedule:
${JSON.stringify(tasks, null, 2)}

Work schedule (day_of_week: 0=Mon, 1=Tue, ... 6=Sun):
${JSON.stringify(effectiveWorkSchedule, null, 2)}

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
      
      const effectiveScheduleMap = new Map(
        effectiveWorkSchedule.map((ws: any) => [
          ws.day_of_week,
          {
            isWorkingDay: ws.is_working_day !== false,
            startMinutes: parseTimeToMinutes(ws.start_time, "09:00"),
            endMinutes: parseTimeToMinutes(ws.end_time, "17:00"),
          },
        ])
      );

      const validAssignments = (args.assignments || []).filter((a: any) => {
        const localDate = parseLocalDateTime(a.due_date);
        if (!localDate) return false;

        const isoDow = jsDayToIsoDay(localDate.getDay());
        const schedule = effectiveScheduleMap.get(isoDow);
        if (!schedule?.isWorkingDay) return false;

        const assignmentMinutes = localDate.getHours() * 60 + localDate.getMinutes();
        return assignmentMinutes >= schedule.startMinutes && assignmentMinutes < schedule.endMinutes;
      });
      
      if (validAssignments.length < (args.assignments || []).length) {
        console.warn(`Filtered out ${(args.assignments || []).length - validAssignments.length} assignments outside the user's working schedule`);
      }

      return new Response(JSON.stringify({ assignments: validAssignments }), {
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
