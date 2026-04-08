import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, MessageSquarePlus, Loader2, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { useLocation } from 'react-router-dom';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface QuickChatBarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function QuickChatBar({ isOpen, onToggle }: QuickChatBarProps) {
  const { user } = useAuth();
  const location = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Expand when messages exist
  useEffect(() => {
    if (messages.length > 0) setExpanded(true);
  }, [messages.length]);

  // Keyboard shortcut: ⌘+I / Ctrl+I
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault();
        onToggle();
      }
      if (e.key === 'Escape' && isOpen) {
        onToggle();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onToggle]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onToggle();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onToggle]);

  const getOrCreateConversation = async (): Promise<string> => {
    if (conversationId) return conversationId;
    if (!user) throw new Error('Not authenticated');
    const { data: roleData } = await supabase
      .from('user_company_roles')
      .select('company_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();
    const companyId = roleData?.company_id;
    if (!companyId) throw new Error('No company');
    const { data, error } = await supabase
      .from('secretary_conversations')
      .insert({ user_id: user.id, company_id: companyId, title: 'Quick Chat' })
      .select('id')
      .single();
    if (error) throw error;
    setConversationId(data.id);
    return data.id;
  };

  const saveMessage = async (convId: string, role: string, content: string) => {
    await supabase.from('secretary_messages').insert({ conversation_id: convId, role, content });
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const convId = await getOrCreateConversation();
      await saveMessage(convId, 'user', text);

      if (messages.length === 0) {
        const title = text.slice(0, 50) + (text.length > 50 ? '...' : '');
        await supabase.from('secretary_conversations').update({ title, updated_at: new Date().toISOString() }).eq('id', convId);
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) { toast.error('Πρέπει να είσαι συνδεδεμένος.'); setLoading(false); return; }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/secretary-agent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            messages: newMessages.map(m => ({ role: m.role, content: m.content })),
            current_page: location.pathname,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) toast.error('Πολλά αιτήματα. Δοκίμασε ξανά σε λίγο.');
        else if (response.status === 402) toast.error('Απαιτείται ανανέωση credits.');
        else toast.error('Κάτι πήγε στραβά.');
        setLoading(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) { toast.error('Σφάλμα streaming.'); setLoading(false); return; }

      const decoder = new TextDecoder();
      let sseBuffer = '';
      let accumulatedReply = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') continue;
          let event: any;
          try { event = JSON.parse(raw); } catch { continue; }

          if (event.type === 'delta') {
            accumulatedReply += event.content;
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: 'assistant', content: accumulatedReply };
              return updated;
            });
          } else if (event.type === 'status') {
            setStatusMessage(event.text);
          } else if (event.type === 'done') {
            accumulatedReply = event.reply || accumulatedReply;
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: 'assistant', content: accumulatedReply };
              return updated;
            });
          } else if (event.type === 'error') {
            toast.error(event.text || 'Σφάλμα AI.');
          }
        }
      }

      setStatusMessage(null);
      const reply = accumulatedReply || 'Δεν λήφθηκε απάντηση.';
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: reply };
        return updated;
      });
      await saveMessage(convId, 'assistant', reply);
    } catch (err) {
      console.error('QuickChat error:', err);
      toast.error('Σφάλμα επικοινωνίας.');
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, conversationId, user, location.pathname]);

  const startNewChat = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setInput('');
    setExpanded(false);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-2xl z-40 transition-all duration-300 ease-out px-4',
        isOpen ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-8 opacity-0 pointer-events-none'
      )}
    >
      <div className="bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
        {/* Messages area */}
        {expanded && messages.length > 0 && (
          <div ref={scrollRef} className="max-h-[300px] overflow-y-auto px-4 pt-3 pb-2 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className="shrink-0 mt-0.5">
                    <Bot className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className={cn(
                  'max-w-[85%] text-sm rounded-xl px-3 py-2',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground'
                )}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:m-0 [&>ol]:m-0">
                      <ReactMarkdown>{msg.content || '...'}</ReactMarkdown>
                    </div>
                  ) : (
                    <span>{msg.content}</span>
                  )}
                </div>
              </div>
            ))}
            {loading && statusMessage && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>{statusMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* Input area */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={startNewChat}
              title="Νέα συνομιλία"
            >
              <MessageSquarePlus className="h-4 w-4" />
            </Button>
          )}
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ρώτα τον AI βοηθό..."
            disabled={loading}
            className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground disabled:opacity-50"
          />
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary"
              onClick={sendMessage}
              disabled={!input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={onToggle}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Shortcut hint */}
        {messages.length === 0 && !loading && (
          <div className="px-4 pb-2 -mt-1">
            <span className="text-[10px] text-muted-foreground">⌘I για εναλλαγή</span>
          </div>
        )}
      </div>
    </div>
  );
}
