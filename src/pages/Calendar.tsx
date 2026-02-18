import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useCalendarRealtime } from '@/hooks/useRealtimeSubscription';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  CheckSquare,
  FileText,
  Package,
  FolderKanban
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'task' | 'deliverable' | 'project';
  status?: string;
  projectName?: string;
}

interface CalendarPageProps {
  embedded?: boolean;
}

export default function CalendarPage({ embedded = false }: CalendarPageProps) {
  const { isAdmin, isManager } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');

      const allEvents: CalendarEvent[] = [];

      // Fetch tasks with due dates
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, due_date, status, project:projects(name)')
        .gte('due_date', startDate)
        .lte('due_date', endDate);

      (tasks || []).forEach(task => {
        if (task.due_date) {
          allEvents.push({
            id: task.id,
            title: task.title,
            date: task.due_date,
            type: 'task',
            status: task.status,
            projectName: task.project?.name
          });
        }
      });

      // Fetch projects with submission_deadline (pipeline items)
      if (isAdmin || isManager) {
        const { data: pipelineProjects } = await supabase
          .from('projects')
          .select('id, name, submission_deadline, status')
          .in('status', ['lead', 'proposal', 'negotiation'])
          .not('submission_deadline', 'is', null)
          .gte('submission_deadline', startDate)
          .lte('submission_deadline', endDate);

        (pipelineProjects || []).forEach(proj => {
          if (proj.submission_deadline) {
            allEvents.push({
              id: proj.id + '-deadline',
              title: `📋 ${proj.name}`,
              date: proj.submission_deadline,
              type: 'project',
              status: proj.status
            });
          }
        });
      }

      // Fetch deliverables with due dates
      const { data: deliverables } = await supabase
        .from('deliverables')
        .select('id, name, due_date, completed, project:projects(name)')
        .gte('due_date', startDate)
        .lte('due_date', endDate);

      (deliverables || []).forEach(del => {
        if (del.due_date) {
          allEvents.push({
            id: del.id,
            title: del.name,
            date: del.due_date,
            type: 'deliverable',
            status: del.completed ? 'completed' : 'pending',
            projectName: del.project?.name
          });
        }
      });

      // Fetch projects with end dates
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, end_date, status')
        .gte('end_date', startDate)
        .lte('end_date', endDate);

      (projects || []).forEach(project => {
        if (project.end_date) {
          allEvents.push({
            id: project.id,
            title: `${project.name} - Λήξη`,
            date: project.end_date,
            type: 'project',
            status: project.status
          });
        }
      });

      setEvents(allEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Σφάλμα κατά τη φόρτωση γεγονότων');
    } finally {
      setLoading(false);
    }
  }, [currentDate, isAdmin, isManager]);

  // Subscribe to realtime updates
  useCalendarRealtime(fetchEvents);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);


  const daysInMonth = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach(event => {
      const dateKey = event.date;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(event);
    });
    return map;
  }, [events]);

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return eventsByDate.get(dateKey) || [];
  }, [selectedDate, eventsByDate]);

  const getEventIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'task': return <CheckSquare className="h-3 w-3" />;
      case 'deliverable': return <Package className="h-3 w-3" />;
      case 'project': return <FolderKanban className="h-3 w-3" />;
      default: return null;
    }
  };

  const getEventColor = (type: CalendarEvent['type'], status?: string) => {
    if (status === 'completed' || status === 'won') {
      return 'bg-success/15 text-success border-success/20';
    }
    switch (type) {
      case 'task': return 'bg-primary/15 text-primary border-primary/20';
      case 'deliverable': return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'project': return 'bg-warning/15 text-warning border-warning/20';
      default: return 'bg-secondary';
    }
  };

  const weekDays = ['Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ', 'Κυρ'];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-primary" />
            </span>
            Ημερολόγιο
          </h1>
          <p className="text-muted-foreground mt-1 text-sm ml-[52px]">
            Deadlines και σημαντικές ημερομηνίες
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-9 w-9 border-border/50 hover:bg-secondary/80"
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="w-40 text-center font-semibold text-foreground">
            {format(currentDate, 'MMMM yyyy', { locale: el })}
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-9 w-9 border-border/50 hover:bg-secondary/80"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            className="border-border/50 hover:bg-secondary/80"
            onClick={() => setCurrentDate(new Date())}
          >
            Σήμερα
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
          <p className="text-sm text-muted-foreground mt-3">Φόρτωση...</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Calendar Grid */}
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-soft animate-fade-in">
            {/* Week day headers */}
            <div className="grid grid-cols-7 gap-1.5 mb-3">
              {weekDays.map(day => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground/60 uppercase tracking-wider py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {daysInMonth.map((day, idx) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayEvents = eventsByDate.get(dateKey) || [];
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isSelected = selectedDate && isSameDay(day, selectedDate);

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "min-h-[88px] p-2 rounded-xl border text-left transition-all duration-200 ease-apple",
                      isCurrentMonth ? "bg-card hover:bg-secondary/50" : "bg-secondary/20 opacity-50",
                      isToday(day) && "border-primary/50 bg-primary/[0.03]",
                      isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                      !isSelected && "border-border/30 hover:border-border/50"
                    )}
                  >
                    <div className={cn(
                      "text-sm font-medium mb-1.5",
                      !isCurrentMonth && "text-muted-foreground/50",
                      isToday(day) && "text-primary font-semibold"
                    )}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map(event => (
                        <div
                          key={event.id}
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-md truncate border font-medium",
                            getEventColor(event.type, event.status)
                          )}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-muted-foreground/60 px-1 font-medium">
                          +{dayEvents.length - 3} ακόμα
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Events */}
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-soft animate-fade-in h-fit" style={{ animationDelay: '100ms' }}>
            <h3 className="font-semibold mb-4 text-foreground">
              {selectedDate 
                ? format(selectedDate, 'd MMMM yyyy', { locale: el })
                : 'Επιλέξτε ημέρα'}
            </h3>

            {!selectedDate ? (
              <p className="text-muted-foreground/70 text-sm">
                Κάντε κλικ σε μια ημέρα για να δείτε τα γεγονότα
              </p>
            ) : selectedDateEvents.length === 0 ? (
              <div className="text-center py-8">
                <div className="h-12 w-12 rounded-xl bg-secondary/50 flex items-center justify-center mx-auto mb-3">
                  <CalendarDays className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground/70 text-sm">
                  Δεν υπάρχουν γεγονότα
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {selectedDateEvents.map((event, index) => (
                  <div
                    key={event.id}
                    className={cn(
                      "p-3 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft cursor-pointer",
                      getEventColor(event.type, event.status)
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 opacity-70">{getEventIcon(event.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{event.title}</p>
                        {event.projectName && (
                          <p className="text-xs opacity-60 mt-0.5">{event.projectName}</p>
                        )}
                        <Badge variant="outline" className="mt-2 text-[10px] border-current/20 bg-transparent">
                          {event.type === 'task' && 'Task'}
                          {event.type === 'deliverable' && 'Παραδοτέο'}
                          {event.type === 'project' && 'Έργο'}
                          {event.type === 'project' && 'Έργο'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-6 text-sm animate-fade-in" style={{ animationDelay: '150ms' }}>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-md bg-primary/20 border border-primary/30" />
          <span className="text-muted-foreground">Tasks</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-md bg-warning/20 border border-warning/30" />
          <span className="text-muted-foreground">Pipeline</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-md bg-purple-500/20 border border-purple-500/30" />
          <span className="text-muted-foreground">Παραδοτέα</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-md bg-success/20 border border-success/30" />
          <span className="text-muted-foreground">Ολοκληρωμένα</span>
        </div>
      </div>
    </div>
  );
}
