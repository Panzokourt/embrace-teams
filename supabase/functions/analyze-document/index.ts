import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DOCUMENT_TYPE_PROMPTS: Record<string, string> = {
  contract: `Αναλύεις ένα συμβόλαιο/σύμβαση. Εξήγαγε:
- parties, start_date, end_date, value, currency, payment_terms, obligations, termination_conditions, special_clauses, summary`,
  brief: `Αναλύεις ένα brief. Εξήγαγε:
- objectives, target_audience, kpis, budget, timeline, deliverables, tone_of_voice, constraints, summary`,
  proposal: `Αναλύεις μία πρόταση/προσφορά. Εξήγαγε:
- services, total_cost, currency, deliverables, timeline, terms, validity_period, summary`,
  invoice: `Αναλύεις ένα τιμολόγιο/παραστατικό. Εξήγαγε:
- invoice_number, issuer, recipient, items, subtotal, vat, total, currency, issue_date, due_date, summary`,
  other: `Αναλύεις ένα γενικό έγγραφο. Εξήγαγε:
- title, entities, dates, amounts, key_points, action_items, summary`,
};

function buildToolProperties(docType: string): Record<string, any> {
  const toolProperties: Record<string, any> = {
    summary: { type: "string", description: "Περίληψη εγγράφου" },
  };
  if (docType === "contract") {
    Object.assign(toolProperties, {
      parties: { type: "array", items: { type: "object", properties: { name: { type: "string" }, role: { type: "string" } } } },
      start_date: { type: "string" }, end_date: { type: "string" },
      value: { type: "number" }, currency: { type: "string" },
      payment_terms: { type: "string" },
      obligations: { type: "array", items: { type: "string" } },
      termination_conditions: { type: "array", items: { type: "string" } },
      special_clauses: { type: "array", items: { type: "string" } },
    });
  } else if (docType === "brief") {
    Object.assign(toolProperties, {
      objectives: { type: "array", items: { type: "string" } },
      target_audience: { type: "string" }, kpis: { type: "array", items: { type: "string" } },
      budget: { type: "number" }, timeline: { type: "string" },
      deliverables: { type: "array", items: { type: "string" } },
      tone_of_voice: { type: "string" }, constraints: { type: "array", items: { type: "string" } },
    });
  } else if (docType === "proposal") {
    Object.assign(toolProperties, {
      services: { type: "array", items: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, cost: { type: "number" } } } },
      total_cost: { type: "number" }, currency: { type: "string" },
      deliverables: { type: "array", items: { type: "string" } },
      timeline: { type: "string" }, terms: { type: "array", items: { type: "string" } },
      validity_period: { type: "string" },
    });
  } else if (docType === "invoice") {
    Object.assign(toolProperties, {
      invoice_number: { type: "string" }, issuer: { type: "string" }, recipient: { type: "string" },
      items: { type: "array", items: { type: "object", properties: { description: { type: "string" }, quantity: { type: "number" }, unit_price: { type: "number" }, total: { type: "number" } } } },
      subtotal: { type: "number" }, vat: { type: "number" }, total: { type: "number" },
      currency: { type: "string" }, issue_date: { type: "string" }, due_date: { type: "string" },
    });
  } else {
    Object.assign(toolProperties, {
      title: { type: "string" },
      entities: { type: "array", items: { type: "string" } },
      dates: { type: "array", items: { type: "object", properties: { date: { type: "string" }, context: { type: "string" } } } },
      amounts: { type: "array", items: { type: "object", properties: { amount: { type: "number" }, currency: { type: "string" }, context: { type: "string" } } } },
      key_points: { type: "array", items: { type: "string" } },
      action_items: { type: "array", items: { type: "string" } },
    });
  }
  return toolProperties;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { fileId, documentType, textContent, projectContext, userInstructions } = await req.json();

    if (!fileId || !textContent) {
      return new Response(JSON.stringify({ error: "fileId and textContent required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const docType = documentType || "other";
    const typePrompt = DOCUMENT_TYPE_PROMPTS[docType] || DOCUMENT_TYPE_PROMPTS.other;
    const toolProperties = buildToolProperties(docType);

    let systemPrompt = `Είσαι ειδικός αναλυτής εγγράφων για agency/εταιρεία επικοινωνίας & marketing. 
Αναλύεις έγγραφα στα Ελληνικά ή Αγγλικά και εξάγεις δομημένες πληροφορίες.
Απάντησε ΜΟΝΟ με structured data μέσω tool calling. Μην προσθέσεις σχόλια εκτός tool call.
Αν κάποιο πεδίο δεν βρίσκεται στο έγγραφο, βάλε null.`;

    if (projectContext) {
      systemPrompt += `\n\n--- ΠΛΗΡΟΦΟΡΙΕΣ ΕΡΓΟΥ ---
Όνομα: ${projectContext.name || 'N/A'}
Περιγραφή: ${projectContext.description || 'N/A'}
Πελάτης: ${projectContext.clientName || 'N/A'}
Budget: ${projectContext.budget || 'N/A'}`;
    }

    let userMessage = `${typePrompt}\n\n--- ΕΓΓΡΑΦΟ ---\n`;
    if (userInstructions) {
      userMessage = `ΟΔΗΓΙΕΣ ΧΡΗΣΤΗ: ${userInstructions}\n\n${userMessage}`;
    }

    const truncatedContent = textContent.substring(0, 200000);
    userMessage += truncatedContent;

    try {
      const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: systemPrompt,
          messages: [
            { role: "user", content: userMessage },
          ],
          tools: [
            {
              name: "extract_document_data",
              description: "Εξαγωγή δομημένων δεδομένων από το έγγραφο",
              input_schema: {
                type: "object",
                properties: toolProperties,
                required: ["summary"],
              },
            },
          ],
          tool_choice: { type: "tool", name: "extract_document_data" },
        }),
      });

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Υπερβολικά πολλά αιτήματα, δοκιμάστε ξανά αργότερα" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Απαιτείται ανανέωση credits" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("Anthropic API error:", aiResponse.status, errText);
        throw new Error(`AI error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      let extractedData: any = {};

      const toolUse = aiData.content?.find((c: any) => c.type === "tool_use");
      if (toolUse?.input) {
        extractedData = toolUse.input;
      }

      const { error: updateError } = await supabase
        .from("file_attachments")
        .update({ ai_analysis: extractedData, document_type: docType })
        .eq("id", fileId);

      if (updateError) {
        console.error("Update error:", updateError);
      }

      return new Response(JSON.stringify({ analysis: extractedData, document_type: docType, model_used: "claude-sonnet-4-20250514" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (modelErr) {
      console.error("AI analysis failed:", modelErr);
      throw modelErr;
    }
  } catch (e) {
    console.error("analyze-document error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
