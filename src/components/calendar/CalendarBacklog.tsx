import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { CheckSquare, Package, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BacklogItem {
  id: string;
  title: string;
  type: 'task' | 'deliverable';
  project_name?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CalendarBacklog({ open, onClose }: Props) {
  const { company } = useAuth();
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'task' | 'deliverable'>('all');

  useEffect(() => {
    if (!open || !company?.id) return;

    const loadBacklog = async () => {
      // Tasks without due_date
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, projects!inner(name)')
        .is('due_date', null)
        .limit(50);

      // Deliverables without due_date
      const { data: deliverables } = await supabase
        .from('deliverables')
        .select('id, name, projects!inner(name)')
        .is('due_date', null)
        .limit(50);

      const result: BacklogItem[] = [
        ...(tasks || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          type: 'task' as const,
          project_name: t.projects?.name,
        })),
        ...(deliverables || []).map((d: any) => ({
          id: d.id,
          title: d.name,
          type: 'deliverable' as const,
          project_name: d.projects?.name,
        })),
      ];
      setItems(result);
    };

    loadBacklog();
  }, [open, company?.id]);

  const filtered = filter === 'all' ? items : items.filter(i => i.type === filter);

  if (!open) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 bg-card border-l border-border shadow-xl z-40 flex flex-col animate-in">
      <div className="p-4 border-b border-border/40 flex items-center justify-between">
        <h3 className="font-semibold text-sm">Backlog</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-1 p-2 border-b border-border/20">
        {(['all', 'task', 'deliverable'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-2.5 py-1 text-[11px] font-medium rounded-md transition-all',
              filter === f ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {{ all: 'Όλα', task: 'Tasks', deliverable: 'Deliverables' }[f]}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filtered.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              Δεν υπάρχουν items χωρίς ημερομηνία
            </div>
          )}
          {filtered.map(item => (
            <div
              key={item.id}
              className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-grab transition-colors"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('backlog-item', JSON.stringify(item));
              }}
            >
              {item.type === 'task' ? (
                <CheckSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              ) : (
                <Package className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">{item.title}</div>
                {item.project_name && (
                  <div className="text-[10px] text-muted-foreground truncate">{item.project_name}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
