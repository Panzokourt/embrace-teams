import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import { Brain, Loader2, FolderPlus, ListPlus, Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DeepDiveResult {
  extended_analysis: string;
  action_plan: Array<{ step: string; timeline: string; effort: string }>;
  suggested_project?: {
    name: string;
    description: string;
    client_id?: string;
    budget?: number;
    estimated_duration_days?: number;
  };
  suggested_task?: {
    title: string;
    description: string;
    priority: string;
    estimated_hours?: number;
  };
}

interface BrainDeepDiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  result: DeepDiveResult | null;
  insightTitle: string;
  onCreateProject?: (suggested: DeepDiveResult['suggested_project']) => void;
  onCreateTask?: (suggested: DeepDiveResult['suggested_task']) => void;
}

const effortColors: Record<string, string> = {
  low: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  high: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export function BrainDeepDiveDialog({
  open, onOpenChange, isLoading, result, insightTitle,
  onCreateProject, onCreateTask,
}: BrainDeepDiveDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Brain className="h-5 w-5 text-primary" />
            Deep Dive Analysis
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{insightTitle}</p>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] px-6 pb-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Αναλύω σε βάθος...</p>
              <p className="text-[11px] text-muted-foreground/60">AI + Market Research</p>
            </div>
          ) : result ? (
            <div className="space-y-5">
              {/* Extended Analysis */}
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{result.extended_analysis}</ReactMarkdown>
              </div>

              {/* Action Plan */}
              {result.action_plan && result.action_plan.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <Zap className="h-4 w-4" /> Action Plan
                  </h4>
                  <div className="space-y-2">
                    {result.action_plan.map((item, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/30">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{item.step}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {item.timeline}
                            </span>
                            <Badge variant="outline" className={cn("text-[10px] border", effortColors[item.effort] || '')}>
                              {item.effort === 'low' ? 'Χαμηλό effort' : item.effort === 'high' ? 'Υψηλό effort' : 'Μεσαίο effort'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/30">
                {result.suggested_project && onCreateProject && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onCreateProject(result.suggested_project)}>
                    <FolderPlus className="h-4 w-4" /> Δημιούργησε Έργο
                    {result.suggested_project.budget && (
                      <span className="text-muted-foreground ml-1">• €{result.suggested_project.budget.toLocaleString()}</span>
                    )}
                  </Button>
                )}
                {result.suggested_task && onCreateTask && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onCreateTask(result.suggested_task)}>
                    <ListPlus className="h-4 w-4" /> Δημιούργησε Task
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
