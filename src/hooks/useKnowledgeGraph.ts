import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GraphNode {
  id: string;
  node_type: string;
  entity_id: string;
  label: string;
  properties?: Record<string, any>;
  distance?: number;
  score?: number;
  via_relation?: string;
}
export interface GraphEdge {
  source_node_id: string;
  target_node_id: string;
  relation_type: string;
  weight?: number;
}
export interface GraphResponse {
  ok: boolean;
  root?: GraphNode | null;
  nodes: GraphNode[];
  edges: GraphEdge[];
  query?: string;
}

async function callGraph(body: any): Promise<GraphResponse> {
  const { data, error } = await supabase.functions.invoke("graph-query", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as GraphResponse;
}

export function useEntityNeighbors(
  entity: { type: string; id: string } | null,
  options?: { hops?: number; relation_types?: string[]; limit?: number; enabled?: boolean }
) {
  return useQuery({
    queryKey: ["graph", "neighbors", entity, options?.hops, options?.relation_types, options?.limit],
    queryFn: () =>
      callGraph({
        action: "neighbors",
        entity,
        hops: options?.hops,
        relation_types: options?.relation_types,
        limit: options?.limit,
      }),
    enabled: !!entity && (options?.enabled ?? true),
    staleTime: 60_000,
  });
}

export function useGraphSearch() {
  return useMutation({
    mutationFn: (vars: { query: string; max_hops?: number; anchor_count?: number }) =>
      callGraph({ action: "subgraph_for_query", ...vars }),
  });
}

export function useFindRelated(
  entity: { type: string; id: string } | null,
  targetTypes: string[],
  options?: { hops?: number; limit?: number; enabled?: boolean }
) {
  return useQuery({
    queryKey: ["graph", "find_related", entity, targetTypes, options?.hops, options?.limit],
    queryFn: () =>
      callGraph({
        action: "find_related",
        entity,
        target_types: targetTypes,
        hops: options?.hops,
        limit: options?.limit,
      }),
    enabled: !!entity && targetTypes.length > 0 && (options?.enabled ?? true),
    staleTime: 60_000,
  });
}

export const NODE_TYPE_LABELS: Record<string, string> = {
  client: "Πελάτης",
  project: "Έργο",
  task: "Task",
  contact: "Επαφή",
  invoice: "Τιμολόγιο",
  campaign: "Καμπάνια",
  kb_article: "Άρθρο",
  media_plan: "Media Plan",
  service: "Υπηρεσία",
  expense: "Έξοδο",
};

export const NODE_TYPE_COLORS: Record<string, string> = {
  client: "hsl(var(--primary))",
  project: "hsl(var(--accent))",
  task: "hsl(217, 91%, 60%)",
  contact: "hsl(150, 60%, 45%)",
  invoice: "hsl(24, 90%, 55%)",
  campaign: "hsl(280, 70%, 60%)",
  kb_article: "hsl(48, 95%, 55%)",
  media_plan: "hsl(195, 80%, 50%)",
  service: "hsl(330, 70%, 55%)",
  expense: "hsl(0, 70%, 55%)",
};

export function nodeRouteFor(node: GraphNode): string | null {
  switch (node.node_type) {
    case "client": return `/clients/${node.entity_id}`;
    case "project": return `/projects/${node.entity_id}`;
    case "task": return `/tasks/${node.entity_id}`;
    case "contact": return `/contacts/${node.entity_id}`;
    case "kb_article": return `/knowledge/articles/${node.entity_id}`;
    case "campaign": return `/campaigns`;
    case "media_plan": return `/media-planning/workspace/${node.entity_id}`;
    case "invoice": return `/financials?tab=invoices`;
    case "expense": return `/financials?tab=expenses`;
    case "service": return `/financials/services/${node.entity_id}`;
    default: return null;
  }
}
