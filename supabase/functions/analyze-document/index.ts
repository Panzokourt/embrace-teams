import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DOCUMENT_TYPE_PROMPTS: Record<string, string> = {
  contract: `Αναλύεις ένα συμβόλαιο/σύμβαση. Εξήγαγε:
- parties: Τα συμβαλλόμενα μέρη (array of {name, role})
- start_date: Ημερομηνία έναρξης (ISO format ή null)
- end_date: Ημερομηνία λήξης (ISO format ή null)
- value: Συνολικό ποσό (number ή null)
- currency: Νόμισμα (π.χ. EUR)
- payment_terms: Όροι πληρωμής
- obligations: Κύριες υποχρεώσεις κάθε μέρους (array of strings)
- termination_conditions: Όροι λύσης (array of strings)
- special_clauses: Ειδικοί όροι (array of strings)
- summary: Περίληψη 2-3 προτάσεις`,
  brief: `Αναλύεις ένα brief. Εξήγαγε:
- objectives: Στόχοι (array of strings)
- target_audience: Κοινό-στόχος
- kpis: KPIs (array of strings)
- budget: Προϋπολογισμός (number ή null)
- timeline: Χρονοδιάγραμμα
- deliverables: Παραδοτέα (array of strings)
- tone_of_voice: Τόνος επικοινωνίας
- constraints: Περιορισμοί (array of strings)
- summary: Περίληψη 2-3 προτάσεις`,
  proposal: `Αναλύεις μία πρόταση/προσφορά. Εξήγαγε:
- services: Υπηρεσίες (array of {name, description, cost})
- total_cost: Συνολικό κόστος (number ή null)
- currency: Νόμισμα
- deliverables: Παραδοτέα (array of strings)
- timeline: Χρονοδιάγραμμα
- terms: Όροι (array of strings)
- validity_period: Περίοδος ισχύος
- summary: Περίληψη 2-3 προτάσεις`,
  invoice: `Αναλύεις ένα τιμολόγιο/παραστατικό. Εξήγαγε:
- invoice_number: Αριθμός τιμολογίου
- issuer: Εκδότης
- recipient: Παραλήπτης
- items: Στοιχεία (array of {description, quantity, unit_price, total})
- subtotal: Υποσύνολο
- vat: ΦΠΑ
- total: Σύνολο
- currency: Νόμισμα
- issue_date: Ημερομηνία έκδοσης
- due_date: Ημερομηνία πληρωμής
- summary: Περίληψη`,
  other: `Αναλύεις ένα γενικό έγγραφο. Εξήγαγε:
- title: Τίτλος εγγράφου
- entities: Αναφερόμενα πρόσωπα/εταιρείες (array of strings)
- dates: Σημαντικές ημερομηνίες (array of {date, context})
- amounts: Ποσά (array of {amount, currency, context})
- key_points: Κύρια σημεία (array of strings)
- action_items: Ενέργειες που απαιτούνται (array of strings)
- summary: Περίληψη 2-3 προτάσεις`,
};

