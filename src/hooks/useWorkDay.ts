import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type WorkStatus = 'online' | 'busy' | 'away' | 'on_leave' | 'offline';

interface WorkSchedule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working_day: boolean;
}

interface WorkDayLog {
  id: string;
  date: string;
  clock_in: string;
  clock_out: string | null;
  scheduled_minutes: number;
  actual_minutes: number;
  status: string;
  auto_started: boolean;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// JS getDay: 0=Sun, we want 0=Mon
function getISODayOfWeek(): number {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes → away
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

export function useWorkDay() {
  const { user, profile, company } = useAuth();
  const [schedule, setSchedule] = useState<WorkSchedule[]>([]);
  const [todayLog, setTodayLog] = useState<WorkDayLog | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [workStatus, setWorkStatusLocal] = useState<WorkStatus>('offline');
  const [loading, setLoading] = useState(true);
  const [hasActiveLeave, setHasActiveLeave] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const overtimeNotifiedRef = useRef(false);
  const nearEndNotifiedRef = useRef(false);
  const autoStartCheckedRef = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const idleTimerRef = useRef<ReturnType<typeof setInterval>>();
  const manualStatusRef = useRef(false); // true when user manually picked busy/away

  const todayDow = getISODayOfWeek();
  const todaySchedule = schedule.find(s => s.day_of_week === todayDow);
  const isWorkingDay = todaySchedule?.is_working_day ?? false;
  const scheduledMinutes = todaySchedule
    ? timeToMinutes(todaySchedule.end_time) - timeToMinutes(todaySchedule.start_time)
    : 0;

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const isOvertime = todayLog && !todayLog.clock_out && scheduledMinutes > 0 && elapsedMinutes > scheduledMinutes;
  const isNearEnd = todayLog && !todayLog.clock_out && scheduledMinutes > 0 && !isOvertime && elapsedMinutes >= scheduledMinutes - 30;

  // Check for active leave
  useEffect(() => {
    if (!user || !company) return;
    const today = new Date().toISOString().split('T')[0];
    supabase
      .from('leave_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .lte('start_date', today)
      .gte('end_date', today)
      .limit(1)
      .then(({ data }) => {
        const onLeave = !!(data && data.length > 0);
        setHasActiveLeave(onLeave);
        if (onLeave) {
          setWorkStatusLocal('on_leave');
          supabase.from('profiles').update({ work_status: 'on_leave' }).eq('id', user.id);
        }
      });
  }, [user, company]);

  // Activity tracking for auto away/online
  useEffect(() => {
    if (!user) return;

    const onActivity = () => {
      lastActivityRef.current = Date.now();
      // If was away automatically (not manual), switch back to online
      if (workStatus === 'away' && !manualStatusRef.current && todayLog && !todayLog.clock_out) {
        setWorkStatusLocal('online');
        supabase.from('profiles').update({ work_status: 'online' }).eq('id', user.id);
      }
    };

    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, onActivity, { passive: true }));

    // Check idle every 30s
    idleTimerRef.current = setInterval(() => {
      if (hasActiveLeave) return; // don't override on_leave
      if (manualStatusRef.current) return; // don't override manual busy/away
      if (!todayLog || todayLog.clock_out) return; // only when clocked in
      
      const idle = Date.now() - lastActivityRef.current;
      if (idle >= IDLE_TIMEOUT_MS && workStatus === 'online') {
        setWorkStatusLocal('away');
        supabase.from('profiles').update({ work_status: 'away' }).eq('id', user.id);
      }
    }, 30_000);

    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, onActivity));
      clearInterval(idleTimerRef.current);
    };
  }, [user, workStatus, todayLog, hasActiveLeave]);

  // Visibility change (tab hidden/visible)
  useEffect(() => {
    if (!user) return;
    const onVisibility = () => {
      if (hasActiveLeave || manualStatusRef.current) return;
      if (!todayLog || todayLog.clock_out) return;
      
      if (document.hidden) {
        // Tab hidden — mark away after short delay handled by idle timer
      } else {
        // Tab visible — mark online
        lastActivityRef.current = Date.now();
        if (workStatus === 'away') {
          setWorkStatusLocal('online');
          supabase.from('profiles').update({ work_status: 'online' }).eq('id', user.id);
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [user, workStatus, todayLog, hasActiveLeave]);

  // beforeunload → offline
  useEffect(() => {
    if (!user) return;
    const onUnload = () => {
      // Use sendBeacon for reliability
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`;
      const body = JSON.stringify({ work_status: 'offline' });
      navigator.sendBeacon?.(url); // best-effort; RLS may block without auth header
      // Fallback: status will be stale until next login
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [user]);

  // Fetch schedule + today log
  const fetchData = useCallback(async () => {
    if (!user || !company) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const [schedRes, logRes] = await Promise.all([
        supabase.from('work_schedules').select('*').eq('user_id', user.id),
        supabase.from('work_day_logs').select('*').eq('user_id', user.id).eq('date', today).maybeSingle()
      ]);
      if (schedRes.data) setSchedule(schedRes.data as any);
      if (logRes.data) {
        setTodayLog(logRes.data as any);
        if (!(logRes.data as any).clock_out && !hasActiveLeave) {
          setWorkStatusLocal('online');
        }
      }
    } finally {
      setLoading(false);
    }
  }, [user, company, hasActiveLeave]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Timer interval
  useEffect(() => {
    if (todayLog && !todayLog.clock_out) {
      const update = () => {
        const diff = Math.floor((Date.now() - new Date(todayLog.clock_in).getTime()) / 1000);
        setElapsedSeconds(Math.max(0, diff));
      };
      update();
      intervalRef.current = setInterval(update, 1000);
      return () => clearInterval(intervalRef.current);
    } else {
      setElapsedSeconds(0);
    }
  }, [todayLog]);

  // Notifications for near-end and overtime
  useEffect(() => {
    if (!todayLog || todayLog.clock_out || scheduledMinutes <= 0) return;

    if (isNearEnd && !nearEndNotifiedRef.current) {
      nearEndNotifiedRef.current = true;
      toast.info('Το ωράριό σου λήγει σε 30 λεπτά', {
        action: { label: 'Άνοιγμα', onClick: () => window.location.assign('/timesheets') },
      });
    }
    if (isOvertime && !overtimeNotifiedRef.current) {
      overtimeNotifiedRef.current = true;
      const overMin = elapsedMinutes - scheduledMinutes;
      toast.warning(`Υπερωρία! Ξεπέρασες τις κανονικές ώρες κατά ${overMin} λεπτά`, {
        action: { label: 'Δες ώρες', onClick: () => window.location.assign('/timesheets') },
      });
    }
  }, [elapsedMinutes, isNearEnd, isOvertime, scheduledMinutes, todayLog]);

  // Auto-start on first load if working day and no log and not on leave
  useEffect(() => {
    if (loading || autoStartCheckedRef.current || !user || !company) return;
    autoStartCheckedRef.current = true;

    if (hasActiveLeave) return; // Don't auto-start if on leave

    if (!todayLog && schedule.length > 0) {
      if (isWorkingDay) {
        clockIn(true);
      }
    }
  }, [loading, todayLog, schedule, isWorkingDay, user, company, hasActiveLeave]);

  const clockIn = async (auto = false) => {
    if (!user || !company) return;
    if (hasActiveLeave) {
      toast.info('Είσαι σε άδεια σήμερα');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase.from('work_day_logs').insert({
      user_id: user.id,
      company_id: company.id,
      date: today,
      clock_in: new Date().toISOString(),
      scheduled_minutes: scheduledMinutes,
      status: 'active',
      auto_started: auto,
    }).select().single();

    if (error) {
      if (error.code === '23505') {
        await fetchData();
        return;
      }
      console.error('Clock in error:', error);
      toast.error('Σφάλμα κατά την έναρξη ημέρας');
      return;
    }
    setTodayLog(data as any);
    manualStatusRef.current = false;
    await updateWorkStatus('online');
    nearEndNotifiedRef.current = false;
    overtimeNotifiedRef.current = false;

    const name = profile?.full_name?.split(' ')[0] || '';
    const time = new Date().toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
    toast.success(`Καλημέρα${name ? ' ' + name : ''}! Ώρα έναρξης: ${time}`);
  };

  const clockOut = async () => {
    if (!todayLog) return;
    const now = new Date();
    const actualMin = Math.floor((now.getTime() - new Date(todayLog.clock_in).getTime()) / 60000);
    const newStatus = actualMin > scheduledMinutes && scheduledMinutes > 0 ? 'overtime' : 'completed';

    const { error } = await supabase.from('work_day_logs')
      .update({
        clock_out: now.toISOString(),
        actual_minutes: actualMin,
        status: newStatus,
      })
      .eq('id', todayLog.id);

    if (error) {
      toast.error('Σφάλμα κατά τη λήξη ημέρας');
      return;
    }

    setTodayLog(prev => prev ? { ...prev, clock_out: now.toISOString(), actual_minutes: actualMin, status: newStatus } : null);
    manualStatusRef.current = false;
    await updateWorkStatus('offline');

    const hours = Math.floor(actualMin / 60);
    const mins = actualMin % 60;
    toast.success(`Καλό απόγευμα! Συνολικές ώρες σήμερα: ${hours}ω ${mins}λ`);
  };

  const updateWorkStatus = async (status: WorkStatus) => {
    if (!user) return;
    setWorkStatusLocal(status);
    await supabase.from('profiles').update({ work_status: status }).eq('id', user.id);
  };

  const setWorkStatus = (status: WorkStatus) => {
    // If user manually picks busy or away, don't auto-override
    manualStatusRef.current = (status === 'busy' || status === 'away');
    updateWorkStatus(status);
  };

  return {
    todayLog,
    schedule,
    isWorkingDay,
    clockIn: () => clockIn(false),
    clockOut,
    elapsedSeconds,
    elapsedMinutes,
    scheduledMinutes,
    isOvertime: !!isOvertime,
    isNearEnd: !!isNearEnd,
    workStatus,
    setWorkStatus,
    loading,
    isClockedIn: !!todayLog && !todayLog?.clock_out,
    hasActiveLeave,
    fetchSchedule: fetchData,
  };
}
