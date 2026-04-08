import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Wand2, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import type { KBRawSource } from '@/hooks/useKBCompiler';

interface Props {
  sources: KBRawSource[];
  onCompile: (id: string) => void;
  onDelete: (id: string) => void;
  compilingId?: string;
}

export function KBSourceList({ sources, onCompile, onDelete, compilingId }: Props) {
  if (sources.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Δεν υπάρχουν πηγές ακόμα. Προσθέστε μία παραπάνω.</p>;
  }

  return (
    <div className="space-y-2">
      {sources.map(source => (
        <Card key={source.id}>
          <CardContent className="p-3 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{source.title}</p>
                <Badge variant="outline" className="text-[10px]">{source.source_type}</Badge>
                {source.compiled ? (
                  <Badge variant="success" className="text-[10px] gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Compiled
                  </Badge>
                ) : (
                  <Badge variant="warning" className="text-[10px] gap-1">
                    <Clock className="h-3 w-3" /> Pending
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(new Date(source.created_at), 'dd/MM/yyyy HH:mm')}
                {source.content.length > 0 && ` · ${source.content.length.toLocaleString()} χαρακτήρες`}
              </p>
            </div>
            <div className="flex gap-1">
              {!source.compiled && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCompile(source.id)}
                  disabled={compilingId === source.id}
                  className="gap-1"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  {compilingId === source.id ? 'Compiling...' : 'Compile'}
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => onDelete(source.id)} className="text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
