import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Validate authentication first
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid authentication token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let contextInfo = "";

    if (userId) {
      // Fetch user's tasks and projects for context
      const [tasksRes, projectsRes, profileRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("id, title, status, priority, due_date, start_date, project_id, project:projects(name)")
          .eq("assigned_to", userId)
          .neq("status", "completed")
          .order("due_date", { ascending: true })
          .limit(30),
        supabase
          .from("project_user_access")
          .select("project:projects(id, name, status, progress)")
          .eq("user_id", userId),
        supabase
          .from("profiles")
          .select("full_name, email, job_title, department")
          .eq("id", userId)
          .single(),
      ]);

      const tasks = tasksRes.data || [];
      const projects = (projectsRes.data || []).map((p: any) => p.project).filter(Boolean);
      const profile = profileRes.data;

      contextInfo = `
## Πληροφορίες χρήστη
- Όνομα: ${profile?.full_name || "Άγνωστο"}
- Email: ${profile?.email || "N/A"}
- Θέση: ${profile?.job_title || "N/A"}
- Τμήμα: ${profile?.department || "N/A"}

## Ενεργά Tasks (${tasks.length})
${tasks.map((t: any) => `- [${t.status}] ${t.title} (Priority: ${t.priority}, Due: ${t.due_date || "N/A"}, Project: ${t.project?.name || "N/A"})`).join("\n")}

## Ενεργά Projects (${projects.length})
${projects.map((p: any) => `- ${p.name} (Status: ${p.status}, Progress: ${p.progress || 0}%)`).join("\n")}

Σημερινή ημερομηνία: ${new Date().toISOString().split("T")[0]}
`;
    }

    const systemPrompt = `Είσαι ο AI βοηθός εργασίας του χρήστη σε ένα σύστημα διαχείρισης έργων (project management). 
Μιλάς ελληνικά εκτός αν σε ρωτήσουν αγγλικά.
Βοηθάς τον χρήστη να:
- Βρει πληροφορίες για τα tasks και τα projects του
- Οργανώσει τη δουλειά του
- Δώσει συνόψεις και αναφορές
- Προτείνει ενέργειες βάσει προτεραιότητας

Κράτα τις απαντήσεις σύντομες και πρακτικές. Χρησιμοποίησε markdown.

${contextInfo}`;

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
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Πολλά αιτήματα, δοκίμασε ξανά σε λίγο." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Απαιτείται πληρωμή για AI λειτουργίες." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
