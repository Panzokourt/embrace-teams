import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles, X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * AICoachPanel — small floating panel triggered from TopBar.
 * Streams a context-aware helper response from `coach-ai-suggest`.
 */
export default function AICoachPanel({ open, onClose }: Props) {
  const location = useLocation();
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open && !response && !loading) {
      // Auto-load contextual coaching for the current page
      runStream();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const runStream = async (q?: string) => {
    setLoading(true);
    setResponse('');
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach-ai-suggest`;
      const resp = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ pathname: location.pathname, question: q }),
      });

      if (resp.status === 429) { toast.error('Πολλά αιτήματα — δοκίμασε σε λίγο.'); setLoading(false); return; }
      if (resp.status === 402) { toast.error('Δεν υπάρχουν διαθέσιμα AI credits.'); setLoading(false); return; }
      if (!resp.ok || !resp.body) { toast.error('Σφάλμα AI Coach'); setLoading(false); return; }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf('\n')) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') { done = true; break; }
          try {
            const p = JSON.parse(json);
            const c = p.choices?.[0]?.delta?.content;
            if (c) setResponse((prev) => prev + c);
          } catch { buf = line + '\n' + buf; break; }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') toast.error('Πρόβλημα δικτύου');
    } finally {
      setLoading(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    runStream(question.trim());
    setQuestion('');
  };

  if (!open) return null;

  return (
    <div className="fixed bottom-20 right-6 z-40 w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border/60 bg-card shadow-xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 fade-in">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-gradient-to-r from-primary/10 to-transparent">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm text-foreground">AI Coach</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="px-4 py-3 max-h-[320px] overflow-y-auto text-sm text-foreground whitespace-pre-wrap min-h-[80px]">
        {!response && loading && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Loader2 className="h-3 w-3 animate-spin" /> Σκέφτομαι για τη σελίδα...
          </div>
        )}
        {response}
        {loading && response && <span className="inline-block w-1 h-4 bg-primary animate-pulse ml-0.5 align-middle" />}
      </div>

      <form onSubmit={submit} className="border-t border-border/40 p-2 flex items-center gap-2">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ρώτα κάτι για αυτή τη σελίδα..."
          className="h-8 text-xs"
          disabled={loading}
        />
        <Button type="submit" size="icon" className="h-8 w-8" disabled={loading || !question.trim()}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  );
}

export function AICoachTrigger({ className, onClick }: { className?: string; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn('h-8 gap-1.5 px-2.5 text-xs', className)}
      title="AI Coach"
    >
      <Sparkles className="h-3.5 w-3.5 text-primary" />
      <span className="hidden md:inline">AI Coach</span>
    </Button>
  );
}
