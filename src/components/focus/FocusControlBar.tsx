import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, Square, SkipForward } from 'lucide-react';
import { useFocusMode } from '@/contexts/FocusContext';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import FocusSuccessAnimation from './FocusSuccessAnimation';

export default function FocusControlBar() {
  const {
    currentTask, isPaused, setIsPaused, pomodoroMinutes,
    sessionStartTime, skipToNext, completeCurrentTask, upNextTasks,
  } = useFocusMode();
  const { activeTimer, startTimer, stopTimer, elapsed, formatElapsed } = useTimeTracking();

  const [showSuccess, setShowSuccess] = useState(false);
  const [pomodoroElapsed, setPomodoroElapsed] = useState(0);

  const totalSeconds = pomodoroMinutes * 60;
  const circumference = 2 * Math.PI * 36;
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

  // Reset pomodoro when session starts
  useEffect(() => {
    setPomodoroElapsed(0);
  }, [sessionStartTime]);

  const isTimerRunning = activeTimer?.is_running && activeTimer.task_id === currentTask?.id;

  const handlePlay = useCallback(async () => {
    if (!currentTask) return;
    if (isPaused) {
      setIsPaused(false);
      // Resume timer
      await startTimer(currentTask.id, currentTask.project_id);
    } else if (!isTimerRunning) {
      await startTimer(currentTask.id, currentTask.project_id);
    }
  }, [currentTask, isPaused, isTimerRunning, setIsPaused, startTimer]);

  const handlePause = useCallback(async () => {
    setIsPaused(true);
    if (isTimerRunning) await stopTimer();
  }, [setIsPaused, isTimerRunning, stopTimer]);

  const handleFinish = useCallback(async () => {
    if (isTimerRunning) await stopTimer();
    setShowSuccess(true);
  }, [isTimerRunning, stopTimer]);

  const handleSkip = useCallback(async () => {
    if (isTimerRunning) await stopTimer();
    skipToNext();
  }, [isTimerRunning, stopTimer, skipToNext]);

  const handleSuccessComplete = useCallback(() => {
    setShowSuccess(false);
    completeCurrentTask();
  }, [completeCurrentTask]);

  const displayTime = isTimerRunning ? formatElapsed(elapsed) : formatElapsed(pomodoroElapsed);
  const remainingSeconds = Math.max(0, totalSeconds - pomodoroElapsed);
  const remainingMin = Math.floor(remainingSeconds / 60);
  const remainingSec = remainingSeconds % 60;

  return (
    <>
      {showSuccess && <FocusSuccessAnimation onComplete={handleSuccessComplete} />}

      <div
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[55] flex items-center gap-4 rounded-full px-6 py-3 border transition-colors duration-500 ${
          isPaused
            ? 'bg-[#f59e0b]/10 border-[#f59e0b]/20 backdrop-blur-xl'
            : 'bg-white/10 border-white/10 backdrop-blur-xl'
        }`}
      >
        {/* Stop/Finish */}
        <button
          onClick={handleFinish}
          className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all hover:scale-105"
          title="Ολοκλήρωση Task"
        >
          <Square className="h-4 w-4" />
        </button>

        {/* Play/Pause with Progress Ring */}
        <div className="relative">
          <svg className="absolute -inset-1 w-[82px] h-[82px] -rotate-90" viewBox="0 0 82 82">
            <circle cx="41" cy="41" r="36" fill="none" stroke="white" strokeOpacity="0.1" strokeWidth="3" />
            <circle
              cx="41" cy="41" r="36" fill="none"
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

        {/* Time displays */}
        <div className="flex flex-col items-center ml-2 min-w-[80px]">
          <span className="text-white font-mono text-lg font-light">{displayTime}</span>
          <span className="text-white/40 text-xs font-mono">
            -{remainingMin.toString().padStart(2, '0')}:{remainingSec.toString().padStart(2, '0')}
          </span>
        </div>
      </div>
    </>
  );
}
