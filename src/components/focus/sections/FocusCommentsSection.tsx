import { useEffect, useState, useCallback } from 'react';
import { MessageSquare, Send, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { el } from 'date-fns/locale';

interface CommentRow {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  author_name?: string;
  author_avatar?: string | null;
}

interface Props {
  taskId: string;
}

export default function FocusCommentsSection({ taskId }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from('comments')
      .select('id, content, user_id, created_at')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (!data || data.length === 0) {
      setComments([]);
      return;
    }
    const userIds = Array.from(new Set(data.map(c => c.user_id)));
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);
    const map = new Map((profiles || []).map((p: any) => [p.id, p]));
    setComments(data.map(c => ({
      ...c,
      author_name: map.get(c.user_id)?.full_name ?? 'Άγνωστος',
      author_avatar: map.get(c.user_id)?.avatar_url ?? null,
    })));
  }, [taskId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`focus-comments-${taskId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'comments', filter: `task_id=eq.${taskId}`,
      }, () => fetchComments())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [taskId, fetchComments]);

  const send = async () => {
    const t = input.trim();
    if (!t || !user || sending) return;
    setSending(true);
    const { error } = await supabase.from('comments').insert({
      content: t,
      task_id: taskId,
      user_id: user.id,
    });
    setSending(false);
    if (error) {
      toast.error('Αποτυχία αποστολής σχολίου');
    } else {
      setInput('');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Διαγραφή σχολίου;')) return;
    const { error } = await supabase.from('comments').delete().eq('id', id);
    if (error) toast.error('Αποτυχία διαγραφής');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-white/40">
        <MessageSquare className="h-4 w-4" />
        <h3 className="text-xs font-semibold uppercase tracking-widest">
          Σχόλια {comments.length > 0 && <span className="text-white/30 normal-case font-normal">· {comments.length}</span>}
        </h3>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-3">
        {comments.length === 0 ? (
          <p className="text-white/30 text-sm italic py-2">Δεν υπάρχουν σχόλια ακόμα</p>
        ) : (
          <div className="space-y-3">
            {comments.map((c) => {
              const isMine = c.user_id === user?.id;
              return (
                <div key={c.id} className="group flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/70 shrink-0 overflow-hidden">
                    {c.author_avatar
                      ? <img src={c.author_avatar} alt={c.author_name} className="w-full h-full object-cover" />
                      : (c.author_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-white/85 text-sm font-medium">{c.author_name}</span>
                      <span className="text-white/35 text-[11px]">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: el })}
                      </span>
                      {isMine && (
                        <button
                          onClick={() => remove(c.id)}
                          className="ml-auto opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-300"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-white/75 text-sm whitespace-pre-wrap break-words">{c.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t border-white/5">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault(); send();
              }
            }}
            placeholder="Γράψε σχόλιο… (⌘⏎ για αποστολή)"
            rows={2}
            className="flex-1 bg-white/5 border border-white/10 focus:border-[#3b82f6] rounded-lg px-3 py-2 text-sm text-white outline-none resize-none"
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            className="self-end w-9 h-9 rounded-lg bg-[#3b82f6] hover:bg-[#3b82f6]/85 disabled:opacity-30 text-white flex items-center justify-center transition-colors"
            aria-label="Send"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
