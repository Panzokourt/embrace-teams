import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Edit2, Trash2, Bell, Zap, ArrowRight } from 'lucide-react';
import type { IntakeWorkflowStage } from '@/hooks/useIntakeWorkflows';

const stageTypeColors: Record<string, string> = {
  request: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  review: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  approval: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  kickoff: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
};

interface WorkflowStageCardProps {
  stage: IntakeWorkflowStage;
  isLast: boolean;
  onEdit: (stage: IntakeWorkflowStage) => void;
  onDelete: (id: string) => void;
}

export function WorkflowStageCard({ stage, isLast, onEdit, onDelete }: WorkflowStageCardProps) {
  return (
    <div className="flex items-center gap-0 flex-shrink-0">
      <div className={cn(
        "relative w-56 rounded-2xl border border-border/40 bg-card p-4 shadow-soft transition-all hover:shadow-soft-lg group"
      )}>
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className={cn("text-[10px] font-medium capitalize", stageTypeColors[stage.stage_type] || '')}>
            {stage.stage_type}
          </Badge>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(stage)}>
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onDelete(stage.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <h4 className="text-sm font-semibold text-foreground truncate">{stage.name}</h4>
        <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
          {stage.sla_hours && (
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{stage.sla_hours}h</span>
          )}
          {stage.notify_on_enter && <Bell className="h-3 w-3" />}
          {stage.auto_advance && <Zap className="h-3 w-3" />}
          {(stage.required_fields as string[])?.length > 0 && (
            <span>{(stage.required_fields as string[]).length} fields</span>
          )}
        </div>
      </div>
      {!isLast && (
        <div className="flex-shrink-0 px-1">
          <ArrowRight className="h-5 w-5 text-muted-foreground/50" />
        </div>
      )}
    </div>
  );
}
