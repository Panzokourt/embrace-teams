// Edge function: enrich-company-from-domain
// Discovers basic company info from a domain (legal name, industry, size, logo)
// using Lovable AI with web-grounded reasoning. Rate-limited per user.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are a company-research assistant. Given a domain, infer the most likely:
- legal/display company name (no TLD)
- primary industry (one of: Technology, Marketing & Advertising, Finance, Legal, Education, Healthcare, Construction, Retail, Tourism, Media & Entertainment, Logistics, Consulting, Other)
- company size bucket: '1-10' | '11-50' | '51-200' | '200+'
- short one-sentence description in Greek

If you cannot infer with confidence, return null for the field. Never fabricate URLs.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { domain } = await req.json();
    if (!domain || typeof domain !== "string") {
      return new Response(JSON.stringify({ error: "domain required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth & rate-limit
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token ?? "");
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count } = await supabase
      .from("company_enrichment_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since);
    if ((count ?? 0) >= 10) {
      return new Response(JSON.stringify({ error: "Όριο 10 αναζητήσεων/24ώρου." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Domain: ${domain}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "set_company",
            description: "Return the inferred company info.",
            parameters: {
              type: "object",
              properties: {
                name: { type: ["string", "null"] },
                industry: { type: ["string", "null"] },
                company_size: { type: ["string", "null"], enum: ["1-10","11-50","51-200","200+", null] },
                description: { type: ["string", "null"] },
                logo_url: { type: ["string", "null"], description: "Likely public favicon/logo URL" },
              },
              required: ["name", "industry", "company_size", "description", "logo_url"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "set_company" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limited." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const tc = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    const result = tc?.function?.arguments ? JSON.parse(tc.function.arguments) : {};

    // Fallback logo: google favicon service (best-effort, no fabrication of arbitrary URLs)
    if (!result.logo_url) {
      result.logo_url = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
    }

    await supabase.from("company_enrichment_log").insert({
      user_id: userId, domain, result,
    });

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("enrich-company-from-domain error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
