import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CalendarZoomView } from '@/components/calendar/CalendarZoomView';
import { CalendarFilterTabs, CalendarFilter } from '@/components/calendar/CalendarFilterTabs';
import { CalendarEventDialog } from '@/components/calendar/CalendarEventDialog';
import { CalendarBacklog } from '@/components/calendar/CalendarBacklog';
import { useCalendarEvents, CalendarEvent, CreateEventInput } from '@/hooks/useCalendarEvents';
import { Button } from '@/components/ui/button';
import { Plus, PanelRight } from 'lucide-react';
import { startOfYear, endOfYear } from 'date-fns';

export default function CalendarHub() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = (searchParams.get('tab') || 'all') as CalendarFilter;
  const [activeFilter, setActiveFilter] = useState<CalendarFilter>(tabParam);
  const [backlogOpen, setBacklogOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | undefined>();
  const [defaultHour, setDefaultHour] = useState<number | undefined>();
  const [defaultMinutes, setDefaultMinutes] = useState<number | undefined>();

  const { events, loading, fetchEvents, createEvent, updateEvent, deleteEvent } = useCalendarEvents();

  // Fetch events for the current year (expand as needed)
  useEffect(() => {
    const now = new Date();
    fetchEvents(
      startOfYear(now).toISOString(),
      endOfYear(now).toISOString()
    );
  }, [fetchEvents]);

  // Filter events by type
  const filteredEvents = useMemo(() => {
    if (activeFilter === 'all' || activeFilter === 'backlog') return events;
    const sourceMap: Record<string, string[]> = {
      campaigns: ['campaign'],
      tasks: ['task'],
      projects: ['project', 'deliverable'],
      events: ['event', 'pr', 'meeting', 'call', 'reminder'],
    };
    const sources = sourceMap[activeFilter] || [];
    return events.filter(e => {
      // Check both event_type and _source
      return sources.includes(e.event_type) || sources.includes(e._source || '');
    });
  }, [events, activeFilter]);

  const handleFilterChange = (f: CalendarFilter) => {
    setActiveFilter(f);
    if (f === 'backlog') {
      setBacklogOpen(true);
    } else {
      setBacklogOpen(false);
      setSearchParams({ tab: f });
    }
  };

  const handleCreateEvent = useCallback((date: Date, hour?: number, minutes?: number) => {
    setEditEvent(null);
    setDefaultDate(date);
    setDefaultHour(hour);
    setDefaultMinutes(minutes);
    setDialogOpen(true);
  }, []);

  const handleEventClick = useCallback((event: CalendarEvent) => {
    // Navigate to detail page for tasks/projects/deliverables
    if (event._source === 'task') {
      const realId = event.id.replace('task-', '');
      navigate(`/tasks/${realId}`);
      return;
    }
    if (event._source === 'project') {
      const realId = event.id.replace('proj-', '');
      navigate(`/projects/${realId}`);
      return;
    }
    if (event._source === 'deliverable') {
      const realId = event.id.replace('del-', '');
      // Deliverables live under their project
      if (event.project_id) {
        navigate(`/projects/${event.project_id}`);
      }
      return;
    }
    // Calendar events open the edit dialog
    setEditEvent(event);
    setDialogOpen(true);
  }, [navigate]);

  const handleSave = useCallback(async (input: CreateEventInput) => {
    if (editEvent) {
      await updateEvent(editEvent.id, {
        title: input.title,
        description: input.description || null,
        event_type: input.event_type || 'meeting',
        start_time: input.start_time,
        end_time: input.end_time,
        all_day: input.all_day || false,
        location: input.location || null,
        video_link: input.video_link || null,
        color: input.color || null,
      });
    } else {
      await createEvent(input);
    }
    // Refresh
    const now = new Date();
    fetchEvents(startOfYear(now).toISOString(), endOfYear(now).toISOString());
  }, [editEvent, createEvent, updateEvent, fetchEvents]);

  const handleDelete = useCallback(async (event: CalendarEvent) => {
    if (confirm('Διαγραφή αυτού του event;')) {
      await deleteEvent(event.id);
      const now = new Date();
      fetchEvents(startOfYear(now).toISOString(), endOfYear(now).toISOString());
    }
  }, [deleteEvent, fetchEvents]);

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight">Ημερολόγιο</h1>
          <CalendarFilterTabs active={activeFilter} onChange={handleFilterChange} />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => setBacklogOpen(!backlogOpen)}
          >
            <PanelRight className="h-4 w-4 mr-1.5" />
            Backlog
          </Button>
          <Button
            size="sm"
            className="h-8"
            onClick={() => handleCreateEvent(new Date())}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Νέο Event
          </Button>
        </div>
      </div>

      {/* Calendar body */}
      <div className="flex-1 relative overflow-hidden">
        <CalendarZoomView
          events={filteredEvents}
          onEventClick={handleEventClick}
          onCreateEvent={handleCreateEvent}
          onEventContextMenu={(e, event) => {
            e.preventDefault();
            // For now, just open edit dialog on right-click
            handleEventClick(event);
          }}
        />
      </div>

      {/* Event Dialog */}
      <CalendarEventDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditEvent(null); }}
        onSave={handleSave}
        editEvent={editEvent}
        defaultDate={defaultDate}
        defaultHour={defaultHour}
        defaultMinutes={defaultMinutes}
      />

      {/* Backlog Panel */}
      <CalendarBacklog open={backlogOpen} onClose={() => setBacklogOpen(false)} />
    </div>
  );
}
