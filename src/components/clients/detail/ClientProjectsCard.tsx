import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FolderKanban, ArrowRight, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Project {
  id: string;
  name: string;
  status: string;
  progress: number;
  budget: number;
}

interface Props {
  projects: Project[];
  clientId: string;
}

const statusColors: Record<string, string> = {
  active: 'bg-success/10 text-success border-success/20',
  completed: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400',
  on_hold: 'bg-warning/10 text-warning border-warning/20',
  planning: 'bg-secondary text-muted-foreground',
};

export function ClientProjectsCard({ projects, clientId }: Props) {
  const visible = projects.slice(0, 3);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FolderKanban className="h-4 w-4" /> Projects
            <Badge variant="outline" className="text-xs ml-1">{projects.length}</Badge>
          </CardTitle>
          <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
            <Link to={`/projects?new=true&client=${clientId}`}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Δεν υπάρχουν projects</p>
        ) : (
          visible.map(p => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="block p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium truncate">{p.name}</span>
                <Badge variant="outline" className={`text-xs border ${statusColors[p.status] || ''}`}>
                  {p.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>€{p.budget?.toLocaleString() || 0}</span>
                <span>{p.progress}%</span>
              </div>
              <Progress value={p.progress} className="h-1.5" />
            </Link>
          ))
        )}
        {projects.length > 3 && (
          <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
            <Link to={`/projects?client=${clientId}`}>
              Όλα τα projects <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
