import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Send, X, Loader2, MessageCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import VoiceInputButton from '@/components/voice/VoiceInputButton';
import type { ForwardedRef } from 'react';
import { forwardRef, useImperativeHandle } from 'react';

interface Msg { role: 'user' | 'assistant'; content: string; }

interface Props {
  task: {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    priority: string;
    due_date: string | null;
    project_id: string;
    project_name?: string;
  };
}

export interface FocusAIChatHandle {
  open: () => void;
  focusInput: () => void;
}

const QUICK_PROMPTS = [
  'Σύνοψη του task',
  'Πρότεινε επόμενα βήματα',
  'Βρες πιθανά blockers',
  'Γράψε update για το team',
];

const FocusAIChat = forwardRef(function FocusAIChat(
  { task }: Props,
  ref: ForwardedRef<FocusAIChatHandle>,
) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    open: () => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 100); },
    focusInput: () => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 100); },
  }), []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, loading]);

  // Reset chat when task changes
  useEffect(() => { setMsgs([]); }, [task.id]);

  const send = useCallback(async (text: string) => {
    const t = text.trim();
    if (!t || loading || !user) return;

    const userMsg: Msg = { role: 'user', content: t };
    setMsgs(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const pageContext = {
      pageType: 'task',
      pageName: task.title,
      entityId: task.id,
      pageData: {
        title: task.title,
        status: task.status,
        priority: task.priority,
        due_date: task.due_date,
        description: task.description,
        project_id: task.project_id,
        project_name: task.project_name,
      },
    };

    let assistantSoFar = '';
    setMsgs(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/secretary-agent`;

      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...msgs, userMsg],
          current_page: `/focus/task/${task.id}`,
          page_context: pageContext,
        }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;

          const json = line.slice(6).trim();
          if (json === '[DONE]') continue;
          try {
            const p = JSON.parse(json);
            if (p.type === 'delta' && p.content) {
              assistantSoFar += p.content;
              setMsgs(prev => prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, content: assistantSoFar } : m,
              ));
            } else if (p.type === 'error') {
              assistantSoFar += `\n\n⚠️ ${p.text}`;
              setMsgs(prev => prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, content: assistantSoFar } : m,
              ));
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      console.error('AI chat error', e);
      setMsgs(prev => prev.map((m, i) =>
        i === prev.length - 1 ? { ...m, content: 'Σφάλμα επικοινωνίας με τον AI assistant.' } : m,
      ));
    } finally {
      setLoading(false);
    }
  }, [loading, user, msgs, task]);

  // Closed state: render nothing — opening is controlled imperatively via the
  // ref handle exposed to the parent (Ask AI button in FocusControlBar, or `/` shortcut).
  if (!open) return null;

  return (
    <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[58] w-[440px] h-[min(60vh,580px)] bg-[#161b25] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#3b82f6]/20 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-[#3b82f6]" />
          </div>
          <div>
            <p className="text-white text-sm font-medium">Task Assistant</p>
            <p className="text-white/40 text-[10px] truncate max-w-[260px]">{task.title}</p>
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 text-white/70 flex items-center justify-center"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {msgs.length === 0 && (
          <div className="space-y-3">
            <div className="text-center py-4">
              <MessageCircle className="h-8 w-8 text-white/20 mx-auto mb-2" />
              <p className="text-white/50 text-sm">Ρώτα με οτιδήποτε για αυτό το task</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-white/75 text-xs border border-white/10"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={
                m.role === 'user'
                  ? 'max-w-[85%] bg-[#3b82f6] text-white rounded-2xl rounded-tr-sm px-3 py-2 text-sm'
                  : 'max-w-[90%] bg-white/5 text-white/85 rounded-2xl rounded-tl-sm px-3 py-2 text-sm prose prose-sm prose-invert max-w-none'
              }
            >
              {m.role === 'user' ? m.content : (
                <ReactMarkdown>{m.content || '…'}</ReactMarkdown>
              )}
            </div>
          </div>
        ))}

        {loading && msgs[msgs.length - 1]?.content === '' && (
          <div className="flex items-center gap-2 text-white/50 text-xs">
            <Loader2 className="h-3 w-3 animate-spin" /> Σκέφτομαι…
          </div>
        )}
      </div>

      <div className="p-3 border-t border-white/5 flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault(); send(input);
            }
          }}
          placeholder="Ρώτα κάτι για αυτό το task…"
          rows={1}
          className="flex-1 bg-white/5 border border-white/10 focus:border-[#3b82f6] rounded-lg px-3 py-2 text-sm text-white outline-none resize-none max-h-24"
        />
        <VoiceInputButton onTranscript={(t) => setInput(prev => (prev ? prev + ' ' : '') + t)} />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || loading}
          className="w-9 h-9 rounded-lg bg-[#3b82f6] hover:bg-[#3b82f6]/85 disabled:opacity-30 text-white flex items-center justify-center"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
});

export default FocusAIChat;
