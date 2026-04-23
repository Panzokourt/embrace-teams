import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Network, ArrowRight, Loader2 } from "lucide-react";
import { useEntityNeighbors, NODE_TYPE_LABELS, nodeRouteFor, type GraphNode } from "@/hooks/useKnowledgeGraph";
import { Link } from "react-router-dom";

interface Props {
  entityType: string;
  entityId: string;
  hops?: number;
  limit?: number;
  title?: string;
}

export function RelatedEntitiesCard({ entityType, entityId, hops = 2, limit = 20, title }: Props) {
  const { data, isLoading, error } = useEntityNeighbors({ type: entityType, id: entityId }, { hops, limit });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Network className="h-4 w-4 text-primary" />
          {title || "Σχετιζόμενες οντότητες"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
            <Loader2 className="h-3 w-3 animate-spin" /> Φόρτωση γράφου...
          </div>
        )}
        {error && (
          <p className="text-xs text-destructive">Σφάλμα φόρτωσης γράφου.</p>
        )}
        {!isLoading && !error && (data?.nodes?.length ?? 0) <= 1 && (
          <p className="text-xs text-muted-foreground py-2">Δεν βρέθηκαν σχετιζόμενες οντότητες ακόμη.</p>
        )}
        {!isLoading && data?.nodes
          ?.filter((n: GraphNode) => n.id !== data.root?.id)
          .slice(0, limit)
          .map((n) => {
            const route = nodeRouteFor(n);
            const inner = (
              <div className="flex items-center justify-between gap-2 py-1.5 px-2 rounded hover:bg-muted/50 group">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Badge variant="outline" className="text-[10px] uppercase shrink-0">
                    {NODE_TYPE_LABELS[n.node_type] || n.node_type}
                  </Badge>
                  <span className="text-sm truncate">{n.label}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  {n.distance && <span>· {n.distance} hop</span>}
                  {route && <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100" />}
                </div>
              </div>
            );
            return route ? (
              <Link key={n.id} to={route}>{inner}</Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })}
      </CardContent>
    </Card>
  );
}
