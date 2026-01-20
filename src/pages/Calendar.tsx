import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useCalendarRealtime } from '@/hooks/useRealtimeSubscription';
import { Card, CardContent } from '@/components/ui/card';
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
  Package
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
  type: 'task' | 'tender' | 'deliverable' | 'project';
  status?: string;
  projectName?: string;
}

export default function CalendarPage() {
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

      // Fetch tenders with submission deadlines
      if (isAdmin || isManager) {
        const { data: tenders } = await supabase
          .from('tenders')
          .select('id, name, submission_deadline, stage')
          .gte('submission_deadline', startDate)
          .lte('submission_deadline', endDate);

        (tenders || []).forEach(tender => {
          if (tender.submission_deadline) {
            allEvents.push({
              id: tender.id,
              title: tender.name,
              date: tender.submission_deadline,
              type: 'tender',
              status: tender.stage
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
      case 'tender': return <FileText className="h-3 w-3" />;
      case 'deliverable': return <Package className="h-3 w-3" />;
      default: return null;
    }
  };

  const getEventColor = (type: CalendarEvent['type'], status?: string) => {
    if (status === 'completed' || status === 'won') {
      return 'bg-success/20 text-success border-success/30';
    }
    switch (type) {
      case 'task': return 'bg-primary/20 text-primary border-primary/30';
      case 'tender': return 'bg-warning/20 text-warning border-warning/30';
      case 'deliverable': return 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30';
      case 'project': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted';
    }
  };

  const weekDays = ['Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ', 'Κυρ'];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <CalendarDays className="h-8 w-8" />
            Ημερολόγιο
          </h1>
          <p className="text-muted-foreground mt-1">
            Deadlines και σημαντικές ημερομηνίες
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="w-40 text-center font-semibold">
            {format(currentDate, 'MMMM yyyy', { locale: el })}
          </div>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
            Σήμερα
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Calendar Grid */}
          <Card>
            <CardContent className="p-4">
              {/* Week day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map(day => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1">
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
                        "min-h-[80px] p-1 rounded-lg border text-left transition-colors",
                        isCurrentMonth ? "bg-card" : "bg-muted/30",
                        isToday(day) && "border-primary",
                        isSelected && "ring-2 ring-primary",
                        "hover:bg-muted/50"
                      )}
                    >
                      <div className={cn(
                        "text-sm font-medium mb-1",
                        !isCurrentMonth && "text-muted-foreground",
                        isToday(day) && "text-primary"
                      )}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map(event => (
                          <div
                            key={event.id}
                            className={cn(
                              "text-[10px] px-1 py-0.5 rounded truncate border",
                              getEventColor(event.type, event.status)
                            )}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-[10px] text-muted-foreground px-1">
                            +{dayEvents.length - 3} ακόμα
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Selected Day Events */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4">
                {selectedDate 
                  ? format(selectedDate, 'd MMMM yyyy', { locale: el })
                  : 'Επιλέξτε ημέρα'}
              </h3>

              {!selectedDate ? (
                <p className="text-muted-foreground text-sm">
                  Κάντε κλικ σε μια ημέρα για να δείτε τα γεγονότα
                </p>
              ) : selectedDateEvents.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Δεν υπάρχουν γεγονότα για αυτή την ημέρα
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedDateEvents.map(event => (
                    <div
                      key={event.id}
                      className={cn(
                        "p-3 rounded-lg border",
                        getEventColor(event.type, event.status)
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {getEventIcon(event.type)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{event.title}</p>
                          {event.projectName && (
                            <p className="text-xs opacity-70">{event.projectName}</p>
                          )}
                          <Badge variant="outline" className="mt-1 text-[10px]">
                            {event.type === 'task' && 'Task'}
                            {event.type === 'tender' && 'Διαγωνισμός'}
                            {event.type === 'deliverable' && 'Παραδοτέο'}
                            {event.type === 'project' && 'Έργο'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-primary/20 border border-primary/30" />
          <span>Tasks</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-warning/20 border border-warning/30" />
          <span>Διαγωνισμοί</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-purple-500/20 border border-purple-500/30" />
          <span>Παραδοτέα</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-success/20 border border-success/30" />
          <span>Ολοκληρωμένα</span>
        </div>
      </div>
    </div>
  );
}
