import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { formType, userInput, context } = await req.json();

    if (!formType || !userInput) {
      return new Response(JSON.stringify({ error: "Missing formType or userInput" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let toolDef: any;
    let systemPrompt: string;

    switch (formType) {
      case "project":
        systemPrompt = `You are an agency project manager assistant. Given a brief user description, extract structured project data. Use Greek for descriptions. Context: ${JSON.stringify(context || {})}`;
        toolDef = {
          name: "fill_project_form",
          description: "Fill project creation form fields",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string", description: "Project name" },
              description: { type: "string", description: "Project description in Greek" },
              budget: { type: "number", description: "Estimated budget in EUR" },
              status: { type: "string", enum: ["lead", "proposal", "active"] },
              tasks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    priority: { type: "string", enum: ["low", "medium", "high"] },
                  },
                  required: ["title", "priority"],
                },
                description: "Suggested tasks for the project",
              },
            },
            required: ["name", "description"],
          },
        };
        break;

      case "task":
        systemPrompt = `You are a task management assistant. Given a brief description, extract structured task data. Use Greek for descriptions. Context: ${JSON.stringify(context || {})}`;
        toolDef = {
          name: "fill_task_form",
          description: "Fill task creation form fields",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "Task title" },
              description: { type: "string", description: "Task description in Greek" },
              priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
              estimated_hours: { type: "number", description: "Estimated hours to complete" },
            },
            required: ["title", "description", "priority"],
          },
        };
        break;

      case "client":
        systemPrompt = `You are a CRM assistant. Given a website URL or brief description, extract structured client data. Use Greek where appropriate. Try to infer the industry/sector.`;
        toolDef = {
          name: "fill_client_form",
          description: "Fill client creation form fields",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string", description: "Company/client name" },
              sector: { type: "string", description: "Industry sector" },
              website: { type: "string", description: "Website URL" },
              contact_email: { type: "string", description: "Contact email if found" },
              notes: { type: "string", description: "Brief notes about the client in Greek" },
            },
            required: ["name"],
          },
        };
        break;

      case "invoice":
        systemPrompt = `You are a billing assistant. Given project context (budget, hours logged, existing invoices), suggest invoice details. Context: ${JSON.stringify(context || {})}`;
        toolDef = {
          name: "fill_invoice_form",
          description: "Fill invoice form fields",
          parameters: {
            type: "object",
            properties: {
              amount: { type: "number", description: "Suggested invoice amount in EUR" },
              description: { type: "string", description: "Invoice description in Greek" },
              reasoning: { type: "string", description: "Brief explanation of how the amount was calculated" },
            },
            required: ["amount", "description"],
          },
        };
        break;

      default:
        return new Response(JSON.stringify({ error: "Unknown formType" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

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
          { role: "user", content: userInput },
        ],
        tools: [{ type: "function", function: toolDef }],
        tool_choice: { type: "function", function: { name: toolDef.name } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI did not return structured data" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = typeof toolCall.function.arguments === "string"
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;

    return new Response(JSON.stringify({ data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-fill-form error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
