import { useMemo, useState } from 'react';
import { TimeEntry } from '@/hooks/useTimeTracking';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, ChevronRight } from 'lucide-react';
import { format, eachDayOfInterval, eachMonthOfInterval, eachYearOfInterval, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { GroupBy, AggregationLevel } from './TimesheetFilters';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TimesheetGridViewProps {
  entries: TimeEntry[];
  dateRange: { start: Date; end: Date };
  groupBy: GroupBy;
  aggregation: AggregationLevel;
  onStartTimer?: (taskId: string, projectId: string) => void;
  onRefresh: () => void;
}

interface GridRow {
  key: string;
  label: string;
  sublabel?: string;
  taskId?: string | null;
  projectId?: string;
  entries: TimeEntry[];
}

function formatDuration(minutes: number): string {
  if (minutes === 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}λ`;
  return m > 0 ? `${h}ω ${m}λ` : `${h}ω`;
}

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function entryMatchesColumn(entry: TimeEntry, colDate: Date, aggregation: AggregationLevel): boolean {
  const entryDate = new Date(entry.start_time);
  switch (aggregation) {
    case 'day':
      return toLocalDateStr(entryDate) === toLocalDateStr(colDate);
    case 'month':
      return entryDate.getFullYear() === colDate.getFullYear() && entryDate.getMonth() === colDate.getMonth();
    case 'year':
      return entryDate.getFullYear() === colDate.getFullYear();
  }
}

export function TimesheetGridView({ entries, dateRange, groupBy, aggregation, onStartTimer, onRefresh }: TimesheetGridViewProps) {
  // Generate columns based on aggregation level
  const columns = useMemo(() => {
    switch (aggregation) {
      case 'day':
        return eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
      case 'month':
        return eachMonthOfInterval({ start: startOfMonth(dateRange.start), end: endOfMonth(dateRange.end) });
      case 'year':
        return eachYearOfInterval({ start: startOfYear(dateRange.start), end: endOfYear(dateRange.end) });
    }
  }, [dateRange, aggregation]);

  // Format column header
  const formatColumn = (date: Date): { top: string; bottom: string } => {
    switch (aggregation) {
      case 'day':
        return { top: format(date, 'EEE', { locale: el }), bottom: format(date, 'dd/MM') };
      case 'month':
        return { top: format(date, 'MMM', { locale: el }), bottom: format(date, 'yyyy') };
      case 'year':
        return { top: format(date, 'yyyy'), bottom: '' };
    }
  };

  // Group entries into rows
  const rows = useMemo(() => {
    const map = new Map<string, GridRow>();

    entries.forEach(entry => {
      let key: string;
      let label: string;
      let sublabel: string | undefined;

      switch (groupBy) {
        case 'project':
          key = entry.project_id;
          label = (entry as any).task?.title || 'Χωρίς task';
          sublabel = (entry as any).project?.name;
          break;
        case 'person':
          key = entry.user_id;
          label = (entry as any).profile?.full_name || 'Χωρίς όνομα';
          sublabel = (entry as any).project?.name;
          break;
        case 'task':
          key = entry.task_id || 'no-task';
          label = (entry as any).task?.title || 'Χωρίς task';
          sublabel = (entry as any).project?.name;
          break;
        case 'status': {
          const status = entry.is_running ? 'running' : (entry.end_time ? 'completed' : 'pending');
          const statusLabels: Record<string, string> = {
            running: '🟢 Σε εξέλιξη',
            completed: '✅ Ολοκληρωμένο',
            pending: '⏳ Εκκρεμεί',
          };
          key = status;
          label = statusLabels[status] || status;
          sublabel = (entry as any).project?.name;
          break;
        }
        default:
          key = entry.task_id || entry.project_id;
          label = (entry as any).task?.title || (entry as any).project?.name || '—';
          break;
      }

      const existing = map.get(key);
      if (existing) {
        existing.entries.push(entry);
      } else {
        map.set(key, { key, label, sublabel, taskId: entry.task_id, projectId: entry.project_id, entries: [entry] });
      }
    });

    return Array.from(map.values());
  }, [entries, groupBy]);

  // Calculate totals per column
  const colTotals = useMemo(() => {
    return columns.map(col => {
      return entries
        .filter(e => entryMatchesColumn(e, col, aggregation))
        .reduce((s, e) => s + (e.duration_minutes || 0), 0);
    });
  }, [entries, columns, aggregation]);

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[220px] sticky left-0 bg-card/90 backdrop-blur-sm z-10">
              Task / Έργο
            </TableHead>
            {columns.map((col, i) => {
              const fmt = formatColumn(col);
              return (
                <TableHead key={i} className="text-center min-w-[90px]">
                  <div className="space-y-1">
                    <div className="text-xs font-medium">{fmt.top}</div>
                    {fmt.bottom && <div className="text-xs text-muted-foreground">{fmt.bottom}</div>}
                    <div className="text-xs font-semibold text-primary">{formatDuration(colTotals[i])}</div>
                    <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min(100, (colTotals[i] / (8 * 60)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </TableHead>
              );
            })}
            <TableHead className="text-center min-w-[90px] font-semibold">Total</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + 3} className="text-center text-muted-foreground py-12">
                Δεν βρέθηκαν καταχωρήσεις
              </TableCell>
            </TableRow>
          ) : rows.map(row => {
            const rowTotal = row.entries.reduce((s, e) => s + (e.duration_minutes || 0), 0);

            return (
              <TableRow key={row.key} className="group">
                <TableCell className="sticky left-0 bg-card/90 backdrop-blur-sm z-10">
                  <div>
                    <div className="text-sm font-medium">{row.label}</div>
                    {row.sublabel && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <ChevronRight className="h-3 w-3" />
                        {row.sublabel}
                      </div>
                    )}
                  </div>
                </TableCell>
                {columns.map((col, i) => {
                  const colEntries = row.entries.filter(e => entryMatchesColumn(e, col, aggregation));
                  const colMin = colEntries.reduce((s, e) => s + (e.duration_minutes || 0), 0);
                  return (
                    <GridCell
                      key={i}
                      minutes={colMin}
                      entries={colEntries}
                      day={col}
                      taskId={row.taskId}
                      projectId={row.projectId}
                      onRefresh={onRefresh}
                    />
                  );
                })}
                <TableCell className="text-center">
                  <Badge variant="outline" className="font-mono text-xs">
                    {formatDuration(rowTotal)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {row.taskId && row.projectId && onStartTimer && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onStartTimer(row.taskId!, row.projectId!)}
                    >
                      <Play className="h-3.5 w-3.5 text-primary" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function GridCell({
  minutes, entries, day, taskId, projectId, onRefresh
}: {
  minutes: number;
  entries: TimeEntry[];
  day: Date;
  taskId?: string | null;
  projectId?: string;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editHours, setEditHours] = useState('');
  const [editMinutes, setEditMinutes] = useState('');

  const handleOpen = () => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    setEditHours(String(h));
    setEditMinutes(String(m));
    setOpen(true);
  };

  const handleSave = async () => {
    const newMinutes = (parseInt(editHours) || 0) * 60 + (parseInt(editMinutes) || 0);
    const diff = newMinutes - minutes;

    if (diff === 0) { setOpen(false); return; }

    if (entries.length > 0 && diff !== 0) {
      const entry = entries[0];
      const newDuration = Math.max(0, entry.duration_minutes + diff);
      await supabase
        .from('time_entries')
        .update({ duration_minutes: newDuration })
        .eq('id', entry.id);
      toast.success('Ενημερώθηκε');
    } else if (entries.length === 0 && newMinutes > 0 && projectId) {
      const startTime = new Date(day);
      startTime.setHours(9, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + newMinutes);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('time_entries').insert({
        user_id: user.id,
        task_id: taskId || null,
        project_id: projectId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: newMinutes,
        is_running: false,
      });
      toast.success('Καταχωρήθηκε');
    }

    setOpen(false);
    onRefresh();
  };

  return (
    <TableCell className="text-center p-0">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            onClick={handleOpen}
            className={cn(
              "w-full h-full min-h-[40px] px-2 py-2 text-xs font-mono transition-colors",
              minutes > 0 ? "text-foreground hover:bg-primary/10" : "text-muted-foreground/40 hover:bg-muted/50",
              "cursor-pointer"
            )}
          >
            {minutes > 0 ? formatDuration(minutes) : '—'}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-3 pointer-events-auto" align="center">
          <div className="space-y-3">
            <div className="text-xs font-medium text-muted-foreground">
              {format(day, 'EEEE dd/MM', { locale: el })}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Ώρες</Label>
                <Input type="number" min="0" max="24" value={editHours} onChange={e => setEditHours(e.target.value)} className="h-8" />
              </div>
              <div>
                <Label className="text-xs">Λεπτά</Label>
                <Input type="number" min="0" max="59" value={editMinutes} onChange={e => setEditMinutes(e.target.value)} className="h-8" />
              </div>
            </div>
            <Button size="sm" className="w-full h-7" onClick={handleSave}>
              Αποθήκευση
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </TableCell>
  );
}
