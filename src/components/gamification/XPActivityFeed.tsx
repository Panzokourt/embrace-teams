import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface XPEntry {
  id: string;
  points: number;
  reason: string;
  source_type: string;
  skill_tag: string | null;
  created_at: string;
}

const reasonLabels: Record<string, string> = {
  task_completed: 'Task ολοκληρώθηκε',
  task_completed_early: 'Πρόωρη ολοκλήρωση',
  task_completed_on_time: 'Εμπρόθεσμη ολοκλήρωση',
  task_completed_late: 'Εκπρόθεσμη ολοκλήρωση',
  kudos_received: 'Kudos από συνάδελφο',
  kudos_given: 'Έδωσε Kudos',
  time_logged: 'Καταγραφή χρόνου',
  file_uploaded: 'Ανέβασμα αρχείου',
  task_detailed: 'Λεπτομερής περιγραφή',
  daily_streak: 'Ημερήσιο streak',
};

export function XPActivityFeed({ userId }: { userId: string }) {
  const [entries, setEntries] = useState<XPEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('user_xp')
      .select('id, points, reason, source_type, skill_tag, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setEntries((data as XPEntry[]) || []);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          XP Ιστορικό
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">Δεν υπάρχουν XP ακόμα</p>
        ) : (
          <div className="space-y-2">
            {entries.map(entry => (
              <div key={entry.id} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50 text-sm">
                <div className="flex items-center gap-2">
                  {entry.points >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                  <span>{reasonLabels[entry.reason] || entry.reason}</span>
                  {entry.skill_tag && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {entry.skill_tag}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn('font-bold text-xs', entry.points >= 0 ? 'text-emerald-500' : 'text-destructive')}>
                    {entry.points > 0 ? '+' : ''}{entry.points} XP
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(entry.created_at), 'd MMM HH:mm', { locale: el })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
