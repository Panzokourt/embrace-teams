import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, Circle, Plus, Trash2, ListChecks } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { useFocusMode } from '@/contexts/FocusContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Subtask {
  id: string;
  title: string;
  status: string;
  priority: string;
}

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-500/20 text-red-300',
  high: 'bg-orange-500/20 text-orange-300',
  medium: 'bg-yellow-500/20 text-yellow-300',
  low: 'bg-white/10 text-white/60',
};

interface Props {
  taskId: string;
  projectId: string;
}

export default function FocusSubtasksSection({ taskId, projectId }: Props) {
  const { user } = useAuth();
  const { setCurrentTaskById } = useFocusMode();
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const fetchSubtasks = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('id, title, status, priority')
      .eq('parent_task_id', taskId)
      .order('created_at');
    setSubtasks((data || []) as Subtask[]);
  }, [taskId]);

  useEffect(() => { fetchSubtasks(); }, [fetchSubtasks]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`focus-subtasks-${taskId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'tasks', filter: `parent_task_id=eq.${taskId}`,
      }, () => fetchSubtasks())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [taskId, fetchSubtasks]);

  const toggleStatus = async (st: Subtask) => {
    const next = (st.status === 'completed' || st.status === 'done') ? 'todo' : 'completed';
    const { error } = await supabase.from('tasks').update({ status: next as any }).eq('id', st.id);
    if (error) toast.error('Αποτυχία ενημέρωσης');
  };

  const addSubtask = async () => {
    const t = newTitle.trim();
    if (!t || !user) return;
    const { error } = await supabase.from('tasks').insert({
      title: t,
      project_id: projectId,
      parent_task_id: taskId,
      status: 'todo',
      priority: 'medium',
      assigned_to: user.id,
      created_by: user.id,
    });
    if (error) {
      toast.error('Αποτυχία δημιουργίας subtask');
    } else {
      setNewTitle('');
      setAdding(false);
    }
  };

  const removeSubtask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) toast.error('Αποτυχία διαγραφής');
  };

  const completed = subtasks.filter(s => s.status === 'completed' || s.status === 'done').length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-white/40">
          <ListChecks className="h-4 w-4" />
          <h3 className="text-xs font-semibold uppercase tracking-widest">
            Subtasks {subtasks.length > 0 && <span className="text-white/30 normal-case font-normal">· {completed}/{subtasks.length}</span>}
          </h3>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="text-xs text-white/50 hover:text-white inline-flex items-center gap-1"
        >
          <Plus className="h-3 w-3" /> Προσθήκη
        </button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1">
        {subtasks.length === 0 && !adding && (
          <p className="text-white/30 text-sm italic py-2">Δεν υπάρχουν subtasks</p>
        )}

        {subtasks.map((st) => {
          const done = st.status === 'completed' || st.status === 'done';
          return (
            <div
              key={st.id}
              className="group flex items-center gap-3 py-1.5 px-2 -mx-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              <button
                onClick={() => toggleStatus(st)}
                className="shrink-0 transition-transform hover:scale-110"
                aria-label={done ? 'Mark incomplete' : 'Mark complete'}
              >
                {done
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  : <Circle className="h-4 w-4 text-white/40 hover:text-white/70" />}
              </button>
              <button
                onClick={() => setCurrentTaskById(st.id)}
                className={`flex-1 text-left text-sm truncate ${done ? 'text-white/35 line-through' : 'text-white/85'}`}
                title="Switch focus to this subtask"
              >
                {st.title}
              </button>
              <Badge className={`${priorityColors[st.priority] || priorityColors.low} border-0 text-[10px] py-0 px-1.5`}>
                {st.priority}
              </Badge>
              <button
                onClick={() => removeSubtask(st.id)}
                className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md hover:bg-red-500/20 text-white/40 hover:text-red-300 flex items-center justify-center transition-opacity"
                aria-label="Delete subtask"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          );
        })}

        {adding && (
          <div className="flex items-center gap-2 pt-1">
            <Circle className="h-4 w-4 text-white/30 shrink-0" />
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); addSubtask(); }
                if (e.key === 'Escape') { setAdding(false); setNewTitle(''); }
              }}
              onBlur={() => { if (!newTitle.trim()) setAdding(false); }}
              placeholder="Τίτλος subtask, Enter για αποθήκευση…"
              className="flex-1 bg-white/5 border border-white/15 focus:border-[#3b82f6] rounded-lg px-3 py-1.5 text-sm text-white outline-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
