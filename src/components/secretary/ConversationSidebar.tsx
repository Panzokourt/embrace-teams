import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageSquare, Trash2, Loader2 } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { el } from "date-fns/locale";

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ConversationSidebarProps {
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  collapsed?: boolean;
}

export default function ConversationSidebar({
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  collapsed = false,
}: ConversationSidebarProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("secretary_conversations")
      .select("id, title, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50);
    setConversations(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchConversations();
  }, [user]);

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("secretary_conversations").delete().eq("id", id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) onNewConversation();
  };

  const groupConversations = () => {
    const today: Conversation[] = [];
    const yesterday: Conversation[] = [];
    const older: Conversation[] = [];

    conversations.forEach((c) => {
      const d = new Date(c.updated_at);
      if (isToday(d)) today.push(c);
      else if (isYesterday(d)) yesterday.push(c);
      else older.push(c);
    });

    return { today, yesterday, older };
  };

  if (collapsed) return null;

  const groups = groupConversations();

  return (
    <div className="w-64 border-r border-sidebar-border flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="p-3 border-b border-sidebar-border">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 rounded-full border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={onNewConversation}
        >
          <Plus className="h-4 w-4" />
          Νέα συνομιλία
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {loading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && conversations.length === 0 && (
            <p className="text-xs text-sidebar-foreground/40 text-center py-4">Χωρίς ιστορικό</p>
          )}

          {groups.today.length > 0 && (
            <ConversationGroup
              label="Σήμερα"
              items={groups.today}
              activeId={activeConversationId}
              onSelect={onSelectConversation}
              onDelete={deleteConversation}
            />
          )}
          {groups.yesterday.length > 0 && (
            <ConversationGroup
              label="Χθες"
              items={groups.yesterday}
              activeId={activeConversationId}
              onSelect={onSelectConversation}
              onDelete={deleteConversation}
            />
          )}
          {groups.older.length > 0 && (
            <ConversationGroup
              label="Παλαιότερα"
              items={groups.older}
              activeId={activeConversationId}
              onSelect={onSelectConversation}
              onDelete={deleteConversation}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function ConversationGroup({
  label,
  items,
  activeId,
  onSelect,
  onDelete,
}: {
  label: string;
  items: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider px-2 pt-2 pb-1">
        {label}
      </p>
      {items.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={cn(
            "group w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-sm transition-colors",
            activeId === c.id
              ? "bg-accent text-foreground"
              : "text-foreground/80 hover:bg-accent/50"
          )}
        >
          <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
          <span className="truncate flex-1">{c.title}</span>
          <button
            onClick={(e) => onDelete(c.id, e)}
            className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </button>
      ))}
    </div>
  );
}
