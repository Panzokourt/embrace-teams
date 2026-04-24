import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfDay, endOfDay } from 'date-fns';

interface FocusTask {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  start_date: string | null;
  progress: number | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  assigned_to: string | null;
  project_id: string;
  project_name?: string;
  task_category?: string | null;
}

interface FocusContextValue {
  isActive: boolean;
  isPaused: boolean;
  currentTask: FocusTask | null;
  upNextTasks: FocusTask[];
  pomodoroMinutes: number;
  sessionStartTime: number | null;
  enterFocus: (taskId?: string) => Promise<void>;
  exitFocus: () => void;
  startSession: () => void;
  setCurrentTaskById: (id: string) => void;
  skipToNext: () => void;
  completeCurrentTask: () => Promise<void>;
  setIsPaused: (v: boolean) => void;
  reorderTasks: (taskIds: string[]) => void;
  /** Optimistically patch + persist current task to DB. */
  updateCurrentTask: (patch: Partial<FocusTask>) => Promise<void>;
  /** Re-fetch current task from DB and merge into queue. */
  refreshCurrentTask: () => Promise<void>;
}

const FocusContext = createContext<FocusContextValue | null>(null);

const NOOP_CONTEXT: FocusContextValue = {
  isActive: false, isPaused: true, currentTask: null, upNextTasks: [],
  pomodoroMinutes: 25, sessionStartTime: null,
  enterFocus: async () => {}, exitFocus: () => {}, startSession: () => {},
  setCurrentTaskById: () => {}, skipToNext: () => {},
  completeCurrentTask: async () => {}, setIsPaused: () => {}, reorderTasks: () => {},
  updateCurrentTask: async () => {}, refreshCurrentTask: async () => {},
};

export function useFocusMode() {
  const ctx = useContext(FocusContext);
  return ctx ?? NOOP_CONTEXT;
}

const TASK_SELECT = 'id, title, description, status, priority, due_date, start_date, progress, estimated_hours, actual_hours, assigned_to, project_id, task_category, project:projects(name)';

function mapTask(t: any): FocusTask {
  return {
    id: t.id, title: t.title, description: t.description, status: t.status,
    priority: t.priority, due_date: t.due_date, start_date: t.start_date,
    progress: t.progress, estimated_hours: t.estimated_hours,
    actual_hours: t.actual_hours, assigned_to: t.assigned_to,
    project_id: t.project_id, project_name: t.project?.name || '',
    task_category: t.task_category,
  };
}

export function FocusModeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [tasks, setTasks] = useState<FocusTask[]>([]);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const pomodoroMinutes = 25;

  const currentTask = tasks.find(t => t.id === currentTaskId) || null;
  const upNextTasks = tasks.filter(t => t.id !== currentTaskId);

  const fetchTodayTasks = useCallback(async () => {
    if (!user) return [];
    const today = new Date();
    const { data } = await supabase
      .from('tasks')
      .select(TASK_SELECT)
      .eq('assigned_to', user.id)
      .in('status', ['todo', 'in_progress', 'review'])
      .lte('due_date', format(endOfDay(today), 'yyyy-MM-dd'))
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true })
      .limit(20);

    return (data || []).map(mapTask);
  }, [user]);

  const enterFocus = useCallback(async (taskId?: string) => {
    const fetched = await fetchTodayTasks();
    if (fetched.length === 0) {
      if (!user) return;
      const { data } = await supabase
        .from('tasks')
        .select(TASK_SELECT)
        .eq('assigned_to', user.id)
        .in('status', ['todo', 'in_progress'])
        .order('priority', { ascending: false })
        .limit(10);
      const mapped = (data || []).map(mapTask);
      setTasks(mapped);
      setCurrentTaskId(taskId || mapped[0]?.id || null);
    } else {
      setTasks(fetched);
      setCurrentTaskId(taskId || fetched[0]?.id || null);
    }
    // Start in paused state - timer only begins when user presses Play
    setSessionStartTime(null);
    setIsPaused(true);
    setIsActive(true);
  }, [fetchTodayTasks, user]);

  const exitFocus = useCallback(() => {
    setIsActive(false);
    setIsPaused(true);
    setCurrentTaskId(null);
    setSessionStartTime(null);
  }, []);

  const startSession = useCallback(() => {
    setSessionStartTime(Date.now());
    setIsPaused(false);
  }, []);

  const setCurrentTaskById = useCallback((id: string) => {
    setCurrentTaskId(id);
    setSessionStartTime(null);
    setIsPaused(true);
  }, []);

  const skipToNext = useCallback(() => {
    const remaining = tasks.filter(t => t.id !== currentTaskId);
    if (remaining.length > 0) {
      setCurrentTaskId(remaining[0].id);
      setSessionStartTime(null);
      setIsPaused(true);
    }
  }, [tasks, currentTaskId]);

  const completeCurrentTask = useCallback(async () => {
    if (!currentTaskId) return;
    // Remove current task from queue and advance (DB update handled by caller)
    const remaining = tasks.filter(t => t.id !== currentTaskId);
    setTasks(remaining);
    if (remaining.length > 0) {
      setCurrentTaskId(remaining[0].id);
      setSessionStartTime(null);
      setIsPaused(true);
    } else {
      exitFocus();
    }
  }, [currentTaskId, tasks, exitFocus]);

  const reorderTasks = useCallback((taskIds: string[]) => {
    setTasks(prev => {
      const map = new Map(prev.map(t => [t.id, t]));
      return taskIds.map(id => map.get(id)!).filter(Boolean);
    });
  }, []);

  return (
    <FocusContext.Provider value={{
      isActive, isPaused, currentTask, upNextTasks, pomodoroMinutes,
      sessionStartTime, enterFocus, exitFocus, startSession, setCurrentTaskById,
      skipToNext, completeCurrentTask, setIsPaused, reorderTasks,
    }}>
      {children}
    </FocusContext.Provider>
  );
}
