import { useState, KeyboardEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { X, Plus } from 'lucide-react';

interface Props {
  tags: string[];
  onSave: (tags: string[]) => Promise<void> | void;
  canEdit?: boolean;
}

export function InlineTagsField({ tags, onSave, canEdit = true }: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const add = async () => {
    const v = draft.trim();
    if (!v) { setAdding(false); return; }
    if (tags.includes(v)) { setDraft(''); setAdding(false); return; }
    await onSave([...tags, v]);
    setDraft('');
    setAdding(false);
  };

  const remove = async (t: string) => {
    await onSave(tags.filter(x => x !== t));
  };

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); add(); }
    if (e.key === 'Escape') { setDraft(''); setAdding(false); }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.length === 0 && !adding && (
        <span className="text-sm text-muted-foreground italic">Καμία ετικέτα</span>
      )}
      {tags.map(t => (
        <Badge key={t} variant="secondary" className="gap-1 pr-1">
          {t}
          {canEdit && (
            <button onClick={() => remove(t)} className="hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      ))}
      {canEdit && (
        adding ? (
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={add}
            onKeyDown={handleKey}
            placeholder="ετικέτα…"
            className="h-6 w-28 text-xs"
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground rounded-md px-1.5 py-0.5 hover:bg-secondary/60"
          >
            <Plus className="h-3 w-3" /> Προσθήκη
          </button>
        )
      )}
    </div>
  );
}
