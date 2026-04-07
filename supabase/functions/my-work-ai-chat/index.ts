import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Transform Anthropic SSE stream to OpenAI-compatible SSE stream
function transformAnthropicStream(anthropicBody: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";

  return new ReadableStream({
    async start(controller) {
      const reader = anthropicBody.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const jsonStr = line.slice(6).trim();
              if (!jsonStr) continue;
              try {
                const event = JSON.parse(jsonStr);
                if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
                  const openaiChunk = {
                    choices: [{ delta: { content: event.delta.text } }],
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
                } else if (event.type === "message_stop") {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  controller.close();
                  return;
                }
              } catch {
                // skip unparseable lines
              }
            }
          }
        }
      } catch (e) {
        console.error("Stream transform error:", e);
        controller.close();
      }
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    let contextInfo = "";

    if (userId) {
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

    // Convert messages to Anthropic format (filter out system messages)
    const anthropicMessages = (messages || [])
      .filter((m: any) => m.role !== "system")
      .map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }));

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
        messages: anthropicMessages,
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
      console.error("Anthropic API error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Transform Anthropic SSE to OpenAI-compatible SSE
    const transformedStream = transformAnthropicStream(response.body!);

    return new Response(transformedStream, {
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
