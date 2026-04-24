import { useEffect, useRef, useState } from 'react';
import { Search, X, Loader2, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusMode } from '@/contexts/FocusContext';
import { cn } from '@/lib/utils';
import { format, differenceInCalendarDays } from 'date-fns';

interface SearchResult {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  project_name?: string;
}

function classifyResult(r: SearchResult) {
  const isDone = r.status === 'completed' || r.status === 'done';
  if (isDone) return { sortKey: 5, badge: '✓', tone: 'done' as const, label: 'Ολοκληρωμένο' };
  if (!r.due_date) return { sortKey: 4, badge: '–', tone: 'none' as const, label: 'Χωρίς προθεσμία' };

  const due = new Date(r.due_date);
  const today = new Date();
  const diff = differenceInCalendarDays(due, today);
  if (diff < 0) return { sortKey: -diff, badge: `+${-diff}d`, tone: 'overdue' as const, label: `Άργησες ${-diff}d` };
  if (diff === 0) return { sortKey: 1, badge: '!', tone: 'today' as const, label: 'Σήμερα' };
  if (diff <= 7) return { sortKey: 2 + diff / 100, badge: `${diff}d`, tone: 'soon' as const, label: `Σε ${diff}d` };
  return { sortKey: 3, badge: format(due, 'd/MM'), tone: 'future' as const, label: format(due, 'd/MM') };
}

const TONE_STYLES: Record<string, string> = {
  overdue: 'bg-red-500/20 text-red-300 border-red-500/30',
  today: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  soon: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  future: 'bg-white/10 text-white/65 border-white/15',
  none: 'bg-white/5 text-white/45 border-white/10',
  done: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

interface Props {
  /** When this returns true, we hide the default Up Next list */
  onActiveChange?: (active: boolean) => void;
}

export default function FocusSidebarSearch({ onActiveChange }: Props) {
  const { user } = useAuth();
  const { injectAndFocusTask } = useFocusMode();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    onActiveChange?.(open && query.trim().length > 0);
  }, [open, query, onActiveChange]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!user || q.length === 0) { setResults([]); return; }

    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from('tasks')
        .select('id, title, status, priority, due_date, project:projects(name)')
        .eq('assigned_to', user.id)
        .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
        .limit(50);

      const mapped: SearchResult[] = (data || []).map((t: any) => ({
        id: t.id, title: t.title, status: t.status,
        priority: t.priority, due_date: t.due_date,
        project_name: t.project?.name || '',
      }));

      // Sort: overdue (most days late first) → today → soon → future → none → done last
      mapped.sort((a, b) => {
        const ca = classifyResult(a);
        const cb = classifyResult(b);
        if (ca.tone === 'overdue' && cb.tone === 'overdue') return cb.sortKey - ca.sortKey;
        if (ca.tone === 'overdue') return -1;
        if (cb.tone === 'overdue') return 1;
        if (ca.tone === 'done' && cb.tone !== 'done') return 1;
        if (cb.tone === 'done' && ca.tone !== 'done') return -1;
        return ca.sortKey - cb.sortKey;
      });

      setResults(mapped);
      setLoading(false);
    }, 250);

    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [query, user]);

  const close = () => {
    setOpen(false);
    setQuery('');
    setResults([]);
  };

  return (
    <div className="relative">
      {/* Header row */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
        {open ? (
          <>
            <Search className="h-3.5 w-3.5 text-white/50 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') close(); }}
              placeholder="Αναζήτηση σε όλα τα tasks…"
              className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-white/35"
            />
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-white/40" />}
            <button
              onClick={close}
              className="w-6 h-6 rounded-md hover:bg-white/10 text-white/50 flex items-center justify-center"
              aria-label="Close search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <>
            <h3 className="flex-1 text-xs font-semibold text-white/70 uppercase tracking-widest">
              Up Next
            </h3>
            <button
              onClick={() => setOpen(true)}
              className="w-7 h-7 rounded-md hover:bg-white/10 text-white/55 hover:text-white flex items-center justify-center transition-colors"
              title="Αναζήτηση tasks"
              aria-label="Open search"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Results overlay (only when search is active with query) */}
      {open && query.trim().length > 0 && (
        <div className="absolute inset-x-0 top-full bg-[#0f1219] border-b border-white/10 max-h-[60vh] overflow-y-auto z-10">
          {results.length === 0 && !loading && (
            <p className="text-white/40 text-sm italic px-4 py-6 text-center">
              Δεν βρέθηκαν tasks
            </p>
          )}
          <div className="p-2 space-y-1">
            {results.map(r => {
              const c = classifyResult(r);
              const isDone = c.tone === 'done';
              return (
                <button
                  key={r.id}
                  onClick={() => { injectAndFocusTask(r.id); close(); }}
                  className="group w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 text-left transition-colors"
                >
                  <span className={cn(
                    'shrink-0 px-1.5 py-0.5 rounded-md border text-[10px] font-medium tabular-nums',
                    TONE_STYLES[c.tone],
                  )}>
                    {c.badge}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm font-medium truncate',
                      isDone ? 'text-white/45 line-through' : 'text-white/90',
                    )}>
                      {r.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {r.project_name && (
                        <span className="text-[11px] text-white/55 truncate">{r.project_name}</span>
                      )}
                      <span className="text-[11px] text-white/40">· {c.label}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-white/25 group-hover:text-white/60 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
