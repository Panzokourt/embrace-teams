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

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

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

    const toolInputSchema = {
      type: "object" as const,
      properties: {
        package_name: { type: "string" as const, description: "Όνομα πακέτου" },
        description: { type: "string" as const, description: "Σύντομη περιγραφή πακέτου" },
        list_price: { type: "number" as const, description: "Προτεινόμενη τιμή πακέτου σε EUR" },
        discount_percent: { type: "number" as const, description: "Ποσοστό έκπτωσης (0-50)" },
        duration_type: { type: "string" as const, enum: ["monthly", "quarterly", "semi_annual", "annual", "fixed_days", "custom_months"] },
        duration_value: { type: "number" as const, description: "Τιμή διάρκειας" },
        items: {
          type: "array" as const,
          items: {
            type: "object" as const,
            properties: {
              service_id: { type: "string" as const },
              quantity: { type: "number" as const },
              duration_months: { type: "number" as const },
              rationale: { type: "string" as const },
            },
            required: ["service_id", "quantity", "duration_months", "rationale"],
          },
        },
      },
      required: ["package_name", "description", "list_price", "discount_percent", "duration_type", "duration_value", "items"],
    };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
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
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            name: "suggest_package",
            description: "Return a structured package suggestion with selected services, pricing and discount.",
            input_schema: toolInputSchema,
          },
        ],
        tool_choice: { type: "tool", name: "suggest_package" },
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
      console.error("Anthropic API error:", response.status, t);
      throw new Error("AI API error");
    }

    const data = await response.json();
    const toolUse = data.content?.find((c: any) => c.type === "tool_use");
    
    if (!toolUse?.input) {
      throw new Error("No structured response from AI");
    }

    const suggestion = toolUse.input;

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
