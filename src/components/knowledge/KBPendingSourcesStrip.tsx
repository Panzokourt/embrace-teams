import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileStack, Loader2, Wand2, Upload } from "lucide-react";
import { useKBCompiler } from "@/hooks/useKBCompiler";

interface Props {
  onImport: () => void;
}

export function KBPendingSourcesStrip({ onImport }: Props) {
  const { sources, compileSource } = useKBCompiler();
  const pending = sources.filter((s) => !s.compiled);

  if (pending.length === 0) return null;

  const compileAll = async () => {
    for (const src of pending) {
      try { await compileSource.mutateAsync(src.id); } catch { /* shown via toast */ }
    }
  };

  return (
    <Card className="border-warning/40 bg-warning/5">
      <CardContent className="p-3 flex items-center gap-3">
        <div className="h-8 w-8 rounded-md bg-warning/15 flex items-center justify-center shrink-0">
          <FileStack className="h-4 w-4 text-warning" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {pending.length} {pending.length === 1 ? "πηγή περιμένει" : "πηγές περιμένουν"} compilation
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {pending.slice(0, 3).map((s) => s.title).join(" · ")}
            {pending.length > 3 && ` +${pending.length - 3} ακόμη`}
          </p>
        </div>
        <Badge variant="warning" className="hidden sm:inline-flex">{pending.length}</Badge>
        <Button size="sm" variant="outline" onClick={onImport} className="gap-1">
          <Upload className="h-3.5 w-3.5" /> Νέα
        </Button>
        <Button size="sm" onClick={compileAll} disabled={compileSource.isPending} className="gap-1">
          {compileSource.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
          Compile all
        </Button>
      </CardContent>
    </Card>
  );
}