function buildToolProperties(docType: string): Record<string, any> {
  const toolProperties: Record<string, any> = {
    summary: { type: "string", description: "Περίληψη εγγράφου" },
  };
  if (docType === "contract") {
    Object.assign(toolProperties, {
      parties: { type: "array", items: { type: "object", properties: { name: { type: "string" }, role: { type: "string" } } } },
      start_date: { type: ["string", "null"] },
      end_date: { type: ["string", "null"] },
      value: { type: ["number", "null"] },
      currency: { type: ["string", "null"] },
      payment_terms: { type: ["string", "null"] },
      obligations: { type: "array", items: { type: "string" } },
      termination_conditions: { type: "array", items: { type: "string" } },
      special_clauses: { type: "array", items: { type: "string" } },
    });
  } else if (docType === "brief") {
    Object.assign(toolProperties, {
      objectives: { type: "array", items: { type: "string" } },
      target_audience: { type: ["string", "null"] },
      kpis: { type: "array", items: { type: "string" } },
      budget: { type: ["number", "null"] },
      timeline: { type: ["string", "null"] },
      deliverables: { type: "array", items: { type: "string" } },
      tone_of_voice: { type: ["string", "null"] },
      constraints: { type: "array", items: { type: "string" } },
    });
  } else if (docType === "proposal") {
    Object.assign(toolProperties, {
      services: { type: "array", items: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, cost: { type: ["number", "null"] } } } },
      total_cost: { type: ["number", "null"] },
      currency: { type: ["string", "null"] },
      deliverables: { type: "array", items: { type: "string" } },
      timeline: { type: ["string", "null"] },
      terms: { type: "array", items: { type: "string" } },
      validity_period: { type: ["string", "null"] },
    });
  } else if (docType === "invoice") {
    Object.assign(toolProperties, {
      invoice_number: { type: ["string", "null"] },
      issuer: { type: ["string", "null"] },
      recipient: { type: ["string", "null"] },
      items: { type: "array", items: { type: "object", properties: { description: { type: "string" }, quantity: { type: ["number", "null"] }, unit_price: { type: ["number", "null"] }, total: { type: ["number", "null"] } } } },
      subtotal: { type: ["number", "null"] },
      vat: { type: ["number", "null"] },
      total: { type: ["number", "null"] },
      currency: { type: ["string", "null"] },
      issue_date: { type: ["string", "null"] },
      due_date: { type: ["string", "null"] },
    });
  } else {
    Object.assign(toolProperties, {
      title: { type: ["string", "null"] },
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { fileId, documentType, textContent, projectContext, userInstructions } = await req.json();

    if (!fileId || !textContent) {
      return new Response(JSON.stringify({ error: "fileId and textContent required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const docType = documentType || "other";
    const typePrompt = DOCUMENT_TYPE_PROMPTS[docType] || DOCUMENT_TYPE_PROMPTS.other;
    const toolProperties = buildToolProperties(docType);

    // Build enriched system prompt with project context
    let systemPrompt = `Είσαι ειδικός αναλυτής εγγράφων για agency/εταιρεία επικοινωνίας & marketing. 
Αναλύεις έγγραφα στα Ελληνικά ή Αγγλικά και εξάγεις δομημένες πληροφορίες.
Απάντησε ΜΟΝΟ με structured data μέσω tool calling. Μην προσθέσεις σχόλια εκτός tool call.
Αν κάποιο πεδίο δεν βρίσκεται στο έγγραφο, βάλε null.`;

    if (projectContext) {
      systemPrompt += `\n\n--- ΠΛΗΡΟΦΟΡΙΕΣ ΕΡΓΟΥ ---
Όνομα: ${projectContext.name || 'N/A'}
Περιγραφή: ${projectContext.description || 'N/A'}
Πελάτης: ${projectContext.clientName || 'N/A'}
Budget: ${projectContext.budget || 'N/A'}
Ημ. Έναρξης: ${projectContext.startDate || 'N/A'}
Ημ. Λήξης: ${projectContext.endDate || 'N/A'}
Λάβε υπόψη τα παραπάνω στοιχεία κατά την ανάλυση.`;
    }

    let userMessage = `${typePrompt}\n\n--- ΕΓΓΡΑΦΟ ---\n`;
    
    if (userInstructions) {
      userMessage = `ΟΔΗΓΙΕΣ ΧΡΗΣΤΗ: ${userInstructions}\n\n${userMessage}`;
    }

    // Truncate content to ~800KB for larger context support with Pro model
    const truncatedContent = textContent.substring(0, 800000);
    userMessage += truncatedContent;

    // Try with gemini-2.5-pro first, fallback to flash
    const models = ["google/gemini-2.5-pro", "google/gemini-2.5-flash"];
    let lastError = "";

    for (const model of models) {
      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "extract_document_data",
                  description: "Εξαγωγή δομημένων δεδομένων από το έγγραφο",
                  parameters: {
                    type: "object",
                    properties: toolProperties,
                    required: ["summary"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "extract_document_data" } },
          }),
        });

        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Υπερβολικά πολλά αιτήματα, δοκιμάστε ξανά αργότερα" }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (aiResponse.status === 402) {
          return new Response(JSON.stringify({ error: "Απαιτείται ανανέωση credits" }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          console.error(`AI error (${model}):`, aiResponse.status, errText);
          lastError = errText;
          continue; // Try next model
        }

        const aiData = await aiResponse.json();
        let extractedData: any = {};

        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          try {
            extractedData = JSON.parse(toolCall.function.arguments);
          } catch {
            extractedData = { summary: "Δεν ήταν δυνατή η ανάλυση", raw: toolCall.function.arguments };
          }
        }

        // Save analysis to file_attachments
        const { error: updateError } = await supabase
          .from("file_attachments")
          .update({ ai_analysis: extractedData, document_type: docType })
          .eq("id", fileId);

        if (updateError) {
          console.error("Update error:", updateError);
        }

        return new Response(JSON.stringify({ analysis: extractedData, document_type: docType, model_used: model }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (modelErr) {
        console.error(`Model ${model} failed:`, modelErr);
        lastError = modelErr instanceof Error ? modelErr.message : String(modelErr);
        continue;
      }
    }

    // All models failed
    return new Response(JSON.stringify({ error: "AI analysis failed", details: lastError }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-document error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
