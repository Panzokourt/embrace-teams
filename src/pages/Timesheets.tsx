import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTimeTracking, TimeEntry } from '@/hooks/useTimeTracking';
import { TimeEntryForm } from '@/components/time-tracking/TimeEntryForm';
import { TimesheetFilters, DatePreset, GroupBy, AggregationLevel } from '@/components/time-tracking/TimesheetFilters';
import { TimesheetGridView } from '@/components/time-tracking/TimesheetGridView';
import { TimeEntriesListView } from '@/components/time-tracking/TimeEntriesListView';
import { AttendanceLog } from '@/components/time-tracking/AttendanceLog';
import { exportToCSV, exportToExcel } from '@/utils/exportUtils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Download, Timer, LayoutGrid, List, CalendarDays } from 'lucide-react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay, parseISO, isWithinInterval, subWeeks, subMonths, format } from 'date-fns';
import { toast } from 'sonner';

type ViewMode = 'grid' | 'list';

interface Project { id: string; name: string; }
interface Task { id: string; title: string; project_id: string; }

export default function Timesheets() {
  const { user, isAdmin, isManager } = useAuth();
  const { addManualEntry, deleteEntry, startTimer } = useTimeTracking();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<{ id: string; full_name: string | null }[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Filter state
  const [datePreset, setDatePreset] = useState<DatePreset>('this_week');
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
  });
  const [groupBy, setGroupBy] = useState<GroupBy>('project');
  const [aggregation, setAggregation] = useState<AggregationLevel>('day');
  const [filterProject, setFilterProject] = useState('all');
  const [filterUser, setFilterUser] = useState('all');

  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();
    switch (preset) {
      case 'today':
        setDateRange({ start: startOfDay(now), end: endOfDay(now) });
        break;
      case 'this_week':
        setDateRange({ start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) });
        break;
      case 'this_month':
        setDateRange({ start: startOfMonth(now), end: endOfMonth(now) });
        break;
      case 'last_week': {
        const lw = subWeeks(now, 1);
        setDateRange({ start: startOfWeek(lw, { weekStartsOn: 1 }), end: endOfWeek(lw, { weekStartsOn: 1 }) });
        break;
      }
      case 'last_month': {
        const lm = subMonths(now, 1);
        setDateRange({ start: startOfMonth(lm), end: endOfMonth(lm) });
        break;
      }
      case 'custom':
        break;
    }
  };

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
      
      const rawEntries = (entriesRes.data || []) as unknown as TimeEntry[];
      
      // If we have users, enrich entries with profile data
      const usersMap = new Map((usersRes.data || []).map((u: any) => [u.id, u]));
      const enrichedEntries = rawEntries.map(e => ({
        ...e,
        profile: usersMap.get(e.user_id) || { full_name: null },
      }));
      
      setEntries(enrichedEntries as TimeEntry[]);
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

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const entryDate = new Date(e.start_time);
      // Compare using local date strings to avoid UTC issues
      const entryDateStr = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}-${String(entryDate.getDate()).padStart(2, '0')}`;
      const startStr = `${dateRange.start.getFullYear()}-${String(dateRange.start.getMonth() + 1).padStart(2, '0')}-${String(dateRange.start.getDate()).padStart(2, '0')}`;
      const endStr = `${dateRange.end.getFullYear()}-${String(dateRange.end.getMonth() + 1).padStart(2, '0')}-${String(dateRange.end.getDate()).padStart(2, '0')}`;
      const inRange = entryDateStr >= startStr && entryDateStr <= endStr;
      const matchesProject = filterProject === 'all' || e.project_id === filterProject;
      const matchesUser = filterUser === 'all' || e.user_id === filterUser;
      return inRange && matchesProject && matchesUser;
    });
  }, [entries, dateRange, filterProject, filterUser]);

  const totalMinutes = filteredEntries.reduce((s, e) => s + (e.duration_minutes || 0), 0);

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
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Timer className="h-5 w-5 text-primary" />
            </div>
            Timesheets
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Καταγραφή & διαχείριση χρόνου εργασίας</p>
        </div>
      </div>

      <Tabs defaultValue="timesheets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timesheets" className="gap-1.5">
            <Timer className="h-3.5 w-3.5" />
            Timesheets
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            Παρουσίες
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timesheets" className="space-y-6">
          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none gap-1.5 h-8"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Timesheet
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none gap-1.5 h-8"
                onClick={() => setViewMode('list')}
              >
                <List className="h-3.5 w-3.5" />
                Λίστα
              </Button>
            </div>
            <TimeEntryForm projects={projects} tasks={tasks} onSubmit={handleManualEntry} />
            <Button variant="outline" size="sm" onClick={() => handleExport('csv')} className="gap-2">
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('excel')} className="gap-2">
              <Download className="h-4 w-4" /> Excel
            </Button>
          </div>

          <TimesheetFilters
            datePreset={datePreset}
            onDatePresetChange={handleDatePresetChange}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            aggregation={aggregation}
            onAggregationChange={setAggregation}
            filterProject={filterProject}
            onFilterProjectChange={setFilterProject}
            filterUser={filterUser}
            onFilterUserChange={setFilterUser}
            projects={projects}
            users={users}
            showUserFilter={isAdmin || isManager}
            totalMinutes={totalMinutes}
          />

          {viewMode === 'grid' ? (
            <TimesheetGridView
              entries={filteredEntries}
              dateRange={dateRange}
              groupBy={groupBy}
              aggregation={aggregation}
              onStartTimer={startTimer}
              onRefresh={fetchData}
            />
          ) : (
            <TimeEntriesListView
              entries={filteredEntries}
              users={users}
              showUserColumn={isAdmin || isManager}
              onDelete={handleDelete}
              onRefresh={fetchData}
            />
          )}
        </TabsContent>

        <TabsContent value="attendance">
          <AttendanceLog />
        </TabsContent>
      </Tabs>
    </div>
  );
}
