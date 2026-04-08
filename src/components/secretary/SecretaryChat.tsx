import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bot, Loader2, Paperclip, Send, X, FileText, Image as ImageIcon, File as FileIcon, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ConversationSidebar from "./ConversationSidebar";
import { parseAndRenderContent } from "./ActionRenderer";
import { useLocation } from "react-router-dom";
import { useDocumentParser } from "@/hooks/useDocumentParser";
import { usePageContext } from "@/hooks/usePageContext";

interface ChatMessage {
  role: "user" | "assistant";
  content: string | any[];
  displayContent?: string;
  attachments?: { name: string; type: string }[];
}

const TEXT_EXTENSIONS = ['txt', 'csv', 'json', 'xml', 'md', 'log', 'yaml', 'yml', 'toml'];
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function getExtension(name: string) {
  return name.split('.').pop()?.toLowerCase() || '';
}

function getFileIcon(file: File | { name: string; type: string }) {
  if (IMAGE_TYPES.includes(file.type)) return <ImageIcon className="h-3 w-3" />;
  if (file.type === 'application/pdf') return <FileText className="h-3 w-3" />;
  if (file.type.includes('spreadsheet') || file.name.endsWith('.csv') || file.name.endsWith('.xlsx')) return <FileSpreadsheet className="h-3 w-3" />;
  return <FileIcon className="h-3 w-3" />;
}

const defaultQuickActions = [
  { label: "📋 Tasks μου", prompt: "Δείξε μου τα tasks μου" },
  { label: "🎯 Smart Plan", prompt: "Θέλω να σχεδιάσω ένα νέο project" },
  { label: "📝 Νέο Brief", prompt: "Θέλω να δημιουργήσω ένα νέο brief" },
  { label: "🚀 Νέο Project", prompt: "Θέλω να δημιουργήσω ένα νέο project" },
  { label: "📅 Νέο Meeting", prompt: "Θέλω να δημιουργήσω ένα νέο meeting" },
  { label: "⚠️ Risk Radar", prompt: "Τρέξε Risk Radar analysis" },
  { label: "☀️ Daily Briefing", prompt: "Τι έχω σήμερα;" },
  { label: "🧠 Brain Analysis", prompt: "Τρέξε ανάλυση Brain" },
  { label: "💡 Insights", prompt: "Δείξε μου τα τελευταία Brain insights" },
];

function getContextualQuickActions(pathname: string) {
  const projectMatch = pathname.match(/^\/projects\/([^/]+)$/);
  if (projectMatch) {
    const pid = projectMatch[1];
    return [
      { label: "📋 Tasks project", prompt: `Δείξε μου τα tasks αυτού του project (project_id: ${pid})` },
      { label: "➕ Νέο Task", prompt: `Θέλω να δημιουργήσω task σε αυτό το project (project_id: ${pid})` },
      { label: "👥 Πρόσθεσε μέλος", prompt: `Θέλω να προσθέσω μέλος στο project (project_id: ${pid})` },
      { label: "📊 Αναφορά", prompt: `Δημιούργησε αναφορά για αυτό το project (project_id: ${pid})` },
    ];
  }
  if (pathname === "/tasks") {
    return [
      { label: "📋 Tasks μου", prompt: "Δείξε μου τα tasks μου" },
      { label: "➕ Νέο Task", prompt: "Θέλω να δημιουργήσω ένα νέο task" },
      { label: "⚠️ Overdue", prompt: "Δείξε μου τα overdue tasks" },
    ];
  }
  if (pathname === "/brain") {
    return [
      { label: "🧠 Τρέξε Ανάλυση", prompt: "Τρέξε ανάλυση Brain" },
      { label: "💡 Insights", prompt: "Δείξε μου τα τελευταία Brain insights" },
      { label: "🔴 High Priority", prompt: "Δείξε μου τα high priority Brain insights" },
    ];
  }
  return defaultQuickActions;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Καλημέρα";
  if (hour < 18) return "Καλησπέρα";
  return "Καληνύχτα";
}

