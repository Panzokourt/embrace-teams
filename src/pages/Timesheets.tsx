import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTimeTracking, TimeEntry } from '@/hooks/useTimeTracking';
import { TimeEntryForm } from '@/components/time-tracking/TimeEntryForm';
import { exportToCSV, exportToExcel } from '@/utils/exportUtils';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Timer, Trash2, Download, Loader2, Clock
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { el } from 'date-fns/locale';
import { toast } from 'sonner';

type ViewMode = 'day' | 'week' | 'month';

interface Project { id: string; name: string; }
interface Task { id: string; title: string; project_id: string; }

export default function Timesheets() {
  const { user, isAdmin, isManager } = useAuth();
  const { addManualEntry, deleteEntry } = useTimeTracking();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterProject, setFilterProject] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [users, setUsers] = useState<{ id: string; full_name: string | null }[]>([]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [entriesRes, projectsRes, tasksRes, usersRes] = await Promise.all([
        supabase
          .from('time_entries')
          .select('*, task:tasks(title), project:projects(name)')
          .order('start_time', { ascending: false }),
        supabase.from('projects').select('id, name'),
        supabase.from('tasks').select('id, title, project_id'),
        (isAdmin || isManager)
          ? supabase.from('profiles').select('id, full_name')
          : Promise.resolve({ data: [] }),
      ]);
      setEntries((entriesRes.data || []) as unknown as TimeEntry[]);
      setProjects(projectsRes.data || []);
      setTasks(tasksRes.data || []);
      setUsers(usersRes.data || []);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, isManager]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('time_entries_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_entries' }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const dateRange = useMemo(() => {
    const d = parseISO(selectedDate);
    if (viewMode === 'day') return { start: d, end: d };
    if (viewMode === 'week') return { start: startOfWeek(d, { weekStartsOn: 1 }), end: endOfWeek(d, { weekStartsOn: 1 }) };
    return { start: startOfMonth(d), end: endOfMonth(d) };
  }, [selectedDate, viewMode]);

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const entryDate = parseISO(e.start_time);
      const inRange = isWithinInterval(entryDate, { start: dateRange.start, end: dateRange.end });
      const matchesProject = filterProject === 'all' || e.project_id === filterProject;
      const matchesUser = filterUser === 'all' || e.user_id === filterUser;
      return inRange && matchesProject && matchesUser;
    });
  }, [entries, dateRange, filterProject, filterUser]);

  const totalMinutes = filteredEntries.reduce((s, e) => s + (e.duration_minutes || 0), 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalMins = totalMinutes % 60;

  const handleManualEntry = async (entry: any) => {
    await addManualEntry(entry);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await deleteEntry(id);
    fetchData();
  };

  const handleExport = (type: 'csv' | 'excel') => {
    const cols = [
      { key: 'start_time', label: 'Ημερομηνία', format: (v: string) => format(parseISO(v), 'dd/MM/yyyy') },
      { key: 'start_time', label: 'Έναρξη', format: (v: string) => format(parseISO(v), 'HH:mm') },
      { key: 'end_time', label: 'Λήξη', format: (v: string | null) => v ? format(parseISO(v), 'HH:mm') : '-' },
      { key: 'duration_minutes', label: 'Διάρκεια (λεπτά)' },
      { key: 'project', label: 'Έργο', format: (_: any, row: any) => row.project?.name || '-' },
      { key: 'task', label: 'Task', format: (_: any, row: any) => row.task?.title || '-' },
      { key: 'description', label: 'Σημειώσεις', format: (v: string | null) => v || '-' },
    ];
    const filename = `timesheets_${format(new Date(), 'yyyy-MM-dd')}`;
    if (type === 'csv') { exportToCSV(filteredEntries, cols, filename); }
    else { exportToExcel(filteredEntries, cols, filename); }
    toast.success(`Εξαγωγή ${type.toUpperCase()} ολοκληρώθηκε!`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Timer className="h-6 w-6 text-primary" />
            Timesheets
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Καταγραφή & διαχείριση χρόνου εργασίας</p>
        </div>
        <div className="flex items-center gap-2">
          <TimeEntryForm projects={projects} tasks={tasks} onSubmit={handleManualEntry} />
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')} className="gap-2">
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('excel')} className="gap-2">
            <Download className="h-4 w-4" /> Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="w-44"
        />
        <Select value={viewMode} onValueChange={(v: ViewMode) => setViewMode(v)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Ημέρα</SelectItem>
            <SelectItem value="week">Εβδομάδα</SelectItem>
            <SelectItem value="month">Μήνας</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Όλα τα έργα" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Όλα τα έργα</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {(isAdmin || isManager) && users.length > 0 && (
          <Select value={filterUser} onValueChange={setFilterUser}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Όλοι οι χρήστες" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Όλοι</SelectItem>
              {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || 'Χωρίς όνομα'}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Badge variant="secondary" className="text-sm gap-1.5 py-1.5 px-3">
          <Clock className="h-3.5 w-3.5" />
          Σύνολο: {totalHours}ω {totalMins}λ
        </Badge>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/50 bg-card/50">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ημερομηνία</TableHead>
              <TableHead>Ώρες</TableHead>
              <TableHead>Διάρκεια</TableHead>
              <TableHead>Έργο</TableHead>
              <TableHead>Task</TableHead>
              {(isAdmin || isManager) && <TableHead>Χρήστης</TableHead>}
              <TableHead>Σημειώσεις</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={(isAdmin || isManager) ? 8 : 7} className="text-center text-muted-foreground py-12">
                  Δεν βρέθηκαν καταχωρήσεις
                </TableCell>
              </TableRow>
            ) : filteredEntries.map(entry => (
              <TableRow key={entry.id}>
                <TableCell className="text-sm">
                  {format(parseISO(entry.start_time), 'dd MMM yyyy', { locale: el })}
                </TableCell>
                <TableCell className="text-sm font-mono">
                  {format(parseISO(entry.start_time), 'HH:mm')}
                  {' → '}
                  {entry.end_time ? format(parseISO(entry.end_time), 'HH:mm') : (
                    <span className="text-primary animate-pulse">τρέχει</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono">
                    {entry.is_running ? '...' : `${Math.floor(entry.duration_minutes / 60)}ω ${entry.duration_minutes % 60}λ`}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{(entry as any).project?.name || '-'}</TableCell>
                <TableCell className="text-sm">{(entry as any).task?.title || '-'}</TableCell>
                {(isAdmin || isManager) && (
                  <TableCell className="text-sm">{users.find(u => u.id === entry.user_id)?.full_name || '-'}</TableCell>
                )}
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                  {entry.description || '-'}
                </TableCell>
                <TableCell>
                  {!entry.is_running && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(entry.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
