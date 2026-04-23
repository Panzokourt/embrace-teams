import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Sparkles, X, Send, Loader2, RefreshCw } from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastPathRef = useRef<string | null>(null);

  // Auto-load when panel opens or when pathname changes while open
  useEffect(() => {
    if (!open) return;
    if (lastPathRef.current === location.pathname && response) return;
    lastPathRef.current = location.pathname;
    runStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, location.pathname]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const runStream = async (q?: string) => {
    setLoading(true);
    setError(null);
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

      if (resp.status === 429) {
        setError('Πολλά αιτήματα — δοκίμασε σε λίγο.');
        toast.error('Πολλά αιτήματα — δοκίμασε σε λίγο.');
        setLoading(false);
        return;
      }
      if (resp.status === 402) {
        setError('Δεν υπάρχουν διαθέσιμα AI credits.');
        toast.error('Δεν υπάρχουν διαθέσιμα AI credits.');
        setLoading(false);
        return;
      }
      if (!resp.ok || !resp.body) {
        const txt = await resp.text().catch(() => '');
        console.error('AI Coach error:', resp.status, txt);
        setError(`Σφάλμα AI Coach (${resp.status})`);
        setLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let streamDone = false;
      let gotAnyContent = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buf.indexOf('\n')) !== -1) {
          let line = buf.slice(0, newlineIdx);
          buf = buf.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') { streamDone = true; break; }
          try {
            const p = JSON.parse(json);
            const c = p.choices?.[0]?.delta?.content;
            if (c) {
              gotAnyContent = true;
              setResponse((prev) => prev + c);
            }
          } catch {
            buf = line + '\n' + buf;
            break;
          }
        }
      }

      // Flush remaining buffer
      if (buf.trim()) {
        for (let raw of buf.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const json = raw.slice(6).trim();
          if (json === '[DONE]') continue;
          try {
            const p = JSON.parse(json);
            const c = p.choices?.[0]?.delta?.content;
            if (c) { gotAnyContent = true; setResponse((prev) => prev + c); }
          } catch { /* ignore */ }
        }
      }

      if (!gotAnyContent) {
        setError('Ο AI Coach δεν έδωσε απάντηση. Δοκίμασε ξανά.');
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error('AI Coach network error:', e);
        setError('Πρόβλημα δικτύου. Δοκίμασε ξανά.');
      }
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

  return createPortal(
    <div className="fixed bottom-24 right-6 z-[80] w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border/60 bg-card shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 fade-in">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-gradient-to-r from-primary/10 to-transparent">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm text-foreground">AI Coach</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => runStream()}
            disabled={loading}
            className="h-7 w-7"
            title="Ανανέωση"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="px-4 py-3 max-h-[360px] overflow-y-auto text-sm text-foreground whitespace-pre-wrap min-h-[120px]">
        {!response && loading && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Loader2 className="h-3 w-3 animate-spin" /> Σκέφτομαι για τη σελίδα...
          </div>
        )}
        {error && !loading && (
          <div className="text-xs text-destructive">{error}</div>
        )}
        {!response && !loading && !error && (
          <div className="text-xs text-muted-foreground">
            Ρώτα κάτι για αυτή τη σελίδα ή πάτα ανανέωση για coaching tips.
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
    </div>,
    document.body
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
