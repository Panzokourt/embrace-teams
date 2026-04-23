import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { pickModel, logAICall } from "../_shared/ai-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth client to get user
    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role client for queries
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { message_id } = await req.json();
    if (!message_id) {
      return new Response(JSON.stringify({ error: "message_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the email message
    const { data: email, error: emailError } = await supabase
      .from("email_messages")
      .select("*")
      .eq("id", message_id)
      .eq("user_id", user.id)
      .single();

    if (emailError || !email) {
      return new Response(JSON.stringify({ error: "Email not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's company
    const { data: companyRole } = await supabase
      .from("user_company_roles")
      .select("company_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .single();

    if (!companyRole) {
      return new Response(JSON.stringify({ error: "No company found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const companyId = companyRole.company_id;

    // Fetch clients for matching
    const { data: clients } = await supabase
      .from("clients")
      .select("id, name, contact_email, website")
      .eq("company_id", companyId);

    // Fetch project templates
    const { data: templates } = await supabase
      .from("project_templates")
      .select("id, name, description, project_type")
      .eq("company_id", companyId);

    const emailBody = email.body_text || email.body_html || "";
    const emailSubject = email.subject || "";
    const senderEmail = email.from_address || "";
    const senderName = email.from_name || "";

    const systemPrompt = `You are an expert project manager for a creative/digital agency. 
You analyze incoming emails that are project briefs and extract structured project data.

Available clients in the system:
${JSON.stringify((clients || []).map((c: any) => ({ id: c.id, name: c.name, email: c.contact_email, website: c.website })), null, 2)}

Available project templates:
${JSON.stringify((templates || []).map((t: any) => ({ id: t.id, name: t.name, type: t.project_type })), null, 2)}

Rules:
- Match the sender to an existing client by name or email domain. If no match, set matched_client_id to null and suggest a client_name.
- Extract a clear project name from the brief.
- Extract budget if mentioned (as number, no currency symbols).
- Extract deadline if mentioned (ISO date format).
- Determine priority: low, medium, high, urgent.
- Break down deliverables/tasks mentioned in the brief.
- If a template matches the project type, include its id.`;

    const userPrompt = `Analyze this email brief:

From: ${senderName} <${senderEmail}>
Subject: ${emailSubject}

Body:
${emailBody.substring(0, 4000)}`;

    // Call Lovable AI Gateway with tool calling for structured output
    const MODEL = pickModel("simple_extraction");
    const start = Date.now();
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_project_brief",
              description: "Extract structured project data from an email brief",
              parameters: {
                type: "object",
                properties: {
                  project_name: { type: "string", description: "Clear project name" },
                  description: { type: "string", description: "Project description summary" },
                  matched_client_id: { type: "string", description: "UUID of matched client, or null" },
                  suggested_client_name: { type: "string", description: "Client name if no match found" },
                  budget: { type: "number", description: "Budget amount if mentioned" },
                  deadline: { type: "string", description: "Deadline in ISO date format if mentioned" },
                  priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                  matched_template_id: { type: "string", description: "UUID of matching template, or null" },
                  tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                      },
                      required: ["title"],
                    },
                  },
                },
                required: ["project_name", "description", "priority", "tasks"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_project_brief" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI error:", status, await aiResponse.text());
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI returned no structured data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: any;
    try {
      parsed = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update email as parsed
    await supabase
      .from("email_messages")
      .update({ is_brief_candidate: true, brief_parsed_at: new Date().toISOString() })
      .eq("id", message_id);

    return new Response(
      JSON.stringify({
        success: true,
        draft: {
          ...parsed,
          company_id: companyId,
          source_email_id: message_id,
          source_thread_id: email.thread_id,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("email-to-project error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
