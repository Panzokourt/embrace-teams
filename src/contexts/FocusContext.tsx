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
  progress: number | null;
  project_id: string;
  project_name?: string;
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
  setCurrentTaskById: (id: string) => void;
  skipToNext: () => void;
  completeCurrentTask: () => Promise<void>;
  setIsPaused: (v: boolean) => void;
  reorderTasks: (taskIds: string[]) => void;
}

const FocusContext = createContext<FocusContextValue | null>(null);

export function useFocusMode() {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error('useFocusMode must be used within FocusModeProvider');
  return ctx;
}

export function FocusModeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
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
      .select('id, title, description, status, priority, due_date, progress, project_id, project:projects(name)')
      .eq('assigned_to', user.id)
      .in('status', ['todo', 'in_progress', 'review'])
      .lte('due_date', format(endOfDay(today), 'yyyy-MM-dd'))
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true })
      .limit(20);

    return (data || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      due_date: t.due_date,
      progress: t.progress,
      project_id: t.project_id,
      project_name: t.project?.name || '',
    }));
  }, [user]);

  const enterFocus = useCallback(async (taskId?: string) => {
    const fetched = await fetchTodayTasks();
    if (fetched.length === 0) {
      // fallback: fetch any open tasks
      if (!user) return;
      const { data } = await supabase
        .from('tasks')
        .select('id, title, description, status, priority, due_date, progress, project_id, project:projects(name)')
        .eq('assigned_to', user.id)
        .in('status', ['todo', 'in_progress'])
        .order('priority', { ascending: false })
        .limit(10);
      const mapped = (data || []).map((t: any) => ({
        id: t.id, title: t.title, description: t.description, status: t.status,
        priority: t.priority, due_date: t.due_date, progress: t.progress,
        project_id: t.project_id, project_name: t.project?.name || '',
      }));
      setTasks(mapped);
      setCurrentTaskId(taskId || mapped[0]?.id || null);
    } else {
      setTasks(fetched);
      setCurrentTaskId(taskId || fetched[0]?.id || null);
    }
    setSessionStartTime(Date.now());
    setIsPaused(false);
    setIsActive(true);
  }, [fetchTodayTasks, user]);

  const exitFocus = useCallback(() => {
    setIsActive(false);
    setIsPaused(false);
    setCurrentTaskId(null);
    setSessionStartTime(null);
  }, []);

  const setCurrentTaskById = useCallback((id: string) => {
    setCurrentTaskId(id);
    setSessionStartTime(Date.now());
    setIsPaused(false);
  }, []);

  const skipToNext = useCallback(() => {
    const idx = tasks.findIndex(t => t.id === currentTaskId);
    const remaining = tasks.filter(t => t.id !== currentTaskId);
    if (remaining.length > 0) {
      setCurrentTaskId(remaining[0].id);
      setSessionStartTime(Date.now());
      setIsPaused(false);
    }
  }, [tasks, currentTaskId]);

  const completeCurrentTask = useCallback(async () => {
    if (!currentTaskId) return;
    await supabase.from('tasks').update({ status: 'completed' }).eq('id', currentTaskId);
    const remaining = tasks.filter(t => t.id !== currentTaskId);
    setTasks(remaining);
    if (remaining.length > 0) {
      setCurrentTaskId(remaining[0].id);
      setSessionStartTime(Date.now());
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
      sessionStartTime, enterFocus, exitFocus, setCurrentTaskById,
      skipToNext, completeCurrentTask, setIsPaused, reorderTasks,
    }}>
      {children}
    </FocusContext.Provider>
  );
}
