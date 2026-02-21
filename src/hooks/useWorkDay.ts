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

export function useWorkDay() {
  const { user, profile, company } = useAuth();
  const [schedule, setSchedule] = useState<WorkSchedule[]>([]);
  const [todayLog, setTodayLog] = useState<WorkDayLog | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [workStatus, setWorkStatusLocal] = useState<WorkStatus>('offline');
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const overtimeNotifiedRef = useRef(false);
  const nearEndNotifiedRef = useRef(false);
  const autoStartCheckedRef = useRef(false);

  const todayDow = getISODayOfWeek();
  const todaySchedule = schedule.find(s => s.day_of_week === todayDow);
  const isWorkingDay = todaySchedule?.is_working_day ?? false;
  const scheduledMinutes = todaySchedule
    ? timeToMinutes(todaySchedule.end_time) - timeToMinutes(todaySchedule.start_time)
    : 0;

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const isOvertime = todayLog && !todayLog.clock_out && scheduledMinutes > 0 && elapsedMinutes > scheduledMinutes;
  const isNearEnd = todayLog && !todayLog.clock_out && scheduledMinutes > 0 && !isOvertime && elapsedMinutes >= scheduledMinutes - 30;

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
        if (!(logRes.data as any).clock_out) {
          setWorkStatusLocal('online');
        }
      }
    } finally {
      setLoading(false);
    }
  }, [user, company]);

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
      toast.info('Το ωράριό σου λήγει σε 30 λεπτά');
    }
    if (isOvertime && !overtimeNotifiedRef.current) {
      overtimeNotifiedRef.current = true;
      const overMin = elapsedMinutes - scheduledMinutes;
      toast.warning(`Υπερωρία! Ξεπέρασες τις κανονικές ώρες κατά ${overMin} λεπτά`);
    }
  }, [elapsedMinutes, isNearEnd, isOvertime, scheduledMinutes, todayLog]);

  // Auto-start on first load if working day and no log
  useEffect(() => {
    if (loading || autoStartCheckedRef.current || !user || !company) return;
    autoStartCheckedRef.current = true;

    if (!todayLog && schedule.length > 0) {
      if (isWorkingDay) {
        clockIn(true);
      }
    }
  }, [loading, todayLog, schedule, isWorkingDay, user, company]);

  const clockIn = async (auto = false) => {
    if (!user || !company) return;
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
        // Already exists, just refresh
        await fetchData();
        return;
      }
      console.error('Clock in error:', error);
      toast.error('Σφάλμα κατά την έναρξη ημέρας');
      return;
    }
    setTodayLog(data as any);
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
    fetchSchedule: fetchData,
  };
}
