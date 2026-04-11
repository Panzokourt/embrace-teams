import { useState } from 'react';
import { ProjectDraft } from '@/hooks/useEmailToProject';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Check, X, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmailToProjectBannerProps {
  state: 'idle' | 'parsing' | 'draft' | 'creating' | 'success' | 'error';
  draft: ProjectDraft | null;
  error: string | null;
  onParse: () => void;
  onUpdateDraft: (updates: Partial<ProjectDraft>) => void;
  onCreateProject: () => void;
  onReset: () => void;
}

export function EmailToProjectBanner({
  state,
  draft,
  error,
  onParse,
  onUpdateDraft,
  onCreateProject,
  onReset,
}: EmailToProjectBannerProps) {
  const [expanded, setExpanded] = useState(true);
  const [newTask, setNewTask] = useState('');

  if (state === 'idle') return null;

  if (state === 'parsing') {
    return (
      <div className="mx-4 mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
        <span className="text-sm text-amber-700 dark:text-amber-300">Ανάλυση email brief με AI...</span>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="mx-4 mt-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-between">
        <span className="text-sm text-destructive">{error || 'Σφάλμα ανάλυσης'}</span>
        <Button variant="ghost" size="sm" onClick={onReset} className="h-7 text-xs">
          Κλείσιμο
        </Button>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="mx-4 mt-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3">
        <Check className="h-4 w-4 text-green-600" />
        <span className="text-sm text-green-700 dark:text-green-300">Project δημιουργήθηκε! Μεταφορά...</span>
      </div>
    );
  }

  if (state === 'creating') {
    return (
      <div className="mx-4 mt-3 p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm">Δημιουργία project...</span>
      </div>
    );
  }

  // Draft state
  if (!draft) return null;

  const priorityColors: Record<string, string> = {
    low: 'bg-muted text-muted-foreground',
    medium: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
    high: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    urgent: 'bg-destructive/10 text-destructive',
  };

  const handleAddTask = () => {
    if (!newTask.trim()) return;
    onUpdateDraft({ tasks: [...draft.tasks, { title: newTask.trim() }] });
    setNewTask('');
  };

  const handleRemoveTask = (index: number) => {
    onUpdateDraft({ tasks: draft.tasks.filter((_, i) => i !== index) });
  };

  return (
    <div className="mx-4 mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-amber-500/10 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium">AI Draft: {draft.project_name}</span>
          <Badge className={cn('text-[10px]', priorityColors[draft.priority])}>
            {draft.priority}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="p-3 pt-0 space-y-3">
          {/* Project name */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Όνομα Project</label>
            <Input
              value={draft.project_name}
              onChange={(e) => onUpdateDraft({ project_name: e.target.value })}
              className="h-8 text-sm mt-1"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Περιγραφή</label>
            <Textarea
              value={draft.description}
              onChange={(e) => onUpdateDraft({ description: e.target.value })}
              className="min-h-[60px] text-sm mt-1"
            />
          </div>

          {/* Row: Budget + Deadline + Priority */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Budget (€)</label>
              <Input
                type="number"
                value={draft.budget || ''}
                onChange={(e) => onUpdateDraft({ budget: e.target.value ? Number(e.target.value) : null })}
                className="h-8 text-sm mt-1"
                placeholder="—"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Deadline</label>
              <Input
                type="date"
                value={draft.deadline || ''}
                onChange={(e) => onUpdateDraft({ deadline: e.target.value || null })}
                className="h-8 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Priority</label>
              <select
                value={draft.priority}
                onChange={(e) => onUpdateDraft({ priority: e.target.value as any })}
                className="w-full h-8 text-sm mt-1 rounded-xl border border-border bg-card px-2"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Client */}
          {draft.suggested_client_name && !draft.matched_client_id && (
            <div className="text-xs text-muted-foreground">
              💡 Προτεινόμενος πελάτης: <span className="font-medium">{draft.suggested_client_name}</span> (δεν βρέθηκε στο σύστημα)
            </div>
          )}

          {/* Tasks */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Tasks ({draft.tasks.length})
            </label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {draft.tasks.map((task, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="text-xs gap-1 pr-1"
                >
                  {task.title}
                  <button
                    onClick={() => handleRemoveTask(i)}
                    className="ml-0.5 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-1 mt-1.5">
              <Input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                placeholder="Νέο task..."
                className="h-7 text-xs flex-1"
              />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleAddTask}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={onReset} className="h-8 text-xs">
              Ακύρωση
            </Button>
            <Button size="sm" onClick={onCreateProject} className="h-8 text-xs gap-1">
              <Check className="h-3 w-3" />
              Δημιουργία Project
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
