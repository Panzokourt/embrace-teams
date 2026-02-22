import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bot, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import MentionInput from "./MentionInput";
import ConversationSidebar from "./ConversationSidebar";
import { parseAndRenderContent } from "./ActionRenderer";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const quickActions = [
  { label: "📋 Tasks μου", prompt: "Δείξε μου τα tasks μου" },
  { label: "📝 Νέο Brief", prompt: "Θέλω να δημιουργήσω ένα νέο brief" },
  { label: "📁 Αρχεία", prompt: "Αναζήτησε αρχεία" },
  { label: "🏖 Άδεια", prompt: "Θέλω να κάνω αίτημα άδειας" },
  { label: "📊 Projects", prompt: "Δείξε μου τα projects" },
  { label: "👥 Ομάδα", prompt: "Δείξε μου τα μέλη της ομάδας" },
];

interface SecretaryChatProps {
  mode: "full" | "panel";
}

export default function SecretaryChat({ mode }: SecretaryChatProps) {
  const { profile, user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sidebarKey, setSidebarKey] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

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

    // Get company_id
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
      .insert({
        user_id: user.id,
        company_id: companyId,
        title: "Νέα συνομιλία",
      })
      .select("id")
      .single();
    if (error) throw error;
    setConversationId(data.id);
    return data.id;
  };

  const saveMessage = async (convId: string, role: string, content: string) => {
    await supabase.from("secretary_messages").insert({
      conversation_id: convId,
      role,
      content,
    });
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

      // Update title on first message
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
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
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

      const data = await response.json();
      const reply = data.reply || "Δεν λήφθηκε απάντηση.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
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

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-foreground" />
            <h1 className="text-base font-semibold text-foreground">Secretary</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={startNewConversation} className="gap-1.5 text-muted-foreground">
            <Plus className="h-4 w-4" />
            {mode === "full" && "Νέα συνομιλία"}
          </Button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
              <div className="p-4 rounded-2xl bg-muted">
                <Bot className="h-12 w-12 text-foreground" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">
                  Γεια{firstName ? ` ${firstName}` : ""}! 👋
                </h2>
                <p className="text-muted-foreground max-w-md">
                  Είμαι ο Secretary, ο AI βοηθός σου. Μπορώ να δημιουργήσω tasks, briefs, να αναζητήσω αρχεία, να κάνω αίτημα άδειας και πολλά ακόμα.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {quickActions.map((qa) => (
                  <button
                    key={qa.label}
                    onClick={() => sendMessage(qa.prompt)}
                    className="px-3 py-2 rounded-xl border border-border/60 bg-card hover:bg-secondary/50 text-sm text-foreground transition-colors"
                  >
                    {qa.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}
            >
              {msg.role === "assistant" && (
                <div className="flex-shrink-0 mt-1">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                    <Bot className="h-4 w-4 text-foreground" />
                  </div>
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border/40"
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
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 mt-1">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                   <Bot className="h-4 w-4 text-foreground" />
                </div>
              </div>
              <div className="bg-card border border-border/40 rounded-2xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-foreground" />
                <span className="text-sm text-muted-foreground">Ο Secretary σκέφτεται...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border/40 px-4 py-3 space-y-3">
          {messages.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {quickActions.slice(0, 4).map((qa) => (
                <button
                  key={qa.label}
                  onClick={() => sendMessage(qa.prompt)}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-lg border border-border/50 bg-card hover:bg-secondary/50 text-xs text-muted-foreground transition-colors disabled:opacity-50"
                >
                  {qa.label}
                </button>
              ))}
            </div>
          )}
          <MentionInput
            value={input}
            onChange={setInput}
            onSend={() => sendMessage(input)}
            disabled={loading}
          />
        </div>
      </div>
    </div>
  );
}
