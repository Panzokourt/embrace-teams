import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";
import { callAI, callAIStream, embedText } from "../_shared/ai-router.ts";

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
    const userId = claimsData.claims.sub as string;

    const { action, sourceId, question, companyId } = await req.json();

    if (!companyId) {
      return new Response(JSON.stringify({ error: "companyId required" }), { status: 400, headers: corsHeaders });
    }

    // ─── COMPILE ───
    if (action === "compile") {
      if (!sourceId) {
        return new Response(JSON.stringify({ error: "sourceId required" }), { status: 400, headers: corsHeaders });
      }

      const { data: source } = await supabase
        .from("kb_raw_sources")
        .select("*")
        .eq("id", sourceId)
        .single();

      if (!source) {
        return new Response(JSON.stringify({ error: "Source not found" }), { status: 404, headers: corsHeaders });
      }

      // Get existing articles for context
      const { data: existingArticles } = await supabase
        .from("kb_articles")
        .select("id, title, body, tags")
        .eq("company_id", companyId)
        .neq("status", "deprecated");

      const existingSummary = (existingArticles || [])
        .map((a: any) => `- "${a.title}" (id: ${a.id}) — ${a.body?.substring(0, 150)}...`)
        .join("\n");

      const compilePrompt = `You are a Knowledge Base compiler. You receive a raw source and the current state of a wiki.

EXISTING WIKI PAGES:
${existingSummary || "(empty wiki)"}

NEW SOURCE to compile:
Title: ${source.title}
Type: ${source.source_type}
Content:
${source.content}

Your job:
1. Analyze the source and decide which wiki pages to CREATE or UPDATE
2. Identify cross-references between pages using [[page-title]] syntax
3. Return structured output using the provided tool

Rules:
- Each page should be focused on ONE topic
- Use markdown formatting with headers
- Add [[Page Title]] links where relevant concepts are mentioned
- Merge information into existing pages when appropriate
- Keep pages concise but comprehensive
- Write in the same language as the source content`;

      let compileResult;
      try {
        compileResult = await callAI({
          task_type: "deep_analysis",
          functionName: "kb-compiler",
          companyId,
          userId,
          messages: [{ role: "user", content: compilePrompt }],
          tools: [
            {
              type: "function",
              function: {
                name: "compile_wiki",
                description: "Create or update wiki pages from source material",
                parameters: {
                  type: "object",
                  properties: {
                    pages: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          action: { type: "string", enum: ["create", "update"] },
                          existing_id: { type: "string", description: "ID of existing article to update (only for update action)" },
                          title: { type: "string" },
                          body: { type: "string", description: "Full markdown content with [[links]]" },
                          tags: { type: "array", items: { type: "string" } },
                        },
                        required: ["action", "title", "body"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["pages"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "compile_wiki" } },
        });
      } catch (e) {
        const msg = (e as Error).message;
        const status = msg.includes("rate limit") ? 429 : msg.includes("credits") ? 402 : 500;
        return new Response(JSON.stringify({ error: msg }), { status, headers: corsHeaders });
      }

      const toolCall = compileResult.tool_calls?.[0];
      if (!toolCall) {
        return new Response(JSON.stringify({ error: "No tool call in response" }), { status: 500, headers: corsHeaders });
      }

      const { pages } = JSON.parse(toolCall.function.arguments);
      const createdIds: string[] = [];

      for (const page of pages) {
        if (page.action === "update" && page.existing_id) {
          await supabase
            .from("kb_articles")
            .update({ body: page.body, tags: page.tags || [] })
            .eq("id", page.existing_id);
          createdIds.push(page.existing_id);
        } else {
          const { data: newArticle } = await supabase
            .from("kb_articles")
            .insert({
              company_id: companyId,
              title: page.title,
              body: page.body,
              tags: page.tags || [],
              article_type: "wiki",
              status: "draft",
              visibility: "internal",
              owner_id: userId,
              source_links: source.url ? [source.url] : [],
            })
            .select("id")
            .single();
          if (newArticle) createdIds.push(newArticle.id);
        }
      }

      // Parse [[links]] and create kb_article_links
      const { data: allArticles } = await supabase
        .from("kb_articles")
        .select("id, title")
        .eq("company_id", companyId);

      const titleMap = new Map((allArticles || []).map((a: any) => [a.title.toLowerCase(), a.id]));

      for (const page of pages) {
        const fromId = page.action === "update" ? page.existing_id : createdIds.find(id => id);
        if (!fromId) continue;
        const linkMatches = page.body.matchAll(/\[\[(.*?)\]\]/g);
        for (const match of linkMatches) {
          const targetTitle = match[1].toLowerCase();
          const targetId = titleMap.get(targetTitle);
          if (targetId && targetId !== fromId) {
            await supabase.from("kb_article_links").upsert(
              { from_article_id: fromId, to_article_id: targetId, company_id: companyId },
              { onConflict: "from_article_id,to_article_id" }
            );
          }
        }
      }

      // Mark source as compiled
      await supabase
        .from("kb_raw_sources")
        .update({ compiled: true, compiled_at: new Date().toISOString() })
        .eq("id", sourceId);

      // ── Phase 1: auto-embed created/updated articles ──
      // We rebuild chunks here directly (service role) so this is atomic with compile.
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
      const { chunkText: chunk } = await import("../_shared/ai-router.ts");
      for (const articleId of createdIds) {
        try {
          const { data: art } = await svc
            .from("kb_articles")
            .select("id, title, body, company_id")
            .eq("id", articleId)
            .single();
          if (!art) continue;
          await svc.from("kb_article_chunks").delete().eq("article_id", art.id);
          const pieces = chunk(`${art.title}\n\n${art.body || ""}`, 500, 50);
          for (const p of pieces) {
            const v = await embedText(p.content, {
              functionName: "kb-compiler",
              companyId: art.company_id,
              userId,
            });
            await svc.from("kb_article_chunks").insert({
              article_id: art.id,
              company_id: art.company_id,
              chunk_index: p.index,
              content: p.content,
              tokens: p.tokens,
              embedding: vecLiteral(v) as any,
            });
          }
        } catch (e) {
          console.warn(`auto-embed failed for ${articleId}:`, (e as Error).message);
        }
      }

      return new Response(
        JSON.stringify({ success: true, pages_processed: pages.length, article_ids: createdIds }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── ASK ───
    if (action === "ask") {
      if (!question) {
        return new Response(JSON.stringify({ error: "question required" }), { status: 400, headers: corsHeaders });
      }

      // ── Phase 1: hybrid semantic retrieval ──
      // 1) Embed the question
      // 2) Try semantic match against kb_article_chunks
      // 3) Fallback to ALL articles if too few semantic hits (FTS-like behavior)
      let contextChunks: { article_id: string; content: string; similarity?: number }[] = [];
      try {
        const qVec = await embedText(question, {
          functionName: "kb-compiler",
          companyId,
          userId,
        });
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
        const { data: matches } = await svc.rpc("match_kb_chunks", {
          query_embedding: vecLiteral(qVec) as any,
          _company_id: companyId,
          match_count: 8,
          similarity_threshold: 0.4,
        });
        if (matches && matches.length > 0) {
          contextChunks = matches.map((m: any) => ({
            article_id: m.article_id,
            content: m.content,
            similarity: m.similarity,
          }));
        }
      } catch (e) {
        console.warn("semantic retrieval failed, will use full wiki:", (e as Error).message);
      }

      let wikiContext = "";
      let usedSemantic = contextChunks.length > 0;
      if (usedSemantic) {
        // Resolve article titles for the matched chunks
        const articleIds = Array.from(new Set(contextChunks.map((c) => c.article_id)));
        const { data: articleTitles } = await supabase
          .from("kb_articles")
          .select("id, title")
          .in("id", articleIds);
        const titleById = new Map((articleTitles || []).map((a: any) => [a.id, a.title]));
        wikiContext = contextChunks
          .map(
            (c) =>
              `## ${titleById.get(c.article_id) || "Untitled"} (relevance: ${(c.similarity || 0).toFixed(2)})\n${c.content}\n---`
          )
          .join("\n\n");
      } else {
        // Fallback: dump all wiki content (legacy behavior)
        const { data: wikiArticles } = await supabase
          .from("kb_articles")
          .select("id, title, body, tags")
          .eq("company_id", companyId)
          .neq("status", "deprecated");
        wikiContext = (wikiArticles || [])
          .map((a: any) => `## ${a.title}\n${a.body}\n---`)
          .join("\n\n");
      }

      const askPrompt = `You are a helpful wiki assistant. Answer the user's question based ONLY on the wiki content below. Cite specific pages using [Page Title] format. If the wiki doesn't contain relevant information, say so clearly.

WIKI CONTENT (${usedSemantic ? "semantic matches" : "full wiki"}):
${wikiContext || "(wiki is empty)"}

USER QUESTION: ${question}`;

      let askResponse: Response;
      try {
        askResponse = await callAIStream({
          // Summarization-class task → flash by default; big cost win vs pro.
          task_type: "summarization",
          functionName: "kb-compiler",
          companyId,
          userId,
          messages: [{ role: "user", content: askPrompt }],
        });
      } catch (e) {
        const msg = (e as Error).message;
        const status = msg.includes("rate limit") ? 429 : msg.includes("credits") ? 402 : 500;
        return new Response(JSON.stringify({ error: msg }), { status, headers: corsHeaders });
      }

      if (!askResponse.ok) {
        const status = askResponse.status;
        await askResponse.text();
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: corsHeaders });
        if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: corsHeaders });
        return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: corsHeaders });
      }

      return new Response(askResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // ─── HEALTH ───
    if (action === "health") {
      const { data: wikiArticles } = await supabase
        .from("kb_articles")
        .select("id, title, body, tags")
        .eq("company_id", companyId)
        .neq("status", "deprecated");

      const { data: links } = await supabase
        .from("kb_article_links")
        .select("from_article_id, to_article_id")
        .eq("company_id", companyId);

      const linkedIds = new Set([
        ...(links || []).map((l: any) => l.from_article_id),
        ...(links || []).map((l: any) => l.to_article_id),
      ]);
      const orphans = (wikiArticles || []).filter((a: any) => !linkedIds.has(a.id));

      const wikiSummary = (wikiArticles || [])
        .map((a: any) => `"${a.title}" (${a.body?.length || 0} chars, tags: ${(a.tags || []).join(", ")})`)
        .join("\n");

      const healthPrompt = `You are a wiki quality auditor. Analyze the following wiki and identify issues.

WIKI PAGES:
${wikiSummary}

ORPHAN PAGES (no links to/from): ${orphans.map((a: any) => a.title).join(", ") || "none"}

Analyze for:
1. Contradictions between pages
2. Missing concepts that should have their own page
3. Pages that are too short or incomplete
4. Suggested improvements`;

      const healthResponse = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [{ role: "user", content: healthPrompt }],
          tools: [
            {
              type: "function",
              function: {
                name: "wiki_health_report",
                description: "Return a structured health report for the wiki",
                parameters: {
                  type: "object",
                  properties: {
                    contradictions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          page1: { type: "string" },
                          page2: { type: "string" },
                          description: { type: "string" },
                        },
                        required: ["page1", "page2", "description"],
                        additionalProperties: false,
                      },
                    },
                    orphan_pages: { type: "array", items: { type: "string" } },
                    missing_concepts: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          reason: { type: "string" },
                        },
                        required: ["title", "reason"],
                        additionalProperties: false,
                      },
                    },
                    improvements: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          page: { type: "string" },
                          suggestion: { type: "string" },
                        },
                        required: ["page", "suggestion"],
                        additionalProperties: false,
                      },
                    },
                    overall_score: { type: "number", description: "0-100 health score" },
                  },
                  required: ["contradictions", "orphan_pages", "missing_concepts", "improvements", "overall_score"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "wiki_health_report" } },
        }),
      });

      if (!healthResponse.ok) {
        const status = healthResponse.status;
        await healthResponse.text();
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: corsHeaders });
        if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: corsHeaders });
        return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: corsHeaders });
      }

      const healthResult = await healthResponse.json();
      const healthToolCall = healthResult.choices?.[0]?.message?.tool_calls?.[0];
      if (!healthToolCall) {
        return new Response(JSON.stringify({ error: "No tool call in response" }), { status: 500, headers: corsHeaders });
      }

      const report = JSON.parse(healthToolCall.function.arguments);
      return new Response(JSON.stringify(report), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });
  } catch (e) {
    console.error("kb-compiler error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
