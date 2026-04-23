// embed-content · creates/updates embeddings for a single resource.
// Body: { kind: 'kb_article' | 'kb_source' | 'memory', id: string }
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";
import { embedText, chunkText } from "../_shared/ai-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function vecLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { kind, id } = await req.json();
    if (!kind || !id) {
      return new Response(JSON.stringify({ error: "kind and id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth client (verify caller)
    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData } = await authClient.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const supa = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    if (kind === "kb_article") {
      const { data: art, error } = await supa
        .from("kb_articles")
        .select("id, title, body, company_id, updated_at")
        .eq("id", id)
        .single();
      if (error || !art) throw new Error("article not found");

      // Wipe existing chunks for this article
      await supa.from("kb_article_chunks").delete().eq("article_id", art.id);

      const fullText = `${art.title}\n\n${art.body || ""}`;
      const pieces = chunkText(fullText, 500, 50);
      let embeddedCount = 0;

      for (const piece of pieces) {
        const vec = await embedText(piece.content, {
          functionName: "embed-content",
          companyId: art.company_id,
          userId,
        });
        const { error: insErr } = await supa.from("kb_article_chunks").insert({
          article_id: art.id,
          company_id: art.company_id,
          chunk_index: piece.index,
          content: piece.content,
          tokens: piece.tokens,
          embedding: vecLiteral(vec) as any,
        });
        if (insErr) {
          console.error("chunk insert error:", insErr);
        } else {
          embeddedCount++;
        }
      }
      return new Response(JSON.stringify({ ok: true, kind, id, chunks: embeddedCount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (kind === "kb_source") {
      const { data: src, error } = await supa
        .from("kb_raw_sources")
        .select("id, title, content, company_id")
        .eq("id", id)
        .single();
      if (error || !src) throw new Error("source not found");
      const text = `${src.title}\n\n${src.content || ""}`.slice(0, 8000);
      const vec = await embedText(text, {
        functionName: "embed-content",
        companyId: src.company_id,
        userId,
      });
      await supa
        .from("kb_raw_sources")
        .update({ embedding: vecLiteral(vec) as any, embedded_at: new Date().toISOString() })
        .eq("id", src.id);
      return new Response(JSON.stringify({ ok: true, kind, id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (kind === "memory") {
      const { data: mem, error } = await supa
        .from("secretary_memory")
        .select("id, key, content, user_id")
        .eq("id", id)
        .single();
      if (error || !mem) throw new Error("memory not found");
      const text = `${mem.key}: ${mem.content}`.slice(0, 8000);
      const vec = await embedText(text, {
        functionName: "embed-content",
        userId: mem.user_id,
      });
      await supa
        .from("secretary_memory")
        .update({ embedding: vecLiteral(vec) as any, embedded_at: new Date().toISOString() })
        .eq("id", mem.id);
      return new Response(JSON.stringify({ ok: true, kind, id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unknown kind" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("embed-content error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
