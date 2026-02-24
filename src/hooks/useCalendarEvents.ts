import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface CalendarEvent {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  location: string | null;
  video_link: string | null;
  color: string | null;
  created_by: string | null;
  project_id: string | null;
  client_id: string | null;
  recurrence_rule: string | null;
  google_event_id: string | null;
  created_at: string;
  updated_at: string;
  // Virtual flag for items from other tables
  _source?: 'calendar' | 'task' | 'deliverable' | 'project';
}

export interface CalendarEventAttendee {
  id: string;
  event_id: string;
  user_id: string;
  status: string;
  created_at: string;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  event_type?: string;
  start_time: string;
  end_time: string;
  all_day?: boolean;
  location?: string;
  video_link?: string;
  color?: string;
  project_id?: string;
  client_id?: string;
  attendee_ids?: string[];
}

export function useCalendarEvents() {
  const { profile, company } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const companyId = company?.id;
  const userId = profile?.id;

  const fetchEvents = useCallback(async (startDate?: string, endDate?: string) => {
    if (!companyId) return;
    setLoading(true);
    try {
      // 1. Calendar events from DB
      let query = supabase
        .from('calendar_events')
        .select('*')
        .eq('company_id', companyId)
        .order('start_time', { ascending: true });

      if (startDate) query = query.gte('start_time', startDate);
      if (endDate) query = query.lte('end_time', endDate);

      const { data: calEvents, error: calError } = await query;
      if (calError) console.error('Calendar events error:', calError);

      // 2. Tasks with due_date
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, due_date, status, priority, project_id')
        .not('due_date', 'is', null);

      // 3. Deliverables with due_date
      const { data: deliverables } = await supabase
        .from('deliverables')
        .select('id, name, due_date, project_id, completed');

      // 4. Projects with end_date (deadlines)
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, end_date, status, client_id')
        .not('end_date', 'is', null);

      // Build unified list
      const allEvents: CalendarEvent[] = [];

      // Calendar events
      (calEvents || []).forEach((ev: any) => {
        allEvents.push({ ...ev, _source: 'calendar' });
      });

      // Tasks as events
      (tasks || []).forEach((t: any) => {
        if (!t.due_date) return;
        const dueDate = new Date(t.due_date);
        allEvents.push({
          id: `task-${t.id}`,
          company_id: companyId,
          title: t.title,
          description: null,
          event_type: 'task',
          start_time: dueDate.toISOString(),
          end_time: dueDate.toISOString(),
          all_day: true,
          location: null,
          video_link: null,
          color: t.priority === 'high' ? '#EF4444' : t.priority === 'medium' ? '#F59E0B' : '#3B82F6',
          created_by: null,
          project_id: t.project_id,
          client_id: null,
          recurrence_rule: null,
          google_event_id: null,
          created_at: '',
          updated_at: '',
          _source: 'task',
        });
      });

      // Deliverables as events
      (deliverables || []).forEach((d: any) => {
        if (!d.due_date) return;
        const dueDate = new Date(d.due_date);
        allEvents.push({
          id: `del-${d.id}`,
          company_id: companyId,
          title: `📦 ${d.name}`,
          description: null,
          event_type: 'deliverable',
          start_time: dueDate.toISOString(),
          end_time: dueDate.toISOString(),
          all_day: true,
          location: null,
          video_link: null,
          color: d.completed ? '#10B981' : '#8B5CF6',
          created_by: null,
          project_id: d.project_id,
          client_id: null,
          recurrence_rule: null,
          google_event_id: null,
          created_at: '',
          updated_at: '',
          _source: 'deliverable',
        });
      });

      // Projects deadlines
      (projects || []).forEach((p: any) => {
        if (!p.end_date) return;
        const endDate = new Date(p.end_date);
        allEvents.push({
          id: `proj-${p.id}`,
          company_id: companyId,
          title: `🏗 ${p.name}`,
          description: null,
          event_type: 'project',
          start_time: endDate.toISOString(),
          end_time: endDate.toISOString(),
          all_day: true,
          location: null,
          video_link: null,
          color: '#6366F1',
          created_by: null,
          project_id: p.id,
          client_id: p.client_id,
          recurrence_rule: null,
          google_event_id: null,
          created_at: '',
          updated_at: '',
          _source: 'project',
        });
      });

      // Sort by start_time
      allEvents.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      setEvents(allEvents);
    } catch (err: any) {
      console.error('Error fetching calendar events:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const createEvent = useCallback(async (input: CreateEventInput) => {
    if (!companyId || !userId) return null;
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          company_id: companyId,
          created_by: userId,
          title: input.title,
          description: input.description || null,
          event_type: input.event_type || 'meeting',
          start_time: input.start_time,
          end_time: input.end_time,
          all_day: input.all_day || false,
          location: input.location || null,
          video_link: input.video_link || null,
          color: input.color || null,
          project_id: input.project_id || null,
          client_id: input.client_id || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (input.attendee_ids?.length && data) {
        const attendees = input.attendee_ids.map(uid => ({
          event_id: data.id,
          user_id: uid,
          status: uid === userId ? 'accepted' : 'pending',
        }));
        await supabase.from('calendar_event_attendees').insert(attendees);
      }

      toast({ title: 'Το event δημιουργήθηκε' });
      return data as CalendarEvent;
    } catch (err: any) {
      toast({ title: 'Σφάλμα', description: err.message, variant: 'destructive' });
      return null;
    }
  }, [companyId, userId, toast]);

  const updateEvent = useCallback(async (id: string, updates: Partial<CalendarEvent>) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Το event ενημερώθηκε' });
      return true;
    } catch (err: any) {
      toast({ title: 'Σφάλμα', description: err.message, variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const deleteEvent = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Το event διαγράφηκε' });
      return true;
    } catch (err: any) {
      toast({ title: 'Σφάλμα', description: err.message, variant: 'destructive' });
      return false;
    }
  }, [toast]);

  return { events, loading, fetchEvents, createEvent, updateEvent, deleteEvent };
}
