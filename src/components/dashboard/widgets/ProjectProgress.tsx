import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { ListChecks } from 'lucide-react';
import { WIDGET_CARD_CLASS, WIDGET_ICON_CLASS, WIDGET_TITLE_CLASS } from '../chartStyles';

interface ProjectInfo { id: string; name: string; progress: number }

export default function ProjectProgress() {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);

  useEffect(() => {
    supabase
      .from('projects')
      .select('id, name, progress')
      .eq('status', 'active')
      .order('name')
      .limit(8)
      .then(({ data }) => {
        if (data) {
          setProjects(data.map(p => ({ id: p.id, name: p.name, progress: p.progress ?? 0 })));
        }
      });
  }, []);

  return (
    <div className={WIDGET_CARD_CLASS}>
      <h3 className={WIDGET_TITLE_CLASS}>
        <span className={WIDGET_ICON_CLASS}><ListChecks className="h-4 w-4 text-primary" /></span>
        Πρόοδος Έργων
      </h3>
      <div className="space-y-3 max-h-72 overflow-y-auto scrollbar-thin">
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground/60 text-center py-8">Δεν υπάρχουν ενεργά έργα</p>
        ) : (
          projects.map(p => (
            <div key={p.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground/90 truncate max-w-[80%]">{p.name}</span>
                <span className="text-xs font-medium text-muted-foreground tabular-nums">{p.progress}%</span>
              </div>
              <Progress value={p.progress} className="h-2" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
