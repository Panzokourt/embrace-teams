import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    const { fileContents, planContext } = await req.json();

    if (!fileContents || !Array.isArray(fileContents) || fileContents.length === 0) {
      return new Response(JSON.stringify({ error: "No file contents provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const combinedContent = fileContents
      .map((f: { name: string; content: string }) => `=== File: ${f.name} ===\n${f.content}`)
      .join("\n\n");

    const truncated = combinedContent.slice(0, 100000);

    const systemPrompt = `You are a media planning data extraction expert. Analyze the uploaded spreadsheet data and extract structured media plan items.

Return ONLY valid JSON in this format:
{
  "items": [
    {
      "title": "action title / campaign name",
      "medium": "channel name (e.g. Meta Ads, Google Search, Instagram Ads, Newsletter, OOH, TV, Radio, etc.)",
      "placement": "specific placement if mentioned",
      "objective": "one of: Brand Awareness, Reach, Traffic, Engagement, Lead Generation, Conversions, Sales, App Installs, Video Views, Store Visits, Catalog Sales, Messages",
      "funnel_stage": "one of: Awareness, Consideration, Conversion, Retention, Advocacy",
      "start_date": "YYYY-MM-DD or null",
      "end_date": "YYYY-MM-DD or null",
      "budget": <number or null>,
      "status": "draft",
      "priority": "medium",
      "kpi_target": "KPI description if mentioned",
      "notes": "any additional context"
    }
  ]
}

Rules:
- Extract ALL distinct media actions/line items from the data
- Normalize channel/medium names to standard digital marketing terms
- Parse dates into YYYY-MM-DD format (handle dd/MM/yyyy, MM/dd/yyyy, etc.)
- Parse budget amounts (handle €, $, comma separators, etc.)
- If data is ambiguous, make reasonable inferences
- Combine duplicate rows intelligently
- Set status to "draft" for all items`;

    const userPrompt = `Extract media plan items from this spreadsheet data:

${planContext ? `Context: ${planContext}\n\n` : ''}${truncated}`;

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
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.content?.[0]?.text;
    if (!content) throw new Error("No content in AI response");

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) result = JSON.parse(jsonMatch[0]);
      else throw new Error("No JSON found");
    } catch {
      throw new Error("Failed to parse AI response");
    }

    console.log("Extracted", result.items?.length || 0, "items from Excel");

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in analyze-media-plan-excel:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
