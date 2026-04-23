import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Network, ArrowRight } from "lucide-react";
import { useGraphSearch, NODE_TYPE_LABELS, NODE_TYPE_COLORS, nodeRouteFor, type GraphNode } from "@/hooks/useKnowledgeGraph";
import { Link } from "react-router-dom";

const ALL_TYPES = Object.keys(NODE_TYPE_LABELS);

export function GraphExplorer() {
  const [query, setQuery] = useState("");
  const [hops, setHops] = useState("2");
  const [filterType, setFilterType] = useState<string>("__all__");
  const search = useGraphSearch();

  const onSearch = () => {
    if (!query.trim()) return;
    search.mutate({ query: query.trim(), max_hops: parseInt(hops), anchor_count: 6 });
  };

  const nodes = (search.data?.nodes || [])
    .filter((n) => filterType === "__all__" || n.node_type === filterType)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // Group by node_type for a clean clustered view
  const grouped: Record<string, GraphNode[]> = {};
  for (const n of nodes) {
    (grouped[n.node_type] ||= []).push(n);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex-1 relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSearch()}
                placeholder="Π.χ. πελάτες retail με ληγμένα τιμολόγια"
                className="pl-9"
              />
            </div>
            <Select value={hops} onValueChange={setHops}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 hop</SelectItem>
                <SelectItem value="2">2 hops</SelectItem>
                <SelectItem value="3">3 hops</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Όλοι οι τύποι</SelectItem>
                {ALL_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{NODE_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={onSearch} disabled={search.isPending || !query.trim()} className="gap-2">
              {search.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Network className="h-4 w-4" />}
              Εξερεύνηση
            </Button>
          </div>
          {search.error && (
            <p className="text-xs text-destructive">{(search.error as Error).message}</p>
          )}
          {search.data && (
            <div className="text-xs text-muted-foreground">
              Βρέθηκαν {search.data.nodes?.length ?? 0} κόμβοι · {search.data.edges?.length ?? 0} σχέσεις
            </div>
          )}
        </CardContent>
      </Card>

      {nodes.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(grouped).map(([type, list]) => (
            <Card key={type} className="overflow-hidden">
              <div
                className="h-1"
                style={{ background: NODE_TYPE_COLORS[type] || "hsl(var(--primary))" }}
              />
              <CardContent className="p-3 space-y-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">{NODE_TYPE_LABELS[type] || type}</span>
                  <Badge variant="secondary">{list.length}</Badge>
                </div>
                {list.slice(0, 12).map((n) => {
                  const route = nodeRouteFor(n);
                  const body = (
                    <div className="flex items-center justify-between gap-2 py-1.5 px-2 rounded hover:bg-muted/60 group text-sm">
                      <span className="truncate">{n.label}</span>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                        {typeof n.score === "number" && n.score > 0 && (
                          <span className="tabular-nums">{n.score.toFixed(2)}</span>
                        )}
                        {n.distance != null && <span>· {n.distance}h</span>}
                        {route && <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100" />}
                      </div>
                    </div>
                  );
                  return route ? (
                    <Link key={n.id} to={route}>{body}</Link>
                  ) : (
                    <div key={n.id}>{body}</div>
                  );
                })}
                {list.length > 12 && (
                  <p className="text-[11px] text-muted-foreground pt-1 px-2">+ {list.length - 12} ακόμη</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!search.isPending && !search.data && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            <Network className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Πληκτρολόγησε ένα ερώτημα για να εξερευνήσεις τον γράφο γνώσης.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
