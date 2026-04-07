import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bot, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import MentionInput from "./MentionInput";
import ConversationSidebar from "./ConversationSidebar";
import { parseAndRenderContent } from "./ActionRenderer";
import { useLocation } from "react-router-dom";
import { sanitizeStorageFileName } from "@/utils/storageKeys";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
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
      { label: "🔄 Αλλαγή Status", prompt: `Θέλω να αλλάξω το status αυτού του project (project_id: ${pid})` },
      { label: "⏱ Log Time", prompt: `Θέλω να καταχωρήσω χρόνο για αυτό το project (project_id: ${pid})` },
    ];
  }
  if (pathname === "/tasks") {
    return [
      { label: "📋 Tasks μου", prompt: "Δείξε μου τα tasks μου" },
      { label: "➕ Νέο Task", prompt: "Θέλω να δημιουργήσω ένα νέο task" },
      { label: "⚠️ Overdue", prompt: "Δείξε μου τα overdue tasks" },
      { label: "📊 Tasks Report", prompt: "Δημιούργησε CSV αναφορά tasks" },
    ];
  }
  if (pathname === "/calendar") {
    return [
      { label: "📅 Νέο Meeting", prompt: "Θέλω να δημιουργήσω ένα νέο meeting" },
      { label: "☀️ Σημερινά events", prompt: "Τι events έχω σήμερα;" },
      { label: "📋 Tasks μου", prompt: "Δείξε μου τα tasks μου" },
    ];
  }
  if (pathname === "/timesheets") {
    return [
      { label: "⏱ Log Time", prompt: "Θέλω να καταχωρήσω χρόνο εργασίας" },
      { label: "📋 Tasks μου", prompt: "Δείξε μου τα tasks μου" },
      { label: "📊 Projects", prompt: "Δείξε μου τα projects" },
    ];
  }
  if (pathname === "/chat") {
    return [
      { label: "💬 Στείλε μήνυμα", prompt: "Θέλω να στείλω μήνυμα σε κανάλι" },
      { label: "📋 Tasks μου", prompt: "Δείξε μου τα tasks μου" },
      { label: "☀️ Daily Briefing", prompt: "Τι έχω σήμερα;" },
    ];
  }
  if (pathname === "/brain") {
    return [
      { label: "🧠 Τρέξε Ανάλυση", prompt: "Τρέξε ανάλυση Brain" },
      { label: "💡 Insights", prompt: "Δείξε μου τα τελευταία Brain insights" },
      { label: "🔴 High Priority", prompt: "Δείξε μου τα high priority Brain insights" },
      { label: "📈 Market Insights", prompt: "Δείξε μου τα market insights από το Brain" },
      { label: "🧪 Neuro Tactics", prompt: "Δείξε μου τα neuromarketing insights" },
    ];
  }
  if (pathname === "/clients" || pathname.match(/^\/clients\/[^/]+$/)) {
    return [
      { label: "👤 Νέος Πελάτης", prompt: "Θέλω να δημιουργήσω νέο πελάτη" },
      { label: "🔍 Αναζήτηση", prompt: "Αναζήτησε πελάτη" },
      { label: "🚀 Νέο Project", prompt: "Θέλω να δημιουργήσω ένα νέο project" },
    ];
  }
  return defaultQuickActions;
}

interface SecretaryChatProps {
  mode: "full" | "panel";
  registerSendHandler?: (handler: (text: string) => void) => void;
}

