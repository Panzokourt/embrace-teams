import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, SkipForward, ChevronDown, Sparkles, CheckCircle2 } from 'lucide-react';
import { useFocusMode } from '@/contexts/FocusContext';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import FocusSuccessAnimation from './FocusSuccessAnimation';
import { supabase } from '@/integrations/supabase/client';
import { useXPEngine } from '@/hooks/useXPEngine';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

const STATUS_OPTIONS: { value: string; label: string; color: string }[] = [
  { value: 'todo', label: 'To Do', color: 'bg-slate-400' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
  { value: 'review', label: 'Review', color: 'bg-amber-500' },
  { value: 'internal_review', label: 'Internal Review', color: 'bg-purple-500' },
  { value: 'client_review', label: 'Client Review', color: 'bg-indigo-500' },
  { value: 'completed', label: 'Completed', color: 'bg-emerald-500' },
];

interface FocusControlBarProps {
  /** When provided, renders an "Ask AI" button in the bar that calls this handler. */
  onAskAI?: () => void;
}

export default function FocusControlBar({ onAskAI }: FocusControlBarProps = {}) {
  const {
    currentTask, isPaused, setIsPaused, pomodoroMinutes,
    sessionStartTime, startSession, skipToNext, completeCurrentTask, upNextTasks,
  } = useFocusMode();
  const { activeTimer, startTimer, stopTimer, elapsed, formatElapsed } = useTimeTracking();
  const { awardTaskXP } = useXPEngine();
  const { user } = useAuth();

  const [showSuccess, setShowSuccess] = useState(false);
  const [pomodoroElapsed, setPomodoroElapsed] = useState(0);

  const totalSeconds = pomodoroMinutes * 60;
  const circumference = 2 * Math.PI * 34;
  const progress = Math.min(pomodoroElapsed / totalSeconds, 1);
  const dashOffset = circumference * (1 - progress);
  const ringColor = progress > 0.8 ? '#f59e0b' : '#3b82f6';

  // Pomodoro timer
  useEffect(() => {
    if (isPaused || !sessionStartTime) return;
    const tick = () => setPomodoroElapsed(Math.floor((Date.now() - sessionStartTime) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isPaused, sessionStartTime]);

  useEffect(() => {
    setPomodoroElapsed(0);
  }, [sessionStartTime]);

  const isTimerRunning = activeTimer?.is_running && activeTimer.task_id === currentTask?.id;

  const handlePlay = useCallback(async () => {
    if (!currentTask) return;
    if (isPaused) {
      if (!sessionStartTime) startSession();
      setIsPaused(false);
      await startTimer(currentTask.id, currentTask.project_id);
    } else if (!isTimerRunning) {
      if (!sessionStartTime) startSession();
      await startTimer(currentTask.id, currentTask.project_id);
    }
  }, [currentTask, isPaused, isTimerRunning, setIsPaused, startTimer, sessionStartTime, startSession]);

  const handlePause = useCallback(async () => {
    setIsPaused(true);
    if (isTimerRunning) await stopTimer();
  }, [setIsPaused, isTimerRunning, stopTimer]);

  const handleStatusChange = useCallback(async (newStatus: string) => {
    if (!currentTask) return;
    if (isTimerRunning) await stopTimer();

    // Update in DB
    await supabase.from('tasks').update({ status: newStatus as any }).eq('id', currentTask.id);

    // Award XP on completion
    if (newStatus === 'completed' && user?.id) {
      awardTaskXP(user.id, currentTask.id, currentTask.due_date);
      setShowSuccess(true);
    } else {
      // Just update local state and move on
      completeCurrentTask(); // reuses the "remove from queue" logic
    }
  }, [currentTask, isTimerRunning, stopTimer, completeCurrentTask]);

  const handleSkip = useCallback(async () => {
    if (isTimerRunning) await stopTimer();
    skipToNext();
  }, [isTimerRunning, stopTimer, skipToNext]);

  const handleSuccessComplete = useCallback(() => {
    setShowSuccess(false);
    // Task already updated in DB via handleStatusChange, just remove from queue
    completeCurrentTask();
  }, [completeCurrentTask]);

  const displayTime = isTimerRunning ? formatElapsed(elapsed) : formatElapsed(pomodoroElapsed);
  const remainingSeconds = Math.max(0, totalSeconds - pomodoroElapsed);
  const remainingMin = Math.floor(remainingSeconds / 60);
  const remainingSec = remainingSeconds % 60;

  const currentStatusOption = STATUS_OPTIONS.find(s => s.value === currentTask?.status);

  return (
    <>
      {showSuccess && <FocusSuccessAnimation onComplete={handleSuccessComplete} />}

      <div
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[55] flex items-center gap-4 rounded-full px-6 py-3 border transition-colors duration-500 ${
          isPaused && sessionStartTime
            ? 'bg-[#f59e0b]/10 border-[#f59e0b]/20 backdrop-blur-xl'
            : 'bg-white/10 border-white/10 backdrop-blur-xl'
        }`}
      >
        {/* Status Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 h-10 px-4 rounded-full bg-white/10 text-white hover:bg-white/15 transition-all">
              {currentStatusOption && (
                <span className={`w-2 h-2 rounded-full ${currentStatusOption.color}`} />
              )}
              <span className="text-xs font-medium">{currentStatusOption?.label || 'Status'}</span>
              <ChevronDown className="h-3 w-3 text-white/50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top" sideOffset={12} className="min-w-[160px]">
            {STATUS_OPTIONS.map(opt => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => handleStatusChange(opt.value)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <span className={`w-2 h-2 rounded-full ${opt.color}`} />
                <span>{opt.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Quick Complete — bold, glowing accent */}
        {currentTask && currentTask.status !== 'completed' && (
          <button
            onClick={() => handleStatusChange('completed')}
            className="h-10 px-5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/30 transition-all hover:scale-[1.03] active:scale-95"
            title="Σήμανση ως ολοκληρωμένο (C)"
          >
            <CheckCircle2 className="h-4 w-4" />
            Ολοκλήρωση
          </button>
        )}

        {/* Play/Pause with Progress Ring */}
        <div className="relative flex items-center justify-center">
          <svg className="absolute w-[76px] h-[76px] -rotate-90" viewBox="0 0 76 76">
            <circle cx="38" cy="38" r="34" fill="none" stroke="white" strokeOpacity="0.1" strokeWidth="3" />
            <circle
              cx="38" cy="38" r="34" fill="none"
              stroke={ringColor}
              strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
            />
          </svg>
          <button
            onClick={isTimerRunning || (!isPaused && pomodoroElapsed > 0) ? handlePause : handlePlay}
            className="relative w-16 h-16 rounded-full bg-white text-[#0f1219] flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg"
          >
            {isTimerRunning && !isPaused ? (
              <Pause className="h-7 w-7" />
            ) : (
              <Play className="h-7 w-7 ml-1" />
            )}
          </button>
        </div>

        {/* Skip */}
        <button
          onClick={handleSkip}
          disabled={upNextTasks.length === 0}
          className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all hover:scale-105 disabled:opacity-30 disabled:hover:scale-100"
          title="Επόμενο Task"
        >
          <SkipForward className="h-4 w-4" />
        </button>

        {/* Ask AI */}
        {onAskAI && (
          <button
            onClick={onAskAI}
            className="h-10 px-4 rounded-full bg-[#3b82f6]/15 hover:bg-[#3b82f6]/25 border border-[#3b82f6]/30 text-[#3b82f6] flex items-center gap-2 transition-all hover:scale-105"
            title="Ask AI για αυτό το task ( / )"
          >
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-medium">Ask AI</span>
          </button>
        )}

        {/* Time displays */}
        <div className="flex flex-col items-center ml-2 min-w-[80px]">
          <span className="text-white font-mono text-lg font-light">{displayTime}</span>
          {sessionStartTime && (
            <span className="text-white/40 text-xs font-mono">
              -{remainingMin.toString().padStart(2, '0')}:{remainingSec.toString().padStart(2, '0')}
            </span>
          )}
        </div>
      </div>
    </>
  );
}
