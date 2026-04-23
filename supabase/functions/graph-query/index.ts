// graph-query · Phase 5 GraphRAG endpoint
// Actions:
//   - neighbors          { entity: { type, id } | { node_id }, hops?, relation_types?, limit? }
//   - subgraph_for_query { query, max_hops?, anchor_count?, node_types? }
//   - find_related       { entity, target_types?, hops?, limit? }
//
// All responses include `nodes` and `edges` arrays for easy client rendering.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";
import { embedText } from "../_shared/ai-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function vecLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

async function resolveNodeId(
  supa: any,
  companyId: string,
  entity: any
): Promise<string | null> {
  if (!entity) return null;
  if (entity.node_id) return entity.node_id as string;
  if (entity.type && entity.id) {
    const { data } = await supa
      .from("graph_nodes")
      .select("id")
      .eq("company_id", companyId)
      .eq("node_type", entity.type)
      .eq("entity_id", entity.id)
      .maybeSingle();
    return data?.id ?? null;
  }
  return null;
}

async function fetchEdgesAmong(
  supa: any,
  companyId: string,
  nodeIds: string[]
): Promise<any[]> {
  if (nodeIds.length === 0) return [];
  const { data } = await supa
    .from("graph_edges")
    .select("source_node_id,target_node_id,relation_type,weight")
    .eq("company_id", companyId)
    .in("source_node_id", nodeIds)
    .in("target_node_id", nodeIds);
  return data || [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
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
      .select("company_id")
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

    const body = await req.json().catch(() => ({}));
    const action: string = body.action || "neighbors";

    // ── neighbors ─────────────────────────────────────────────
    if (action === "neighbors") {
      const nodeId = await resolveNodeId(supa, companyId, body.entity);
      if (!nodeId) {
        return new Response(JSON.stringify({ error: "entity not found in graph" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const hops = Math.min(Math.max(body.hops ?? 1, 1), 3);
      const relationTypes: string[] | null = Array.isArray(body.relation_types) && body.relation_types.length > 0
        ? body.relation_types
        : null;
      const limit = Math.min(body.limit ?? 50, 200);

      const { data: neighbors, error } = await supa.rpc("graph_neighbors", {
        _node_id: nodeId,
        _hops: hops,
        _relation_types: relationTypes,
        _max_results: limit,
      });
      if (error) throw error;

      const allNodeIds = [nodeId, ...((neighbors || []).map((n: any) => n.node_id))];
      const { data: rootNode } = await supa
        .from("graph_nodes")
        .select("id,node_type,entity_id,label,properties")
        .eq("id", nodeId)
        .maybeSingle();
      const edges = await fetchEdgesAmong(supa, companyId, allNodeIds);

      return new Response(
        JSON.stringify({
          ok: true,
          root: rootNode,
          nodes: [rootNode, ...(neighbors || []).map((n: any) => ({
            id: n.node_id, node_type: n.node_type, entity_id: n.entity_id,
            label: n.label, properties: n.properties, distance: n.distance,
            via_relation: n.via_relation,
          }))].filter(Boolean),
          edges,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── subgraph_for_query (hybrid GraphRAG) ──────────────────
    if (action === "subgraph_for_query") {
      const query: string = body.query || "";
      if (!query.trim()) {
        return new Response(JSON.stringify({ error: "query required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const maxHops = Math.min(Math.max(body.max_hops ?? 2, 1), 3);
      const anchorCount = Math.min(Math.max(body.anchor_count ?? 5, 1), 20);

      const queryVec = await embedText(query, {
        functionName: "graph-query",
        companyId,
        userId,
      });

      const { data: subgraph, error } = await supa.rpc("graph_subgraph_for_query", {
        query_embedding: vecLiteral(queryVec) as any,
        _company_id: companyId,
        _max_hops: maxHops,
        _anchor_count: anchorCount,
      });
      if (error) throw error;

      const nodeIds: string[] = Array.from(new Set((subgraph || []).map((r: any) => r.node_id)));
      let nodes: any[] = [];
      if (nodeIds.length > 0) {
        const { data: nrows } = await supa
          .from("graph_nodes")
          .select("id,node_type,entity_id,label,properties")
          .in("id", nodeIds);
        const meta = new Map<string, any>((subgraph || []).map((r: any) => [r.node_id, r]));
        nodes = (nrows || []).map((n: any) => ({
          ...n,
          distance: meta.get(n.id)?.distance ?? 0,
          score: meta.get(n.id)?.score ?? 0,
          anchor_id: meta.get(n.id)?.anchor_id,
        }));
      }
      const edges = await fetchEdgesAmong(supa, companyId, nodeIds);

      return new Response(
        JSON.stringify({ ok: true, query, nodes, edges }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── find_related (filtered neighbors by target type) ──────
    if (action === "find_related") {
      const nodeId = await resolveNodeId(supa, companyId, body.entity);
      if (!nodeId) {
        return new Response(JSON.stringify({ error: "entity not found in graph" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const hops = Math.min(Math.max(body.hops ?? 2, 1), 3);
      const limit = Math.min(body.limit ?? 30, 100);
      const targetTypes: string[] | null = Array.isArray(body.target_types) && body.target_types.length > 0
        ? body.target_types
        : null;

      const { data: neighbors, error } = await supa.rpc("graph_neighbors", {
        _node_id: nodeId,
        _hops: hops,
        _relation_types: null,
        _max_results: 200,
      });
      if (error) throw error;
      const filtered = (neighbors || [])
        .filter((n: any) => !targetTypes || targetTypes.includes(n.node_type))
        .slice(0, limit);

      return new Response(
        JSON.stringify({
          ok: true,
          nodes: filtered.map((n: any) => ({
            id: n.node_id, node_type: n.node_type, entity_id: n.entity_id,
            label: n.label, properties: n.properties, distance: n.distance,
            via_relation: n.via_relation,
          })),
          edges: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: `unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("graph-query error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