export default function SecretaryChat({ mode, registerSendHandler }: SecretaryChatProps) {
  const { profile, user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sidebarKey, setSidebarKey] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

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

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const convId = await getOrCreateConversation();
      await saveMessage(convId, "user", userMsg.content);
      if (messages.length === 0) {
        updateConversationTitle(convId, userMsg.content);
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        toast.error("Πρέπει να είσαι συνδεδεμένος.");
        setLoading(false);
        return;
      }
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/secretary-agent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
            current_page: location.pathname,
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

      // SSE streaming reader
      const reader = response.body?.getReader();
      if (!reader) {
        toast.error("Σφάλμα streaming.");
        setLoading(false);
        return;
      }
      const decoder = new TextDecoder();
      let sseBuffer = "";
      let accumulatedReply = "";

      // Add empty assistant message that we'll update
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

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
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: accumulatedReply };
              return updated;
            });
          } else if (event.type === "status") {
            setStatusMessage(event.text);
          } else if (event.type === "done") {
            accumulatedReply = event.reply || accumulatedReply;
            setMessages((prev) => {
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
      // Update final message
      setMessages((prev) => {
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

  const renderMessageContent = (content: string) => {
    const parts = parseAndRenderContent(content, sendMessage);
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

  return (
    <div className="flex h-full">
      {showSidebar && (
        <ConversationSidebar
          key={sidebarKey}
          activeConversationId={conversationId}
          onSelectConversation={loadConversation}
          onNewConversation={startNewConversation}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6">
            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
                <div className="space-y-3">
                  <h2 className="text-3xl font-semibold text-foreground">
                    Γεια{firstName ? ` ${firstName}` : ""}! 👋
                  </h2>
                  <p className="text-muted-foreground text-base max-w-md mx-auto">
                    Πώς μπορώ να σε βοηθήσω σήμερα;
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                  {quickActions.slice(0, 4).map((qa) => (
                    <button
                      key={qa.label}
                      onClick={() => sendMessage(qa.prompt)}
                      className="flex flex-col items-start gap-1 p-4 rounded-xl border border-border/60 bg-card hover:bg-accent/50 text-left text-sm text-foreground transition-colors"
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
                    {msg.role === "assistant" ? (
                      renderMessageContent(msg.content)
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
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
                    <span className="text-sm text-muted-foreground">Σκέφτομαι...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Input — floating centered */}
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
            <div className="rounded-2xl border border-border/60 bg-background shadow-lg">
              <MentionInput
                value={input}
                onChange={setInput}
                onSend={() => sendMessage(input)}
                disabled={loading}
                onSendMessage={(text) => sendMessage(text)}
                onFileUpload={async (file) => {
                  if (!user) return;
                  try {
                    const safeName = sanitizeStorageFileName(file.name);
                    const CHUNK_SIZE = 5 * 1024 * 1024;
                    if (file.size <= CHUNK_SIZE) {
                      const path = `${user.id}/${Date.now()}_${safeName}`;
                      const { error } = await supabase.storage.from("project-files").upload(path, file);
                      if (error) throw error;
                    } else {
                      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
                      const fileId = `${Date.now()}_${safeName}`;
                      toast.info(`Ανέβασμα μεγάλου αρχείου (${totalChunks} κομμάτια)...`);
                      for (let i = 0; i < totalChunks; i++) {
                        const start = i * CHUNK_SIZE;
                        const end = Math.min(start + CHUNK_SIZE, file.size);
                        const chunk = file.slice(start, end);
                        const chunkPath = `${user.id}/${fileId}_part${i}`;
                        const { error } = await supabase.storage.from("project-files").upload(chunkPath, chunk);
                        if (error) throw error;
                      }
                      const path = `${user.id}/${fileId}`;
                      const { error } = await supabase.storage.from("project-files").upload(path, file);
                      if (error) throw error;
                    }
                    toast.success(`Αρχείο "${file.name}" ανέβηκε (${(file.size / (1024 * 1024)).toFixed(1)} MB)`);
                    const textTypes = ['.csv', '.tsv', '.txt', '.json', '.xml', '.md', '.log'];
                    const isTextFile = textTypes.some(ext => file.name.toLowerCase().endsWith(ext));
                    if (isTextFile && file.size < 50 * 1024 * 1024) {
                      const textContent = await file.text();
                      const truncated = textContent.length > 10000
                        ? textContent.slice(0, 10000) + `\n\n... [αρχείο ${(file.size/1024).toFixed(0)}KB, εμφανίζονται τα πρώτα 10KB]`
                        : textContent;
                      sendMessage(`Ανέβασα αρχείο: ${file.name} (${(file.size/1024).toFixed(0)} KB)\n\nΠεριεχόμενο:\n\`\`\`\n${truncated}\n\`\`\``);
                    } else {
                      sendMessage(`Ανέβασα αρχείο: ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`);
                    }
                  } catch (err) {
                    console.error("File upload error:", err);
                    toast.error("Σφάλμα κατά το ανέβασμα αρχείου");
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
