import { format } from 'date-fns';
import { History } from 'lucide-react';
import type { KBArticleVersion } from '@/hooks/useKnowledgeBase';

interface KBVersionHistoryProps {
  versions: KBArticleVersion[];
}

export function KBVersionHistory({ versions }: KBVersionHistoryProps) {
  if (versions.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">Δεν υπάρχει ιστορικό εκδόσεων.</p>;
  }

  return (
    <div className="space-y-3">
      {versions.map(v => (
        <div key={v.id} className="flex gap-3 text-sm">
          <div className="flex flex-col items-center">
            <History className="h-4 w-4 text-muted-foreground" />
            <div className="w-px flex-1 bg-border mt-1" />
          </div>
          <div className="pb-4">
            <p className="font-medium">v{v.version} — {v.title}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(v.created_at), 'dd/MM/yyyy HH:mm')}
              {v.change_notes && ` · ${v.change_notes}`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
