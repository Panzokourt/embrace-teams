import { useEffect, useState, useCallback } from 'react';
import { Link2, AlertTriangle, CheckCircle2, Circle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFocusMode } from '@/contexts/FocusContext';

interface Dep {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  task: { id: string; title: string; status: string } | null;
  dependsOn: { id: string; title: string; status: string } | null;
}

interface Props {
  taskId: string;
}

const isDone = (s?: string) => s === 'completed' || s === 'done';

export default function FocusDependenciesSection({ taskId }: Props) {
  const { setCurrentTaskById } = useFocusMode();
  const [blockedBy, setBlockedBy] = useState<{ id: string; title: string; status: string }[]>([]);
  const [blocks, setBlocks] = useState<{ id: string; title: string; status: string }[]>([]);

  const fetchDeps = useCallback(async () => {
    // Tasks this one depends on (blocked by)
    const { data: bbRaw } = await supabase
      .from('task_dependencies')
      .select('depends_on_task_id')
      .eq('task_id', taskId);
    // Tasks that depend on this (we block them)
    const { data: blRaw } = await supabase
      .from('task_dependencies')
      .select('task_id')
      .eq('depends_on_task_id', taskId);

    const bbIds = (bbRaw || []).map((r: any) => r.depends_on_task_id);
    const blIds = (blRaw || []).map((r: any) => r.task_id);
    const allIds = Array.from(new Set([...bbIds, ...blIds]));

    if (allIds.length === 0) {
      setBlockedBy([]); setBlocks([]); return;
    }

    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, status')
      .in('id', allIds);
    const map = new Map((tasks || []).map((t: any) => [t.id, t]));

    setBlockedBy(bbIds.map(id => map.get(id)).filter(Boolean) as any);
    setBlocks(blIds.map(id => map.get(id)).filter(Boolean) as any);
  }, [taskId]);

  useEffect(() => { fetchDeps(); }, [fetchDeps]);

  if (blockedBy.length === 0 && blocks.length === 0) return null;

  const blockingNotDone = blockedBy.filter(t => !isDone(t.status));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-white/40">
        <Link2 className="h-4 w-4" />
        <h3 className="text-xs font-semibold uppercase tracking-widest">Εξαρτήσεις</h3>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-3">
        {blockingNotDone.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-amber-200/90 text-xs">
              Αυτό το task μπλοκάρεται από {blockingNotDone.length} {blockingNotDone.length === 1 ? 'εργασία' : 'εργασίες'} που δεν έχουν ολοκληρωθεί.
            </p>
          </div>
        )}

        {blockedBy.length > 0 && (
          <div>
            <p className="text-white/50 text-[11px] uppercase tracking-wider mb-1.5">Μπλοκάρεται από</p>
            <div className="space-y-1">
              {blockedBy.map(t => (
                <button
                  key={t.id}
                  onClick={() => setCurrentTaskById(t.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 -mx-1 rounded-md hover:bg-white/5 text-left"
                >
                  {isDone(t.status)
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    : <Circle className="h-3.5 w-3.5 text-amber-300 shrink-0" />}
                  <span className={`text-sm flex-1 truncate ${isDone(t.status) ? 'text-white/45 line-through' : 'text-white/85'}`}>
                    {t.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {blocks.length > 0 && (
          <div>
            <p className="text-white/50 text-[11px] uppercase tracking-wider mb-1.5">Μπλοκάρει</p>
            <div className="space-y-1">
              {blocks.map(t => (
                <button
                  key={t.id}
                  onClick={() => setCurrentTaskById(t.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 -mx-1 rounded-md hover:bg-white/5 text-left"
                >
                  <Circle className="h-3.5 w-3.5 text-white/40 shrink-0" />
                  <span className="text-sm text-white/85 flex-1 truncate">{t.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
