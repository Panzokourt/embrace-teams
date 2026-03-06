import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth validation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { services, prompt } = await req.json();

    if (!services || !Array.isArray(services) || services.length === 0) {
      return new Response(JSON.stringify({ error: "No services provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const servicesSummary = services.map((s: any) => 
      `- ID: ${s.id} | ${s.name} | Κατηγορία: ${s.category} | Τιμή: €${s.list_price} | Κόστος: €${s.total_cost} | Margin: ${s.margin_pct?.toFixed(1)}%`
    ).join("\n");

    const systemPrompt = `Είσαι ειδικός σύμβουλος τιμολόγησης για agency επικοινωνίας/marketing. 
Αναλύεις τις διαθέσιμες υπηρεσίες και προτείνεις βέλτιστα πακέτα που:
- Συνδυάζουν συμπληρωματικές υπηρεσίες
- Μεγιστοποιούν την αξία για τον πελάτη
- Διατηρούν υγιές margin (>25%)
- Έχουν λογική τιμολόγηση με ελκυστική έκπτωση

Διαθέσιμες υπηρεσίες:
${servicesSummary}`;

    const userPrompt = prompt 
      ? `Ο χρήστης ζητάει: "${prompt}". Πρότεινε ένα πακέτο βάσει αυτής της περιγραφής.`
      : "Πρότεινε ένα βέλτιστο πακέτο υπηρεσιών βάσει των διαθέσιμων υπηρεσιών.";

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
              name: "suggest_package",
              description: "Return a structured package suggestion with selected services, pricing and discount.",
              parameters: {
                type: "object",
                properties: {
                  package_name: { type: "string", description: "Όνομα πακέτου (στα Ελληνικά ή Αγγλικά)" },
                  description: { type: "string", description: "Σύντομη περιγραφή πακέτου" },
                  list_price: { type: "number", description: "Προτεινόμενη τιμή πακέτου σε EUR" },
                  discount_percent: { type: "number", description: "Ποσοστό έκπτωσης (0-50)" },
                  duration_type: { type: "string", enum: ["monthly", "quarterly", "semi_annual", "annual", "fixed_days", "custom_months"], description: "Τύπος διάρκειας πακέτου" },
                  duration_value: { type: "number", description: "Τιμή διάρκειας (π.χ. 3 για μήνες, 60 για ημέρες)" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        service_id: { type: "string", description: "UUID της υπηρεσίας" },
                        quantity: { type: "number", description: "Ποσότητα (1-12)" },
                        duration_months: { type: "number", description: "Διάρκεια σε μήνες (1-24)" },
                        rationale: { type: "string", description: "Γιατί περιλαμβάνεται αυτή η υπηρεσία" },
                      },
                      required: ["service_id", "quantity", "duration_months", "rationale"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["package_name", "description", "list_price", "discount_percent", "duration_type", "duration_value", "items"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_package" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Δοκιμάστε ξανά σε λίγο." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Απαιτείται ανανέωση credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("No structured response from AI");
    }

    const suggestion = JSON.parse(toolCall.function.arguments);

    // Validate service_ids exist in provided services
    const serviceIds = new Set(services.map((s: any) => s.id));
    suggestion.items = suggestion.items.filter((item: any) => serviceIds.has(item.service_id));

    return new Response(JSON.stringify({ suggestion }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-package error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
