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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    const supabase = createClient(supabaseUrl, supabaseKey);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader?.replace("Bearer ", "");
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !user) throw new Error("Not authenticated");

    const { action, noteContent, noteTitle, companyId } = await req.json();

    if (!action || !noteContent || !companyId) {
      throw new Error("Missing required fields");
    }

    const systemPrompt = `You are a project management assistant. Extract structured data from the user's note to perform the requested action. Always respond using the tool provided.`;

    let toolDef: any;
    let userPrompt: string;

    switch (action) {
      case "create_task":
        userPrompt = `From this note, extract a task:\nTitle: ${noteTitle}\nContent: ${noteContent}`;
        toolDef = {
          name: "create_task",
          description: "Create a task from note content",
          input_schema: {
            type: "object",
            properties: {
              title: { type: "string", description: "Task title" },
              description: { type: "string", description: "Task description" },
              priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
              due_date: { type: "string", description: "Due date in YYYY-MM-DD format or null" },
            },
            required: ["title", "description", "priority"],
          },
        };
        break;

      case "create_deliverable":
        userPrompt = `From this note, extract a deliverable:\nTitle: ${noteTitle}\nContent: ${noteContent}`;
        toolDef = {
          name: "create_deliverable",
          description: "Create a deliverable from note content",
          input_schema: {
            type: "object",
            properties: {
              name: { type: "string", description: "Deliverable name" },
              description: { type: "string", description: "Description" },
              due_date: { type: "string", description: "Due date YYYY-MM-DD or null" },
            },
            required: ["name", "description"],
          },
        };
        break;

      case "create_meeting":
        userPrompt = `From this note, extract meeting details:\nTitle: ${noteTitle}\nContent: ${noteContent}`;
        toolDef = {
          name: "create_meeting",
          description: "Create a calendar event/meeting from note",
          input_schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              date: { type: "string", description: "Date YYYY-MM-DD" },
              start_time: { type: "string", description: "HH:MM format" },
              duration_minutes: { type: "number" },
            },
            required: ["title", "description"],
          },
        };
        break;

      case "link_project":
        const { data: projects } = await supabase
          .from("projects")
          .select("id, name")
          .eq("company_id", companyId)
          .limit(50);

        userPrompt = `Match this note to the most relevant project:\nTitle: ${noteTitle}\nContent: ${noteContent}\n\nAvailable projects: ${JSON.stringify(projects?.map(p => ({ id: p.id, name: p.name })))}`;
        toolDef = {
          name: "link_project",
          description: "Link note to a project",
          input_schema: {
            type: "object",
            properties: {
              project_id: { type: "string", description: "UUID of matching project" },
              confidence: { type: "string", enum: ["high", "medium", "low"] },
            },
            required: ["project_id", "confidence"],
          },
        };
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          { role: "user", content: userPrompt },
        ],
        tools: [toolDef],
        tool_choice: { type: "tool", name: toolDef.name },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolUse = aiData.content?.find((c: any) => c.type === "tool_use");
    if (!toolUse) throw new Error("AI did not return structured data");

    const parsed = toolUse.input;

    // Execute the action
    let entityId: string | null = null;
    let entityType: string | null = null;
    let message = "";

    switch (action) {
      case "create_task": {
        const { data: firstProject } = await supabase
          .from("projects")
          .select("id")
          .eq("company_id", companyId)
          .limit(1)
          .single();

        if (!firstProject) throw new Error("No project found");

        const { data: task, error } = await supabase
          .from("tasks")
          .insert({
            title: parsed.title,
            description: parsed.description,
            priority: parsed.priority || "medium",
            due_date: parsed.due_date || null,
            project_id: firstProject.id,
            assigned_to: user.id,
            status: "todo",
          })
          .select("id")
          .single();

        if (error) throw error;
        entityId = task.id;
        entityType = "task";
        message = `Task "${parsed.title}" δημιουργήθηκε!`;
        break;
      }

      case "create_meeting": {
        const meetingDate = parsed.date || new Date().toISOString().slice(0, 10);
        const startTime = parsed.start_time || "10:00";
        const duration = parsed.duration_minutes || 60;
        const startDt = new Date(`${meetingDate}T${startTime}:00`);
        const endDt = new Date(startDt.getTime() + duration * 60000);

        const { data: event, error } = await supabase
          .from("calendar_events")
          .insert({
            title: parsed.title,
            description: parsed.description,
            start_time: startDt.toISOString(),
            end_time: endDt.toISOString(),
            company_id: companyId,
            created_by: user.id,
            event_type: "meeting",
          })
          .select("id")
          .single();

        if (error) throw error;
        entityId = event.id;
        entityType = "meeting";
        message = `Meeting "${parsed.title}" δημιουργήθηκε!`;
        break;
      }

      case "link_project": {
        entityId = parsed.project_id;
        entityType = "project";
        message = `Συνδέθηκε με έργο (${parsed.confidence} confidence)`;
        break;
      }

      case "create_deliverable": {
        const { data: firstProj } = await supabase
          .from("projects")
          .select("id")
          .eq("company_id", companyId)
          .limit(1)
          .single();

        if (!firstProj) throw new Error("No project found");

        const { data: deliv, error } = await supabase
          .from("deliverables")
          .insert({
            name: parsed.name,
            description: parsed.description,
            due_date: parsed.due_date || null,
            project_id: firstProj.id,
          })
          .select("id")
          .single();

        if (error) throw error;
        entityId = deliv.id;
        entityType = "deliverable";
        message = `Παραδοτέο "${parsed.name}" δημιουργήθηκε!`;
        break;
      }
    }

    return new Response(
      JSON.stringify({ success: true, message, entityId, entityType }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("notes-ai-action error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
