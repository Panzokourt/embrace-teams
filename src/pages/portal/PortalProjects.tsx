import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FolderKanban } from 'lucide-react';

interface PortalContext {
  client: { id: string; name: string };
}

interface PortalProject {
  id: string;
  name: string;
  status: string;
  progress: number | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
}

const statusLabels: Record<string, string> = {
  active: 'Ενεργό',
  completed: 'Ολοκληρωμένο',
  on_hold: 'Σε Αναμονή',
  cancelled: 'Ακυρωμένο',
  planning: 'Σχεδιασμός',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  on_hold: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  planning: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

export default function PortalProjects() {
  const { client } = useOutletContext<PortalContext>();
  const [projects, setProjects] = useState<PortalProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client) return;
    supabase
      .from('projects')
      .select('id, name, status, progress, start_date, end_date, description')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProjects((data as PortalProject[]) || []);
        setLoading(false);
      });
  }, [client]);

  if (loading) return <div className="text-center text-muted-foreground py-12">Φόρτωση...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <FolderKanban className="h-5 w-5 text-primary" />
        Τα Έργα σας
      </h2>

      {projects.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Δεν βρέθηκαν έργα</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <Card key={p.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-4 px-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{p.name}</h3>
                    {p.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {p.start_date && (
                        <span className="text-[10px] text-muted-foreground">
                          Έναρξη: {new Date(p.start_date).toLocaleDateString('el-GR')}
                        </span>
                      )}
                      {p.end_date && (
                        <span className="text-[10px] text-muted-foreground">
                          Λήξη: {new Date(p.end_date).toLocaleDateString('el-GR')}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge className={statusColors[p.status] || 'bg-muted text-muted-foreground'}>
                    {statusLabels[p.status] || p.status}
                  </Badge>
                </div>
                {p.progress != null && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Πρόοδος</span>
                      <span>{p.progress}%</span>
                    </div>
                    <Progress value={p.progress} className="h-1.5" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
