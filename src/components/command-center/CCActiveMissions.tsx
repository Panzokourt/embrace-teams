import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Sword, Shield, Flame, Crown, ChevronRight } from 'lucide-react';

interface TaskMission {
  id: string;
  title: string;
  priority: string;
  status: string;
  project_name?: string;
  due_date?: string | null;
}

interface CCActiveMissionsProps {
  tasks: TaskMission[];
}

const difficultyMap: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; xp: number }> = {
  low: { label: 'Easy', icon: Shield, color: 'text-success bg-success/10 border-success/20', xp: 10 },
  medium: { label: 'Medium', icon: Sword, color: 'text-primary bg-primary/10 border-primary/20', xp: 25 },
  high: { label: 'Hard', icon: Flame, color: 'text-warning bg-warning/10 border-warning/20', xp: 50 },
  urgent: { label: 'Epic', icon: Crown, color: 'text-destructive bg-destructive/10 border-destructive/20', xp: 100 },
};

export default function CCActiveMissions({ tasks }: CCActiveMissionsProps) {
  const navigate = useNavigate();
  const displayed = tasks.slice(0, 8);

  return (
    <div className="rounded-2xl border border-border/30 bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border/20 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sword className="h-4 w-4 text-primary" />
          Active Missions
        </h3>
        <span className="text-xs text-muted-foreground">{tasks.length} quests</span>
      </div>

      <div className="divide-y divide-border/10">
        {displayed.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Δεν υπάρχουν ενεργά missions 🎮
          </div>
        )}
        {displayed.map((task) => {
          const diff = difficultyMap[task.priority] || difficultyMap.medium;
          const DiffIcon = diff.icon;
          const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

          return (
            <button
              key={task.id}
              onClick={() => navigate(`/tasks/${task.id}`)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left group"
            >
              <div className={`flex items-center justify-center h-8 w-8 rounded-lg border ${diff.color}`}>
                <DiffIcon className="h-4 w-4" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                {task.project_name && (
                  <p className="text-xs text-muted-foreground truncate">{task.project_name}</p>
                )}
              </div>

              {isOverdue && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  OVERDUE
                </Badge>
              )}

              <span className="text-[10px] font-bold text-primary/60 whitespace-nowrap">
                +{diff.xp} XP
              </span>

              <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
            </button>
          );
        })}
      </div>

      {tasks.length > 8 && (
        <button
          onClick={() => navigate('/work?tab=tasks')}
          className="w-full px-4 py-2 text-xs text-primary hover:bg-primary/5 transition-colors border-t border-border/20"
        >
          Δες όλα τα {tasks.length} missions →
        </button>
      )}
    </div>
  );
}
