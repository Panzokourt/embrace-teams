import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { companyId } = await req.json();
    if (!companyId) return new Response(JSON.stringify({ error: "companyId required" }), { status: 400, headers: corsHeaders });

    // Gather signal: existing articles, recent sources, projects, briefs, brain insights
    const [
      { data: articles },
      { data: sources },
      { data: projects },
      { data: briefs },
      { data: insights },
      { data: clients },
    ] = await Promise.all([
      supabase.from("kb_articles").select("title, tags").eq("company_id", companyId).neq("status", "deprecated").limit(100),
      supabase.from("kb_raw_sources").select("title, source_type, content").eq("company_id", companyId).order("created_at", { ascending: false }).limit(20),
      supabase.from("projects").select("name, description, status").eq("company_id", companyId).order("created_at", { ascending: false }).limit(15),
      supabase.from("briefs").select("title, brief_type").eq("company_id", companyId).order("created_at", { ascending: false }).limit(15),
      supabase.from("brain_insights").select("title, insight_type, summary").eq("company_id", companyId).order("created_at", { ascending: false }).limit(10),
      supabase.from("clients").select("name, industry").eq("company_id", companyId).limit(20),
    ]);

    const existingTitles = (articles || []).map((a: any) => `- ${a.title} [${(a.tags || []).join(", ")}]`).join("\n");
    const recentSources = (sources || []).map((s: any) => `- ${s.title} (${s.source_type})`).join("\n");
    const recentProjects = (projects || []).map((p: any) => `- ${p.name} (${p.status})${p.description ? ": " + p.description.substring(0, 100) : ""}`).join("\n");
    const recentBriefs = (briefs || []).map((b: any) => `- ${b.title} [${b.brief_type}]`).join("\n");
    const recentInsights = (insights || []).map((i: any) => `- [${i.insight_type}] ${i.title}: ${(i.summary || "").substring(0, 120)}`).join("\n");
    const clientList = (clients || []).map((c: any) => `- ${c.name}${c.industry ? " (" + c.industry + ")" : ""}`).join("\n");

    const prompt = `Είσαι knowledge base curator. Ανάλυσε τα δεδομένα της εταιρείας και πρότεινε 3-7 χρήσιμα νέα άρθρα γνώσης που λείπουν.

ΥΠΑΡΧΟΝΤΑ ΑΡΘΡΑ:
${existingTitles || "(κανένα)"}

ΠΡΟΣΦΑΤΕΣ ΠΗΓΕΣ (uncompiled):
${recentSources || "(καμία)"}

ΠΡΟΣΦΑΤΑ ΕΡΓΑ:
${recentProjects || "(κανένα)"}

ΠΡΟΣΦΑΤΑ BRIEFS:
${recentBriefs || "(κανένα)"}

ΠΡΟΣΦΑΤΕΣ ΠΑΡΑΤΗΡΗΣΕΙΣ AI:
${recentInsights || "(καμία)"}

ΠΕΛΑΤΕΣ:
${clientList || "(κανένας)"}

Επιστρέφεις ΜΟΝΟ JSON object με τη μορφή:
{
  "suggestions": [
    {
      "title": "Σύντομος τίτλος προτεινόμενου άρθρου",
      "type": "sop|guide|policy|checklist|article",
      "reasoning": "1-2 πρότασεις γιατί λείπει αυτό το άρθρο",
      "topic_brief": "3-5 προτάσεις brief για το AI compose"
    }
  ]
}

ΚΑΝΟΝΕΣ:
- Μην προτείνεις άρθρα που υπάρχουν ήδη
- Δώσε προτεραιότητα σε gaps που εμφανίζονται σε πολλαπλές πηγές/projects
- Σκέψου SOPs, policies, troubleshooting guides, onboarding checklists
- Στα Ελληνικά`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        tools: [{
          type: "function",
          function: {
            name: "suggest_articles",
            description: "Επιστρέφει προτεινόμενα νέα άρθρα γνώσης",
            parameters: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      type: { type: "string", enum: ["sop", "guide", "policy", "checklist", "article"] },
                      reasoning: { type: "string" },
                      topic_brief: { type: "string" },
                    },
                    required: ["title", "type", "reasoning", "topic_brief"],
                  },
                },
              },
              required: ["suggestions"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "suggest_articles" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments;
    const parsed = args ? JSON.parse(args) : { suggestions: [] };

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("kb-suggest-articles error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
