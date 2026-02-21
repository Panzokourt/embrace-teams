import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CalendarDays, Clock, TrendingUp } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { el } from 'date-fns/locale';

interface WorkDayLog {
  id: string;
  date: string;
  clock_in: string;
  clock_out: string | null;
  scheduled_minutes: number;
  actual_minutes: number;
  status: string;
  auto_started: boolean;
  user_id: string;
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Ενεργό', variant: 'default' },
  completed: { label: 'Ολοκληρώθηκε', variant: 'secondary' },
  overtime: { label: 'Υπερωρία', variant: 'destructive' },
  absent: { label: 'Απουσία', variant: 'outline' },
};

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}ω ${m}λ`;
}

export function AttendanceLog() {
  const { user, isAdmin, isManager } = useAuth();
  const [logs, setLogs] = useState<WorkDayLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);
  const [filterUser, setFilterUser] = useState('all');
  const [users, setUsers] = useState<{ id: string; full_name: string | null }[]>([]);

  const targetMonth = useMemo(() => subMonths(new Date(), monthOffset), [monthOffset]);
  const rangeStart = format(startOfMonth(targetMonth), 'yyyy-MM-dd');
  const rangeEnd = format(endOfMonth(targetMonth), 'yyyy-MM-dd');

  useEffect(() => {
    if (!user) return;
    const fetchLogs = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('work_day_logs')
          .select('*')
          .gte('date', rangeStart)
          .lte('date', rangeEnd)
          .order('date', { ascending: false });

        if (!isAdmin && !isManager) {
          query = query.eq('user_id', user.id);
        } else if (filterUser !== 'all') {
          query = query.eq('user_id', filterUser);
        }

        const [logsRes, usersRes] = await Promise.all([
          query,
          (isAdmin || isManager) ? supabase.from('profiles').select('id, full_name') : Promise.resolve({ data: [] }),
        ]);

        setLogs((logsRes.data || []) as WorkDayLog[]);
        if (usersRes.data) setUsers(usersRes.data as any);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [user, isAdmin, isManager, rangeStart, rangeEnd, filterUser]);

  const totalActual = logs.reduce((s, l) => s + (l.actual_minutes || 0), 0);
  const totalScheduled = logs.reduce((s, l) => s + (l.scheduled_minutes || 0), 0);
  const daysWorked = logs.filter(l => l.clock_out).length;

  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), i);
    return { value: String(i), label: format(d, 'LLLL yyyy', { locale: el }) };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <CalendarDays className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ημέρες εργασίας</p>
              <p className="text-lg font-semibold">{daysWorked}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Πραγματικές ώρες</p>
              <p className="text-lg font-semibold">{formatMinutes(totalActual)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Διαφορά</p>
              <p className="text-lg font-semibold">
                {totalActual >= totalScheduled ? '+' : ''}{formatMinutes(totalActual - totalScheduled)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={String(monthOffset)} onValueChange={(v) => setMonthOffset(Number(v))}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map(o => (
              <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(isAdmin || isManager) && users.length > 0 && (
          <Select value={filterUser} onValueChange={setFilterUser}>
            <SelectTrigger className="w-[200px] h-8 text-xs">
              <SelectValue placeholder="Όλοι οι χρήστες" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Όλοι</SelectItem>
              {users.map(u => (
                <SelectItem key={u.id} value={u.id} className="text-xs">
                  {u.full_name || u.id.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Ημερομηνία</TableHead>
                <TableHead className="text-xs">Προσέλευση</TableHead>
                <TableHead className="text-xs">Αποχώρηση</TableHead>
                <TableHead className="text-xs">Προγρ. ώρες</TableHead>
                <TableHead className="text-xs">Πραγμ. ώρες</TableHead>
                <TableHead className="text-xs">Διαφορά</TableHead>
                <TableHead className="text-xs">Κατάσταση</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-8">
                    Δεν υπάρχουν εγγραφές για αυτόν τον μήνα
                  </TableCell>
                </TableRow>
              ) : (
                logs.map(log => {
                  const diff = (log.actual_minutes || 0) - log.scheduled_minutes;
                  const st = statusLabels[log.status] || { label: log.status, variant: 'outline' as const };
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs font-medium">
                        {format(parseISO(log.date), 'EEE dd/MM', { locale: el })}
                      </TableCell>
                      <TableCell className="text-xs">
                        {format(parseISO(log.clock_in), 'HH:mm')}
                        {log.auto_started && (
                          <span className="ml-1 text-muted-foreground">(αυτ.)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {log.clock_out ? format(parseISO(log.clock_out), 'HH:mm') : '—'}
                      </TableCell>
                      <TableCell className="text-xs">{formatMinutes(log.scheduled_minutes)}</TableCell>
                      <TableCell className="text-xs font-medium">{formatMinutes(log.actual_minutes || 0)}</TableCell>
                      <TableCell className={`text-xs font-medium ${diff > 0 ? 'text-red-500' : diff < 0 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                        {diff > 0 ? '+' : ''}{formatMinutes(diff)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={st.variant} className="text-[10px]">{st.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
