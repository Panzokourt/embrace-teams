import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useXPEngine } from '@/hooks/useXPEngine';
import { toast } from 'sonner';

export interface TimeEntry {
  id: string;
  user_id: string;
  task_id: string | null;
  project_id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number;
  description: string | null;
  is_running: boolean;
  created_at: string;
  updated_at: string;
  task?: { title: string } | null;
  project?: { name: string } | null;
  profile?: { full_name: string | null } | null;
}

export function useTimeTracking() {
  const { user } = useAuth();
  const { awardTimeXP } = useXPEngine();
  const [activeTimer, setActiveTimer] = useState<TimeEntry | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch active timer on mount
  useEffect(() => {
    if (!user) return;
    fetchActiveTimer();
  }, [user]);

  // Live elapsed counter
  useEffect(() => {
    if (activeTimer?.is_running) {
      const start = new Date(activeTimer.start_time).getTime();
      const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
      tick();
      intervalRef.current = setInterval(tick, 1000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    } else {
      setElapsed(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [activeTimer]);

  const fetchActiveTimer = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('time_entries')
      .select('*, task:tasks(title), project:projects(name)')
      .eq('user_id', user.id)
      .eq('is_running', true)
      .maybeSingle();
    setActiveTimer(data as TimeEntry | null);
  }, [user]);

  const startTimer = useCallback(async (taskId: string, projectId: string) => {
    if (!user) return;
    // Stop any running timer first
    if (activeTimer?.is_running) {
      await stopTimer();
    }
    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        user_id: user.id,
        task_id: taskId,
        project_id: projectId,
        is_running: true,
        start_time: new Date().toISOString(),
      })
      .select('*, task:tasks(title), project:projects(name)')
      .single();
    if (error) {
      toast.error('Σφάλμα εκκίνησης timer');
      console.error(error);
      return;
    }
    setActiveTimer(data as TimeEntry);
    toast.success('Timer ξεκίνησε');
  }, [user, activeTimer]);

  const stopTimer = useCallback(async (description?: string) => {
    if (!activeTimer) return;
    const endTime = new Date();
    const startTime = new Date(activeTimer.start_time);
    const durationMinutes = Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / 60000));

    const { error } = await supabase
      .from('time_entries')
      .update({
        end_time: endTime.toISOString(),
        duration_minutes: durationMinutes,
        is_running: false,
        description: description || null,
      })
      .eq('id', activeTimer.id);

    if (error) {
      toast.error('Σφάλμα διακοπής timer');
      console.error(error);
      return;
    }

    // Update task actual_hours
    if (activeTimer.task_id) {
      const { data: entries } = await supabase
        .from('time_entries')
        .select('duration_minutes')
        .eq('task_id', activeTimer.task_id)
        .eq('is_running', false);
      
      const totalMinutes = (entries || []).reduce((s, e) => s + (e.duration_minutes || 0), 0) + durationMinutes;
      const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

      await supabase
        .from('tasks')
        .update({ actual_hours: totalHours })
        .eq('id', activeTimer.task_id);
    }

    setActiveTimer(null);
    toast.success(`Timer σταμάτησε (${durationMinutes} λεπτά)`);

    // Award XP for time logged (caps applied inside engine)
    if (user) {
      awardTimeXP(user.id, durationMinutes, activeTimer.task_id || undefined).catch(() => {});
    }
  }, [activeTimer, awardTimeXP, user]);

  const addManualEntry = useCallback(async (entry: {
    task_id: string | null;
    project_id: string;
    start_time: string;
    end_time: string;
    description?: string;
  }) => {
    if (!user) return;
    const start = new Date(entry.start_time);
    const end = new Date(entry.end_time);
    const durationMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));

    const { error } = await supabase
      .from('time_entries')
      .insert({
        user_id: user.id,
        task_id: entry.task_id,
        project_id: entry.project_id,
        start_time: entry.start_time,
        end_time: entry.end_time,
        duration_minutes: durationMinutes,
        description: entry.description || null,
        is_running: false,
      });

    if (error) {
      toast.error('Σφάλμα καταχώρησης');
      console.error(error);
      return;
    }

    // Update task actual_hours
    if (entry.task_id) {
      const { data: entries } = await supabase
        .from('time_entries')
        .select('duration_minutes')
        .eq('task_id', entry.task_id)
        .eq('is_running', false);
      
      const totalMinutes = (entries || []).reduce((s, e) => s + (e.duration_minutes || 0), 0);
      const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

      await supabase
        .from('tasks')
        .update({ actual_hours: totalHours })
        .eq('id', entry.task_id);
    }

    toast.success('Καταχώρηση χρόνου αποθηκεύτηκε');

    if (user) {
      awardTimeXP(user.id, durationMinutes, entry.task_id || undefined).catch(() => {});
    }
  }, [user, awardTimeXP]);

  const deleteEntry = useCallback(async (entryId: string) => {
    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', entryId);
    if (error) {
      toast.error('Σφάλμα διαγραφής');
      return;
    }
    toast.success('Καταχώρηση διαγράφηκε');
  }, []);

  const formatElapsed = useCallback((seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  return {
    activeTimer,
    elapsed,
    formatElapsed,
    startTimer,
    stopTimer,
    addManualEntry,
    deleteEntry,
    fetchActiveTimer,
  };
}