interface SecretaryChatProps {
  mode: "full" | "panel";
  registerSendHandler?: (handler: (text: string) => void) => void;
  onOpenMemory?: () => void;
}

export default function SecretaryChat({ mode, registerSendHandler, onOpenMemory }: SecretaryChatProps) {
  const { profile, user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sidebarKey, setSidebarKey] = useState(0);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const location = useLocation();
  const pageContext = usePageContext();

  const { parseFiles } = useDocumentParser();
  const quickActions = useMemo(() => getContextualQuickActions(location.pathname), [location.pathname]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessageRef = useRef<(text: string) => void>();

  useEffect(() => {
    const state = location.state as { voiceMessage?: string } | null;
    if (state?.voiceMessage) {
      sendMessage(state.voiceMessage);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadConversation = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("secretary_messages")
      .select("role, content")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });
    setMessages((data || []) as ChatMessage[]);
    setConversationId(id);
  }, []);

  const startNewConversation = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setInput("");
    setAttachedFiles([]);
  }, []);

  const getOrCreateConversation = async (): Promise<string> => {
    if (conversationId) return conversationId;
    if (!user) throw new Error("Not authenticated");
    const { data: roleData } = await supabase
      .from("user_company_roles")
      .select("company_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();
    const companyId = roleData?.company_id;
    if (!companyId) throw new Error("No company");
    const { data, error } = await supabase
      .from("secretary_conversations")
      .insert({ user_id: user.id, company_id: companyId, title: "Νέα συνομιλία" })
      .select("id")
      .single();
    if (error) throw error;
    setConversationId(data.id);
    return data.id;
  };

  const saveMessage = async (convId: string, role: string, content: string) => {
    await supabase.from("secretary_messages").insert({ conversation_id: convId, role, content });
  };

  const updateConversationTitle = async (convId: string, firstMessage: string) => {
    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "");
    await supabase
      .from("secretary_conversations")
      .update({ title, updated_at: new Date().toISOString() })
      .eq("id", convId);
    setSidebarKey((k) => k + 1);
  };

  // --- Drag & Drop ---
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setDragging(false);
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

  // --- File processing (same as QuickChatBar) ---
  const processFilesForMessage = useCallback(async (files: File[]): Promise<any[]> => {
    const contentParts: any[] = [];
    for (const file of files) {
      const ext = getExtension(file.name);
      if (IMAGE_TYPES.includes(file.type)) {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        const base64 = btoa(binary);
        contentParts.push({ type: 'image', source: { type: 'base64', media_type: file.type, data: base64 } });
        continue;
      }
      if (TEXT_EXTENSIONS.includes(ext) || file.type.startsWith('text/')) {
        const text = await file.text();
        contentParts.push({ type: 'text', text: `📎 ${file.name}\n\n${text}` });
        continue;
      }
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') ||
          file.type.includes('word') || file.type.includes('presentation') ||
          file.name.endsWith('.docx') || file.name.endsWith('.pptx')) {
        try {
          const parsed = await parseFiles([file]);
          if (parsed.length > 0) {
            contentParts.push({
              type: 'text',
              text: `📎 ${file.name} (${parsed[0].metadata.pagesProcessed || '?'} σελίδες, ${parsed[0].metadata.wordCount} λέξεις)\n\n${parsed[0].content}`,
            });
          }
        } catch (err) {
          console.error('Failed to parse file:', file.name, err);
          contentParts.push({ type: 'text', text: `📎 ${file.name} — Αποτυχία ανάγνωσης αρχείου` });
        }
        continue;
      }
      try {
        const text = await file.text();
        contentParts.push({ type: 'text', text: `📎 ${file.name}\n\n${text}` });
      } catch {
        contentParts.push({ type: 'text', text: `📎 ${file.name} — Μη αναγνώσιμο αρχείο` });
      }
    }
    return contentParts;
  }, [parseFiles]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if ((!trimmed && attachedFiles.length === 0) || loading) return;

    const currentFiles = [...attachedFiles];
    const attachmentMeta = currentFiles.map(f => ({ name: f.name, type: f.type }));

    setInput("");
    setAttachedFiles([]);
    setLoading(true);

    const userMsg: ChatMessage = {
      role: "user",
      content: trimmed,
      displayContent: trimmed,
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
        if (trimmed) fileParts.push({ type: 'text', text: trimmed });
        messageContent = fileParts;
      } else {
        messageContent = trimmed;
      }

      const convId = await getOrCreateConversation();
      await saveMessage(convId, "user", trimmed || `[${currentFiles.map(f => f.name).join(', ')}]`);

      if (messages.length === 0) {
        updateConversationTitle(convId, trimmed || currentFiles[0]?.name || 'Νέα συνομιλία');
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        toast.error("Πρέπει να είσαι συνδεδεμένος.");
        setLoading(false);
        return;
      }

      // Build payload
      const payloadMessages = newMessages.map(m => ({
        role: m.role,
        content: m === userMsg ? messageContent : (typeof m.content === 'string' ? m.content : m.displayContent || ''),
      }));

      // Route: large files → Gemini, else → secretary-agent
      const totalContentChars = Array.isArray(messageContent)
        ? messageContent.filter((p: any) => p.type === 'text').reduce((sum: number, p: any) => sum + (p.text?.length || 0), 0)
        : 0;
      const useGemini = totalContentChars > 100000;
      const endpoint = useGemini ? 'quick-chat-gemini' : 'secretary-agent';

      if (useGemini) setStatusMessage('Χρήση Gemini για μεγάλο αρχείο...');
      else setStatusMessage(null);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            messages: payloadMessages,
            current_page: location.pathname,
            page_context: mode === "panel" ? pageContext : undefined,
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 429) toast.error("Πολλά αιτήματα. Δοκίμασε ξανά σε λίγο.");
        else if (response.status === 402) toast.error("Απαιτείται ανανέωση credits.");
        else toast.error(errData.error || "Κάτι πήγε στραβά.");
        setLoading(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        toast.error("Σφάλμα streaming.");
        setLoading(false);
        return;
      }

      const decoder = new TextDecoder();
      let sseBuffer = "";
      let accumulatedReply = "";

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") continue;
          let event: any;
          try { event = JSON.parse(raw); } catch { continue; }

          if (event.type === "delta") {
            accumulatedReply += event.content;
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: accumulatedReply };
              return updated;
            });
          } else if (event.type === "status") {
            setStatusMessage(event.text);
          } else if (event.type === "done") {
            accumulatedReply = event.reply || accumulatedReply;
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: accumulatedReply };
              return updated;
            });
          } else if (event.type === "error") {
            toast.error(event.text || "Σφάλμα AI.");
          }
        }
      }

      setStatusMessage(null);
      const reply = accumulatedReply || "Δεν λήφθηκε απάντηση.";
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: reply };
        return updated;
      });
      await saveMessage(convId, "assistant", reply);
      await supabase
        .from("secretary_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", convId);
    } catch (err) {
      console.error("Secretary error:", err);
      toast.error("Σφάλμα επικοινωνίας με τον Secretary.");
    } finally {
      setLoading(false);
      setStatusMessage(null);
    }
  };

  sendMessageRef.current = sendMessage;
  useEffect(() => {
    if (registerSendHandler) {
      registerSendHandler((text: string) => sendMessageRef.current?.(text));
    }
  }, [registerSendHandler]);

  const firstName = profile?.full_name?.split(" ")[0] || "";
  const showSidebar = mode === "full";
  const greeting = getGreeting();

  const renderMessageContent = (content: string | any[]) => {
    const text = typeof content === 'string' ? content : (content as any[]).filter(p => p.type === 'text').map(p => p.text).join('\n') || '';
    const parts = parseAndRenderContent(text, sendMessage);
    return parts.map((part, i) => {
      if (typeof part === "string") {
        return (
          <div key={i} className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2">
            <ReactMarkdown>{part}</ReactMarkdown>
          </div>
        );
      }
      return <div key={i}>{part}</div>;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 200) + 'px';
  };

  return (
    <div
      className="flex h-full"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {showSidebar && (
        <ConversationSidebar
          key={sidebarKey}
          activeConversationId={conversationId}
          onSelectConversation={loadConversation}
          onNewConversation={startNewConversation}
          onOpenMemory={onOpenMemory}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Drag overlay */}
        {dragging && (
          <div className="absolute inset-0 z-50 bg-primary/5 border-2 border-dashed border-primary/40 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2 text-primary">
              <Paperclip className="h-10 w-10" />
              <span className="text-lg font-medium">Σύρε αρχεία εδώ</span>
              <span className="text-sm text-muted-foreground">PDF, DOCX, εικόνες, κ.ά.</span>
            </div>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6">
            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
                <div className="space-y-3">
                  <h2 className="text-4xl font-semibold text-foreground">
                    {greeting}{firstName ? `, ${firstName}` : ""}
                  </h2>
                  <p className="text-muted-foreground text-lg max-w-md mx-auto">
                    Πώς μπορώ να σε βοηθήσω σήμερα;
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-2xl">
                  {quickActions.slice(0, 6).map((qa) => (
                    <button
                      key={qa.label}
                      onClick={() => sendMessage(qa.prompt)}
                      className="flex flex-col items-start gap-1 p-4 rounded-2xl border border-border/60 bg-card hover:bg-accent/50 text-left text-sm text-foreground transition-colors"
                    >
                      <span className="font-medium">{qa.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className="flex gap-3">
                  {msg.role === "assistant" && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                        <Bot className="h-3.5 w-3.5 text-foreground" />
                      </div>
                    </div>
                  )}
                  {msg.role === "user" && <div className="flex-shrink-0 w-7" />}
                  <div
                    className={cn(
                      "text-sm",
                      msg.role === "user"
                        ? "bg-muted/50 rounded-2xl px-4 py-3 ml-auto max-w-[80%]"
                        : "flex-1 pt-1"
                    )}
                  >
                    {msg.role === "user" && msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {msg.attachments.map((a, j) => (
                          <span key={j} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-[11px] text-muted-foreground">
                            {getFileIcon(a)} {a.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {msg.role === "assistant" ? (
                      renderMessageContent(msg.content)
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.displayContent || (typeof msg.content === 'string' ? msg.content : '')}</p>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                      <Bot className="h-3.5 w-3.5 text-foreground" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{statusMessage || "Σκέφτομαι..."}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.pptx,.xlsx,.csv,.txt,.md,.json,.xml,.yaml,.yml,.png,.jpg,.jpeg,.webp,.gif"
        />

        {/* Input area — Claude-style */}
        <div className="px-4 pb-4 pt-2">
          <div className="max-w-3xl mx-auto space-y-2">
            {messages.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-1">
                {quickActions.slice(0, 4).map((qa) => (
                  <button
                    key={qa.label}
                    onClick={() => sendMessage(qa.prompt)}
                    disabled={loading}
                    className="px-2.5 py-1 rounded-full border border-border/50 bg-card hover:bg-accent/50 text-xs text-muted-foreground transition-colors disabled:opacity-50"
                  >
                    {qa.label}
                  </button>
                ))}
              </div>
            )}

            <div className="rounded-2xl border border-border/60 bg-background shadow-lg overflow-hidden">
              {/* File chips */}
              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-4 pt-3">
                  {attachedFiles.map((file, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg bg-muted text-xs text-foreground">
                      {getFileIcon(file)}
                      <span className="max-w-[150px] truncate">{file.name}</span>
                      <button onClick={() => removeFile(i)} className="p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2 p-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 mb-0.5"
                  title="Επισύναψη αρχείου"
                >
                  <Paperclip className="h-5 w-5" />
                </button>

                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onInput={handleTextareaInput}
                  placeholder="Γράψε ένα μήνυμα ή σύρε αρχεία..."
                  disabled={loading}
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 max-h-[200px]"
                />

                <button
                  onClick={() => sendMessage(input)}
                  disabled={loading || (!input.trim() && attachedFiles.length === 0)}
                  className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0 mb-0.5"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
