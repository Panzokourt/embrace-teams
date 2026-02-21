import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bot, Send, Plus, ClipboardList, FileText, FolderOpen, Palmtree, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

export default function Secretary() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
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
        if (response.status === 429) {
          toast.error("Πολλά αιτήματα. Δοκίμασε ξανά σε λίγο.");
        } else if (response.status === 402) {
          toast.error("Απαιτείται ανανέωση credits.");
        } else {
          toast.error(errData.error || "Κάτι πήγε στραβά.");
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply || "Δεν λήφθηκε απάντηση." }]);
    } catch (err) {
      console.error("Secretary error:", err);
      toast.error("Σφάλμα επικοινωνίας με τον Secretary.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const resetChat = () => {
    setMessages([]);
    setInput("");
  };

  const firstName = profile?.full_name?.split(" ")[0] || "";

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">Secretary</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={resetChat} className="gap-1.5 text-muted-foreground">
          <Plus className="h-4 w-4" />
          Νέα συνομιλία
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="p-4 rounded-2xl bg-primary/10">
              <Bot className="h-12 w-12 text-primary" />
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
            className={cn(
              "flex gap-3",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === "assistant" && (
              <div className="flex-shrink-0 mt-1">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
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
                <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 mt-1">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="bg-card border border-border/40 rounded-2xl px-4 py-3 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
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
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Γράψε μήνυμα..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border/60 bg-background px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 max-h-32 min-h-[44px]"
            style={{ height: "auto", overflow: "hidden" }}
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 128) + "px";
            }}
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            size="icon"
            className="h-11 w-11 rounded-xl flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
