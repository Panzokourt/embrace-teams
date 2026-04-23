// embed-backfill · processes all unembedded items for the caller's company.
// Admin only. Returns counts.
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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

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

    // Resolve company
    const { data: roleRow } = await supa
      .from("user_company_roles")
      .select("company_id, role")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "no company" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const companyId = roleRow.company_id as string;
    if (!["owner", "super_admin", "admin"].includes(roleRow.role)) {
      return new Response(JSON.stringify({ error: "admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Optional action filter: 'all' (default), 'graph', 'wiki'
    const url = new URL(req.url);
    const reqBody = await req.json().catch(() => ({}));
    const action: string = reqBody.action || url.searchParams.get("action") || "all";

    let articleChunks = 0;
    let sources = 0;
    let memories = 0;
    let graphNodes = 0;
    const errors: string[] = [];

    const doWiki = action === "all" || action === "wiki";
    const doGraph = action === "all" || action === "graph";

    if (!doWiki && !doGraph) {
      return new Response(JSON.stringify({ error: `unknown action: ${action}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!doWiki) {
      // Skip wiki/sources/memories sections entirely
    }

    if (doWiki) {
      // ── Articles: re-embed any with no existing chunks ──
      const { data: articles } = await supa
        .from("kb_articles")
        .select("id, title, body, company_id")
        .eq("company_id", companyId)
        .neq("status", "deprecated")
        .limit(500);

      for (const art of articles || []) {
        const { count } = await supa
          .from("kb_article_chunks")
          .select("id", { count: "exact", head: true })
          .eq("article_id", art.id);
        if ((count ?? 0) > 0) continue;

        const fullText = `${art.title}\n\n${art.body || ""}`;
        const pieces = chunkText(fullText, 500, 50);
        for (const piece of pieces) {
          try {
            const vec = await embedText(piece.content, {
              functionName: "embed-backfill",
              companyId,
              userId,
            });
            await supa.from("kb_article_chunks").insert({
              article_id: art.id,
              company_id: companyId,
              chunk_index: piece.index,
              content: piece.content,
              tokens: piece.tokens,
              embedding: vecLiteral(vec) as any,
            });
            articleChunks++;
          } catch (e) {
            errors.push(`article ${art.id}: ${(e as Error).message}`);
          }
        }
      }

      // ── Raw sources without embedding ──
      const { data: srcs } = await supa
        .from("kb_raw_sources")
        .select("id, title, content, company_id")
        .eq("company_id", companyId)
        .is("embedded_at", null)
        .limit(500);

      for (const src of srcs || []) {
        try {
          const text = `${src.title}\n\n${src.content || ""}`.slice(0, 8000);
          const vec = await embedText(text, {
            functionName: "embed-backfill",
            companyId,
            userId,
          });
          await supa
            .from("kb_raw_sources")
            .update({ embedding: vecLiteral(vec) as any, embedded_at: new Date().toISOString() })
            .eq("id", src.id);
          sources++;
        } catch (e) {
          errors.push(`source ${src.id}: ${(e as Error).message}`);
        }
      }

      // ── Memories without embedding ──
      const { data: mems } = await supa
        .from("secretary_memory")
        .select("id, key, content")
        .eq("user_id", userId)
        .is("embedded_at", null)
        .limit(1000);

      for (const m of mems || []) {
        try {
          const text = `${m.key}: ${m.content}`.slice(0, 8000);
          const vec = await embedText(text, {
            functionName: "embed-backfill",
            userId,
          });
          await supa
            .from("secretary_memory")
            .update({ embedding: vecLiteral(vec) as any, embedded_at: new Date().toISOString() })
            .eq("id", m.id);
          memories++;
        } catch (e) {
          errors.push(`memory ${m.id}: ${(e as Error).message}`);
        }
      }
    }

    if (doGraph) {
      // ── Graph nodes without embedding (canonical text = label + key properties) ──
      const { data: gnodes } = await supa
        .from("graph_nodes")
        .select("id, node_type, label, properties")
        .eq("company_id", companyId)
        .is("embedding", null)
        .limit(2000);

      for (const n of gnodes || []) {
        try {
          const props = (n as any).properties || {};
          const propPairs = Object.entries(props)
            .filter(([k, v]) =>
              v != null && typeof v !== "object" && k !== "id" && String(v).length < 200
            )
            .slice(0, 6)
            .map(([k, v]) => `${k}: ${v}`)
            .join(" · ");
          const canonical = `[${n.node_type}] ${n.label || ""}${propPairs ? "\n" + propPairs : ""}`.slice(0, 4000);
          const vec = await embedText(canonical, {
            functionName: "embed-backfill",
            companyId,
            userId,
          });
          await supa
            .from("graph_nodes")
            .update({ embedding: vecLiteral(vec) as any })
            .eq("id", n.id);
          graphNodes++;
        } catch (e) {
          errors.push(`graph ${n.id}: ${(e as Error).message}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        action,
        article_chunks: articleChunks,
        sources,
        memories,
        graph_nodes: graphNodes,
        errors: errors.slice(0, 10),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("embed-backfill error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
