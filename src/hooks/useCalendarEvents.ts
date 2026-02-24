import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Helper to get company_id from auth context

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
      let query = supabase
        .from('calendar_events')
        .select('*')
        .eq('company_id', companyId)
        .order('start_time', { ascending: true });

      if (startDate) query = query.gte('start_time', startDate);
      if (endDate) query = query.lte('end_time', endDate);

      const { data, error } = await query;
      if (error) throw error;
      setEvents((data || []) as CalendarEvent[]);
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

      // Add attendees if provided
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
  }, [profile, toast]);

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
