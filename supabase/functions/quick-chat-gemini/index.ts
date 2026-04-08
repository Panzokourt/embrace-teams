import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Είσαι ο AI βοηθός μιας εταιρείας. Απαντάς σε ελληνικά εκτός αν ο χρήστης γράψει σε άλλη γλώσσα.
Μπορείς να αναλύσεις έγγραφα, εικόνες και αρχεία που σου στέλνει ο χρήστης.
Δίνεις αναλυτικές, χρήσιμες και δομημένες απαντήσεις.
Χρησιμοποιείς markdown formatting (headers, bullets, bold) για ευανάγνωστες απαντήσεις.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages, current_page } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Convert messages to OpenAI-compatible format
    // Images need to be in the OpenAI vision format
    const convertedMessages = (messages || []).map((msg: any) => {
      if (typeof msg.content === "string") {
        return { role: msg.role, content: msg.content };
      }
      // Array content (multimodal) — convert to OpenAI format
      if (Array.isArray(msg.content)) {
        const parts = msg.content.map((part: any) => {
          if (part.type === "text") {
            return { type: "text", text: part.text };
          }
          if (part.type === "image") {
            // Convert from Anthropic format to OpenAI format
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

    const systemContent = current_page
      ? `${SYSTEM_PROMPT}\n\nΟ χρήστης βρίσκεται στη σελίδα: ${current_page}`
      : SYSTEM_PROMPT;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: systemContent },
            ...convertedMessages,
          ],
          stream: true,
        }),
      }
    );

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

    // Transform OpenAI SSE stream to our custom SSE format (type: delta/done)
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
