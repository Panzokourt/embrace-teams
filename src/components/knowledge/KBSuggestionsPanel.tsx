import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, RefreshCw, ChevronDown, ChevronUp, Wand2 } from 'lucide-react';
import { useKBSuggestions, type KBSuggestion } from '@/hooks/useKBSuggestions';
import { Skeleton } from '@/components/ui/skeleton';

interface KBSuggestionsPanelProps {
  onCompose: (s: KBSuggestion) => void;
}

const TYPE_LABELS: Record<string, string> = {
  sop: 'SOP', guide: 'Οδηγός', policy: 'Πολιτική', checklist: 'Checklist', article: 'Άρθρο',
};

export function KBSuggestionsPanel({ onCompose }: KBSuggestionsPanelProps) {
  const { suggestions, isLoading, refresh } = useKBSuggestions();
  const [collapsed, setCollapsed] = useState(false);

  if (isLoading) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!suggestions.length) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">
              Προτάσεις AI ({suggestions.length})
            </p>
            <span className="text-xs text-muted-foreground hidden sm:inline">βάσει των δεδομένων σου</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm" variant="ghost" className="h-7 gap-1 text-xs"
              onClick={() => refresh.mutate()}
              disabled={refresh.isPending}
            >
              <RefreshCw className={`h-3 w-3 ${refresh.isPending ? 'animate-spin' : ''}`} />
              Ανανέωση
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setCollapsed(c => !c)}>
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {!collapsed && (
          <div className="grid sm:grid-cols-2 gap-2">
            {suggestions.map((s, i) => (
              <div key={i} className="rounded-md border border-border/50 bg-background p-3 space-y-2 hover:border-primary/50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">{s.title}</p>
                    <Badge variant="outline" className="text-[10px] mt-1">{TYPE_LABELS[s.type] || s.type}</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{s.reasoning}</p>
                <Button
                  size="sm" variant="outline" className="h-7 w-full gap-1 text-xs"
                  onClick={() => onCompose(s)}
                >
                  <Wand2 className="h-3 w-3" /> Σύνταξε με AI
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
