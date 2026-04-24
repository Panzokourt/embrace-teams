import { useEffect, useState, useCallback } from 'react';
import { Clock, Play, Square, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

interface TimeEntry {
  id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  description: string | null;
}

interface Props {
  taskId: string;
  projectId: string;
}

export default function FocusTimeTrackingSection({ taskId, projectId }: Props) {
  const { user } = useAuth();
  const { activeTimer, startTimer, stopTimer, elapsed, formatElapsed } = useTimeTracking();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const isRunning = activeTimer?.is_running && activeTimer?.task_id === taskId;

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('time_entries')
      .select('id, start_time, end_time, duration_minutes, description')
      .eq('task_id', taskId)
      .eq('user_id', user.id)
      .order('start_time', { ascending: false })
      .limit(10);
    setEntries((data || []) as TimeEntry[]);
  }, [taskId, user]);

  useEffect(() => { fetchEntries(); }, [fetchEntries, isRunning]);

  const totalSeconds = entries.reduce((sum, e) => sum + ((e.duration_minutes || 0) * 60), 0)
    + (isRunning ? elapsed : 0);

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const toggle = async () => {
    setLoading(true);
    if (isRunning) await stopTimer();
    else await startTimer(taskId, projectId);
    setLoading(false);
    setTimeout(fetchEntries, 500);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-white/40">
        <Clock className="h-4 w-4" />
        <h3 className="text-xs font-semibold uppercase tracking-widest">
          Χρόνος {totalSeconds > 0 && <span className="text-white/30 normal-case font-normal">· {fmt(totalSeconds)}</span>}
        </h3>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            disabled={loading}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              isRunning
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300'
                : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300'
            }`}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" />
              : isRunning ? <Square className="h-4 w-4" />
              : <Play className="h-4 w-4 ml-0.5" />}
          </button>
          <div className="flex-1">
            <p className="text-white/50 text-xs">{isRunning ? 'Καταγράφεται…' : 'Έναρξη χρονοχρέωσης'}</p>
            {isRunning && (
              <p className="text-white text-lg font-mono">{formatElapsed(elapsed)}</p>
            )}
          </div>
        </div>

        {entries.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-white/5">
            <p className="text-white/40 text-[11px] uppercase tracking-wider">Πρόσφατα sessions</p>
            {entries.slice(0, 5).map(e => (
              <div key={e.id} className="flex items-center justify-between text-xs py-0.5">
                <span className="text-white/65">
                  {format(new Date(e.start_time), 'd MMM, HH:mm', { locale: el })}
                </span>
                <span className="text-white/85 font-mono">
                  {e.duration_minutes ? fmt(e.duration_minutes * 60) : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
