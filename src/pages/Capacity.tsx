import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Gauge, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { startOfWeek, addWeeks, format, isWithinInterval, parseISO, endOfWeek } from 'date-fns';
import { el } from 'date-fns/locale';

const WEEKS_TO_SHOW = 8;
const HOURS_PER_WEEK = 40;

export default function Capacity() {
  const { company } = useAuth();
  const companyId = company?.id;

  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['capacity-profiles', companyId],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, job_title, avatar_url')
        .eq('status', 'active');
      return data ?? [];
    },
    enabled: !!companyId,
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['capacity-tasks', companyId],
    queryFn: async () => {
      const { data } = await supabase.from('tasks')
        .select('id, assigned_to, due_date, estimated_hours, status')
        .neq('status', 'completed');
      return data ?? [];
    },
    enabled: !!companyId,
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['capacity-time', companyId],
    queryFn: async () => {
      const { data } = await (supabase.from('time_entries').select('user_id, hours, start_time') as any);
      return data ?? [];
    },
    enabled: !!companyId,
  });

  const weeks = useMemo(() => {
    const now = new Date();
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    return Array.from({ length: WEEKS_TO_SHOW }, (_, i) => {
      const start = addWeeks(currentWeekStart, i - 1);
      const end = endOfWeek(start, { weekStartsOn: 1 });
      return { start, end, label: format(start, 'dd MMM', { locale: el }) };
    });
  }, []);

  const heatmapData = useMemo(() => {
    return profiles.map(p => {
      const weekHours = weeks.map(w => {
        // Hours from time_entries
        const logged = timeEntries
          .filter((te: any) => te.user_id === p.id && te.start_time &&
            isWithinInterval(parseISO(te.start_time), { start: w.start, end: w.end }))
          .reduce((sum: number, te: any) => sum + (te.hours || 0), 0);
        
        // Estimated hours from tasks due this week
        const estimated = tasks
          .filter(t => t.assigned_to === p.id && t.due_date &&
            isWithinInterval(parseISO(t.due_date), { start: w.start, end: w.end }))
          .reduce((sum, t) => sum + (t.estimated_hours || 2), 0);

        const total = Math.max(logged, estimated);
        return { logged, estimated, total };
      });
      return { profile: p, weekHours };
    }).filter(row => row.weekHours.some(w => w.total > 0) || true);
  }, [profiles, tasks, timeEntries, weeks]);

  const getCellColor = (hours: number) => {
    const ratio = hours / HOURS_PER_WEEK;
    if (hours === 0) return 'bg-muted/30';
    if (ratio <= 0.5) return 'bg-emerald-500/20';
    if (ratio <= 0.8) return 'bg-emerald-500/40';
    if (ratio <= 1) return 'bg-amber-500/40';
    return 'bg-red-500/40';
  };

  const loading = loadingProfiles || loadingTasks;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <div className="page-shell max-w-[1400px] mx-auto">
      <PageHeader
        icon={Gauge}
        title="Capacity Overview"
        subtitle="Φόρτος εργασίας ομάδας ανά εβδομάδα"
        breadcrumbs={[{ label: 'Operations' }, { label: 'Capacity' }]}
      />

      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-4">
            <span>Ώρες / Εβδομάδα (max {HOURS_PER_WEEK}h)</span>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-4 h-4 rounded bg-emerald-500/20" /> &lt;50%
              <span className="w-4 h-4 rounded bg-emerald-500/40" /> 50-80%
              <span className="w-4 h-4 rounded bg-amber-500/40" /> 80-100%
              <span className="w-4 h-4 rounded bg-red-500/40" /> &gt;100%
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-2 w-48 font-medium">Μέλος</th>
                {weeks.map((w, i) => (
                  <th key={i} className="text-center p-2 font-medium text-xs whitespace-nowrap">
                    {w.label}
                  </th>
                ))}
                <th className="text-center p-2 font-medium text-xs">Μ.Ο.</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {heatmapData.map(row => {
                const avg = row.weekHours.reduce((s, w) => s + w.total, 0) / weeks.length;
                return (
                  <tr key={row.profile.id}>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-[10px]">
                            {(row.profile.full_name || '?').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{row.profile.full_name}</p>
                          {row.profile.job_title && (
                            <p className="text-[10px] text-muted-foreground truncate">{row.profile.job_title}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    {row.weekHours.map((w, i) => (
                      <td key={i} className="p-1.5 text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={`rounded-md py-2 px-1 text-xs font-medium ${getCellColor(w.total)}`}>
                              {w.total > 0 ? `${Math.round(w.total)}h` : '—'}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Logged: {w.logged}h</p>
                            <p>Estimated: {w.estimated}h</p>
                            <p>Utilization: {Math.round((w.total / HOURS_PER_WEEK) * 100)}%</p>
                          </TooltipContent>
                        </Tooltip>
                      </td>
                    ))}
                    <td className="p-1.5 text-center">
                      <div className={`rounded-md py-2 px-1 text-xs font-medium ${getCellColor(avg)}`}>
                        {Math.round(avg)}h
                      </div>
                    </td>
                  </tr>
                );
              })}
              {heatmapData.length === 0 && (
                <tr><td colSpan={weeks.length + 2} className="p-8 text-center text-muted-foreground">Δεν υπάρχουν δεδομένα</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
