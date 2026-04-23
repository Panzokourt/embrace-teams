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

    const {
      title, topic, articleType = "article", tone = "professional",
      length = "medium", categoryId, companyId,
    } = await req.json();

    if (!companyId || !topic) {
      return new Response(JSON.stringify({ error: "companyId & topic required" }), { status: 400, headers: corsHeaders });
    }

    // Gather context: similar articles in same category, departments, services, clients
    const [{ data: catArticles }, { data: cat }, { data: company }] = await Promise.all([
      supabase.from("kb_articles")
        .select("title, body, tags")
        .eq("company_id", companyId)
        .eq("category_id", categoryId || "00000000-0000-0000-0000-000000000000")
        .neq("status", "deprecated")
        .limit(3),
      categoryId ? supabase.from("kb_categories").select("name, source_type, source_id").eq("id", categoryId).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from("companies").select("name, industry").eq("id", companyId).maybeSingle(),
    ]);

    // Optional: related entity context based on category source
    let entityContext = "";
    if (cat?.source_type && cat?.source_id) {
      if (cat.source_type === "client") {
        const { data: c } = await supabase.from("clients").select("name, industry, notes").eq("id", cat.source_id).maybeSingle();
        if (c) entityContext = `Πελάτης: ${c.name} (${c.industry || "—"})\n${c.notes || ""}`;
      } else if (cat.source_type === "department") {
        const { data: d } = await supabase.from("departments").select("name, description").eq("id", cat.source_id).maybeSingle();
        if (d) entityContext = `Τμήμα: ${d.name}\n${d.description || ""}`;
      } else if (cat.source_type === "service") {
        const { data: s } = await supabase.from("services").select("name, description, category").eq("id", cat.source_id).maybeSingle();
        if (s) entityContext = `Υπηρεσία: ${s.name} (${s.category})\n${s.description || ""}`;
      }
    }

    const styleSamples = (catArticles || [])
      .map((a: any) => `### ${a.title}\n${(a.body || "").substring(0, 400)}`)
      .join("\n\n---\n\n");

    const lengthHints: Record<string, string> = {
      short: "300-500 λέξεις, σύντομο και περιεκτικό",
      medium: "600-1000 λέξεις, πλήρες αλλά ευανάγνωστο",
      long: "1200-2000 λέξεις, εις βάθος ανάλυση",
    };

    const typeHints: Record<string, string> = {
      sop: "Standard Operating Procedure με αριθμημένα βήματα, prerequisites, και ευθύνες",
      guide: "Πρακτικός οδηγός με sections, παραδείγματα, και tips",
      policy: "Επίσημη πολιτική με σκοπό, εφαρμογή, υπευθυνότητες, και κυρώσεις",
      checklist: "Λίστα ελέγχου με checkboxes ομαδοποιημένα ανά φάση",
      article: "Δομημένο ενημερωτικό άρθρο",
      meeting_note: "Σημειώσεις σύσκεψης με attendees, αποφάσεις, action items",
    };

    const systemPrompt = `Είσαι senior knowledge base writer για την εταιρεία "${company?.name || ""}" ${company?.industry ? `(κλάδος: ${company.industry})` : ""}.
Γράφεις σε καθαρά Ελληνικά, σε Markdown.
Tone: ${tone}.
Μήκος: ${lengthHints[length] || lengthHints.medium}.
Τύπος: ${typeHints[articleType] || typeHints.article}.
${entityContext ? `\nContext από την εταιρεία:\n${entityContext}` : ""}
${styleSamples ? `\nΠαραδείγματα ύφους από υπάρχοντα άρθρα:\n${styleSamples}` : ""}

ΟΔΗΓΙΕΣ:
- Ξεκίνα με H1 τίτλο
- Χρησιμοποίησε σωστή ιεραρχία (H2/H3)
- Πρόσθεσε bullet points / αριθμημένες λίστες όπου χρειάζεται
- Στο τέλος πρόσθεσε section "## Tags" με 3-6 σχετικά tags σε μορφή \`tag1, tag2, tag3\``;

    const userPrompt = `Τίτλος: ${title || topic}\n\nΘέμα/Brief:\n${topic}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Payment required, add credits to your workspace" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("kb-ai-compose error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
