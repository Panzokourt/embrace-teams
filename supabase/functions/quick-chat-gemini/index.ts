import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Είσαι ο AI βοηθός μιας εταιρείας. Απαντάς σε ελληνικά εκτός αν ο χρήστης γράψει σε άλλη γλώσσα.
Μπορείς να αναλύσεις έγγραφα, εικόνες και αρχεία που σου στέλνει ο χρήστης.
Δίνεις αναλυτικές, χρήσιμες και δομημένες απαντήσεις.
Χρησιμοποιείς markdown formatting (headers, bullets, bold) για ευανάγνωστες απαντήσεις.

ΣΗΜΑΝΤΙΚΟ: Μετά από κάθε ανάλυση αρχείου, παρέθεσε ένα σύντομο "📝 Σύνοψη για μνήμη:" section στο τέλος της απάντησης με τα key findings σε 2-3 bullet points. Αυτό βοηθά το σύστημα να αποθηκεύσει τα ευρήματα.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { messages, current_page, model: requestedModel } = await req.json();
    const isClaude = typeof requestedModel === "string" && requestedModel.startsWith("claude-");

    // Fetch user company and memories in parallel
    const [companyRoleRes, memoriesRes] = await Promise.all([
      supabase.from("user_company_roles").select("company_id").eq("user_id", userId).limit(1).single(),
      supabase
        .from("secretary_memory")
        .select("category, key, content")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(10),
    ]);

    const companyId = companyRoleRes.data?.company_id || "";
    const userMemories = memoriesRes.data || [];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!isClaude && !LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }
    if (isClaude && !ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    // Convert messages to OpenAI-compatible format
    const convertedMessages = (messages || []).map((msg: any) => {
      if (typeof msg.content === "string") {
        return { role: msg.role, content: msg.content };
      }
      if (Array.isArray(msg.content)) {
        const parts = msg.content.map((part: any) => {
          if (part.type === "text") {
            return { type: "text", text: part.text };
          }
          if (part.type === "image") {
            const dataUri = `data:${part.source.media_type};base64,${part.source.data}`;
            return {
              type: "image_url",
              image_url: { url: dataUri },
            };
          }
          return part;
        });
        return { role: msg.role, content: parts };
      }
      return msg;
    });

    // Build system content with memory context
    let systemContent = SYSTEM_PROMPT;
    if (current_page) {
      systemContent += `\n\nΟ χρήστης βρίσκεται στη σελίδα: ${current_page}`;
    }
    if (userMemories.length > 0) {
      systemContent += `\n\nΑποθηκευμένη Μνήμη (${userMemories.length} εγγραφές):\n${userMemories.map((m: any) => `- [${m.category}] ${m.key}: ${m.content.length > 200 ? m.content.slice(0, 200) + "..." : m.content}`).join("\n")}`;
    }

    let response: Response;

    if (isClaude) {
      // ── Claude via Anthropic API ──
      const anthropicMessages = convertedMessages
        .filter((m: any) => m.role !== "system")
        .map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));

      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: requestedModel,
          max_tokens: 8192,
          system: systemContent,
          messages: anthropicMessages,
          stream: true,
        }),
      });
    } else {
      // ── Lovable AI Gateway ──
      const gatewayModel = requestedModel || "google/gemini-2.5-pro";
      response = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: gatewayModel,
            messages: [
              { role: "system", content: systemContent },
              ...convertedMessages,
            ],
            stream: true,
          }),
        }
      );
    }

    const response_ref = response;

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("Gemini gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Transform OpenAI SSE stream to our custom SSE format
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = "";
        let fullReply = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6).trim();
              if (jsonStr === "[DONE]") {
                // Auto-save memory from Gemini response if it contains file analysis
                if (fullReply.length > 100 && companyId) {
                  try {
                    // Extract a summary key from the reply
                    const summaryMatch = fullReply.match(/📝 Σύνοψη για μνήμη:([\s\S]*?)(?:$|:::)/);
                    if (summaryMatch) {
                      await supabase.from("secretary_memory").insert({
                        user_id: userId,
                        company_id: companyId,
                        category: "file_analysis",
                        key: `gemini_analysis_${Date.now()}`,
                        content: summaryMatch[1].trim().slice(0, 2000),
                        metadata: { source: "quick-chat-gemini", page: current_page },
                      });
                    }
                  } catch (memErr) {
                    console.error("Memory save error:", memErr);
                  }
                }

                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "done", reply: fullReply })}\n\n`)
                );
                continue;
              }

              try {
                const parsed = JSON.parse(jsonStr);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullReply += content;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "delta", content })}\n\n`)
                  );
                }
              } catch {
                // skip malformed JSON
              }
            }
          }

          // Process remaining buffer
          if (buffer.trim()) {
            for (const line of buffer.split("\n")) {
              if (!line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6).trim();
              if (jsonStr === "[DONE]") {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "done", reply: fullReply })}\n\n`)
                );
                continue;
              }
              try {
                const parsed = JSON.parse(jsonStr);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullReply += content;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "delta", content })}\n\n`)
                  );
                }
              } catch {}
            }
          }
        } catch (err) {
          console.error("Stream processing error:", err);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", text: "Stream error" })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("quick-chat-gemini error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
