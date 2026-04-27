import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, MessageSquarePlus, Loader2, Bot, Paperclip, FileText, Image as ImageIcon, File as FileIcon, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { parseAndRenderContent } from '@/components/secretary/ActionRenderer';
import { useLocation } from 'react-router-dom';
import { useDocumentParser } from '@/hooks/useDocumentParser';
import { MentionTextarea, type MentionTextareaHandle } from '@/components/mentions/MentionTextarea';
import VoiceInputButton from '@/components/voice/VoiceInputButton';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | any[];
  displayContent?: string;
  attachments?: { name: string; type: string }[];
}

interface QuickChatBarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const TEXT_EXTENSIONS = ['txt', 'csv', 'json', 'xml', 'md', 'log', 'yaml', 'yml', 'toml'];
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function getFileIcon(file: File) {
  if (IMAGE_TYPES.includes(file.type)) return <ImageIcon className="h-3 w-3" />;
  if (file.type === 'application/pdf') return <FileText className="h-3 w-3" />;
  if (file.type.includes('spreadsheet') || file.name.endsWith('.csv') || file.name.endsWith('.xlsx')) return <FileSpreadsheet className="h-3 w-3" />;
  return <FileIcon className="h-3 w-3" />;
}

function getExtension(name: string) {
  return name.split('.').pop()?.toLowerCase() || '';
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
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<MentionTextareaHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const { parseFiles } = useDocumentParser();

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

  // Click outside to close — but ignore clicks inside Radix portals (mention popover, tooltips, dropdowns) and toasts
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-radix-popper-content-wrapper]')) return;
      if (target.closest('[data-radix-portal]')) return;
      if (target.closest('[data-sonner-toaster]')) return;
      if (containerRef.current && !containerRef.current.contains(target)) {
        onToggle();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onToggle]);

  // Drag & drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      setAttachedFiles(prev => [...prev, ...droppedFiles].slice(0, 10));
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) {
      setAttachedFiles(prev => [...prev, ...selected].slice(0, 10));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const removeFile = useCallback((index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const processFilesForMessage = useCallback(async (files: File[]): Promise<any[]> => {
    const contentParts: any[] = [];

    for (const file of files) {
      const ext = getExtension(file.name);

      // Images → base64 vision blocks
      if (IMAGE_TYPES.includes(file.type)) {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        contentParts.push({
          type: 'image',
          source: { type: 'base64', media_type: file.type, data: base64 },
        });
        continue;
      }

      // Plain text files → read directly
      if (TEXT_EXTENSIONS.includes(ext) || file.type.startsWith('text/')) {
        const text = await file.text();
        contentParts.push({
          type: 'text',
          text: `📎 ${file.name}\n\n${text}`,
        });
        continue;
      }

      // PDFs & Office docs → use document parser
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') ||
          file.type.includes('word') || file.type.includes('presentation') ||
          file.name.endsWith('.docx') || file.name.endsWith('.pptx')) {
        try {
          const parsed = await parseFiles([file]);
          if (parsed.length > 0) {
            const docText = parsed[0].content;
            contentParts.push({
              type: 'text',
              text: `📎 ${file.name} (${parsed[0].metadata.pagesProcessed || '?'} σελίδες, ${parsed[0].metadata.wordCount} λέξεις)\n\n${docText}`,
            });
          }
        } catch (err) {
          console.error('Failed to parse file:', file.name, err);
          contentParts.push({
            type: 'text',
            text: `📎 ${file.name} — Αποτυχία ανάγνωσης αρχείου`,
          });
        }
        continue;
      }

      // Fallback: try reading as text
      try {
        const text = await file.text();
        contentParts.push({
          type: 'text',
          text: `📎 ${file.name}\n\n${text}`,
        });
      } catch {
        contentParts.push({
          type: 'text',
          text: `📎 ${file.name} — Μη αναγνώσιμο αρχείο`,
        });
      }
    }

    return contentParts;
  }, [parseFiles]);

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

  const sendMessage = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if ((!text && attachedFiles.length === 0) || loading) return;
    if (overrideText) setInput('');

    const currentFiles = [...attachedFiles];
    const attachmentMeta = currentFiles.map(f => ({ name: f.name, type: f.type }));

    setInput('');
    setAttachedFiles([]);
    setLoading(true);

    // Build display message immediately
    const userMsg: ChatMessage = {
      role: 'user',
      content: text,
      displayContent: text,
      attachments: attachmentMeta.length > 0 ? attachmentMeta : undefined,
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    try {
      // Process files if any
      let messageContent: string | any[];
      if (currentFiles.length > 0) {
        setStatusMessage('Ανάγνωση αρχείων...');
        const fileParts = await processFilesForMessage(currentFiles);
        if (text) {
          fileParts.push({ type: 'text', text });
        }
        messageContent = fileParts;
      } else {
        messageContent = text;
      }

      const convId = await getOrCreateConversation();
      await saveMessage(convId, 'user', text || `[${currentFiles.map(f => f.name).join(', ')}]`);

      if (messages.length === 0) {
        const title = (text || currentFiles[0]?.name || 'Quick Chat').slice(0, 50);
        await supabase.from('secretary_conversations').update({ title, updated_at: new Date().toISOString() }).eq('id', convId);
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) { toast.error('Πρέπει να είσαι συνδεδεμένος.'); setLoading(false); return; }

      // Build messages payload — use content arrays for file messages
      const payloadMessages = newMessages.map(m => ({
        role: m.role,
        content: m === userMsg ? messageContent : (typeof m.content === 'string' ? m.content : m.displayContent || ''),
      }));

      // Determine endpoint based on content size
      const totalContentChars = Array.isArray(messageContent)
        ? messageContent.filter((p: any) => p.type === 'text').reduce((sum: number, p: any) => sum + (p.text?.length || 0), 0)
        : 0;
      const useGemini = totalContentChars > 100000;
      const endpoint = useGemini ? 'quick-chat-gemini' : 'secretary-agent';

      if (useGemini) {
        setStatusMessage('Χρήση Gemini για μεγάλο αρχείο...');
      } else {
        setStatusMessage(null);
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            messages: payloadMessages,
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
      setStatusMessage(null);
    }
  }, [input, loading, messages, conversationId, user, location.pathname, attachedFiles, processFilesForMessage]);

  const startNewChat = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setInput('');
    setExpanded(false);
    setAttachedFiles([]);
  }, []);


  const getDisplayText = (msg: ChatMessage): string => {
    if (msg.displayContent) return msg.displayContent;
    if (typeof msg.content === 'string') return msg.content;
    // Extract text parts from array content
    return (msg.content as any[])
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text)
      .join('\n');
  };

  return (
    <div
      ref={containerRef}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        'fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-2xl z-40 px-4',
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      )}
    >
      {/* Drag overlay */}
      {dragging && (
        <div className="absolute inset-0 z-50 rounded-2xl border-2 border-dashed border-primary bg-primary/10 flex items-center justify-center backdrop-blur-sm">
          <div className="text-primary font-medium text-sm flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Άφησε αρχεία εδώ
          </div>
        </div>
      )}

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
                  {/* Attachment chips */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {msg.attachments.map((att, j) => (
                        <span key={j} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10">
                          {IMAGE_TYPES.includes(att.type) ? <ImageIcon className="h-2.5 w-2.5" /> : <FileText className="h-2.5 w-2.5" />}
                          {att.name.length > 20 ? att.name.slice(0, 17) + '...' : att.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:m-0 [&>ol]:m-0">
                      {parseAndRenderContent(getDisplayText(msg) || '...', (text) => sendMessage(text)).map((part, pi) =>
                        typeof part === 'string' ? <ReactMarkdown key={pi}>{part}</ReactMarkdown> : <div key={pi}>{part}</div>
                      )}
                    </div>
                  ) : (
                    <span>{getDisplayText(msg) || (msg.attachments ? '' : '...')}</span>
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

        {/* Attached files chips */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pt-2">
            {attachedFiles.map((file, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-muted text-muted-foreground">
                {getFileIcon(file)}
                <span className="max-w-[120px] truncate">{file.name}</span>
                <button onClick={() => removeFile(i)} className="ml-0.5 hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.pptx,.txt,.csv,.json,.xml,.md,.log,.yaml,.yml,.jpg,.jpeg,.png,.webp,.gif,.xlsx"
        />

        {/* Input area */}
        <div className="flex items-end gap-2 px-3 py-2.5">
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
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            title="Επισύναψη αρχείων"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <MentionTextarea
              ref={inputRef}
              value={input}
              onChange={setInput}
              onSubmit={() => sendMessage()}
              enableSlash
              placeholder="Ρώτα τον AI βοηθό... (@ για mention, / για εντολή)"
              disabled={loading}
              maxHeight={120}
              className="py-1"
            />
          </div>
          <VoiceInputButton
            size="sm"
            baseText={input}
            onTranscript={(text) => setInput(text)}
            disabled={loading}
          />
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary"
              onClick={() => sendMessage()}
              disabled={!input.trim() && attachedFiles.length === 0}
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
        {messages.length === 0 && !loading && attachedFiles.length === 0 && (
          <div className="px-4 pb-2 -mt-1">
            <span className="text-[10px] text-muted-foreground">⌘I για εναλλαγή · Σύρε αρχεία για επισύναψη</span>
          </div>
        )}
      </div>
    </div>
  );
}
