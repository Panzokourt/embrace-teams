import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Sparkles, Loader2, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Action = "all" | "wiki" | "graph";

export function EmbeddingsBackfillButton() {
  const [loading, setLoading] = useState<Action | null>(null);

  const run = async (action: Action) => {
    setLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke("embed-backfill", {
        body: { action },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const parts: string[] = [];
      if (data.article_chunks) parts.push(`${data.article_chunks} chunks`);
      if (data.sources) parts.push(`${data.sources} πηγές`);
      if (data.memories) parts.push(`${data.memories} μνήμες`);
      if (data.graph_nodes) parts.push(`${data.graph_nodes} graph nodes`);
      toast.success(`Embeddings ολοκληρώθηκαν${parts.length ? ": " + parts.join(" · ") : ""}`);
      if (data.errors?.length) console.warn("Backfill partial errors:", data.errors);
    } catch (e: any) {
      toast.error(e.message || "Σφάλμα backfill");
    } finally {
      setLoading(null);
    }
  };

  const isLoading = loading !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={isLoading} variant="outline" size="sm" className="gap-2">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isLoading ? "Δημιουργία embeddings..." : "Επαναφόρτωση embeddings"}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Επιλογή πηγής</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => run("all")} disabled={isLoading}>
          Όλα (Wiki + Graph)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("wiki")} disabled={isLoading}>
          Μόνο Wiki / Πηγές / Μνήμες
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("graph")} disabled={isLoading}>
          Μόνο Knowledge Graph
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
