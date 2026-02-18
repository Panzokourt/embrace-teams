import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Package, ListChecks } from 'lucide-react';
import { useState } from 'react';

interface TemplateDeliverable {
  id: string;
  name: string;
  description: string | null;
  default_budget: number | null;
  sort_order: number | null;
}

interface TemplateTask {
  id: string;
  title: string;
  description: string | null;
  priority: string | null;
  estimated_hours: number | null;
  task_category: string | null;
  deliverable_ref_order: number | null;
  sort_order: number | null;
}

interface TemplatePreviewProps {
  deliverables: TemplateDeliverable[];
  tasks: TemplateTask[];
  selectedDeliverableIds: Set<string>;
  selectedTaskIds: Set<string>;
  onToggleDeliverable: (id: string) => void;
  onToggleTask: (id: string) => void;
}

export function TemplatePreview({
  deliverables,
  tasks,
  selectedDeliverableIds,
  selectedTaskIds,
  onToggleDeliverable,
  onToggleTask,
}: TemplatePreviewProps) {
  const [open, setOpen] = useState(true);

  const selectedDelCount = selectedDeliverableIds.size;
  const selectedTaskCount = selectedTaskIds.size;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border border-border/50 bg-secondary/20 hover:bg-secondary/40 transition-colors">
        <span className="text-sm font-medium flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-primary" />
          Περιεχόμενο Template
          <Badge variant="secondary" className="text-xs font-normal">
            {selectedDelCount}/{deliverables.length} παραδοτέα · {selectedTaskCount}/{tasks.length} tasks
          </Badge>
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-3">
        {/* Deliverables */}
        {deliverables.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 px-1">
              <Package className="h-3.5 w-3.5" />
              Παραδοτέα
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {deliverables.map(d => (
                <label
                  key={d.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary/30 cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={selectedDeliverableIds.has(d.id)}
                    onCheckedChange={() => onToggleDeliverable(d.id)}
                  />
                  <span className="flex-1 truncate">{d.name}</span>
                  {d.default_budget ? (
                    <span className="text-xs text-muted-foreground">€{d.default_budget.toLocaleString()}</span>
                  ) : null}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Tasks */}
        {tasks.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 px-1">
              <ListChecks className="h-3.5 w-3.5" />
              Tasks
            </p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {tasks.map(t => (
                <label
                  key={t.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary/30 cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={selectedTaskIds.has(t.id)}
                    onCheckedChange={() => onToggleTask(t.id)}
                  />
                  <span className="flex-1 truncate">{t.title}</span>
                  {t.estimated_hours ? (
                    <span className="text-xs text-muted-foreground">{t.estimated_hours}h</span>
                  ) : null}
                  {t.priority && t.priority !== 'medium' && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      {t.priority}
                    </Badge>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
