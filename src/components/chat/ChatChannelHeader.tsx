import { useState } from 'react';
import { Hash, Lock, Users, Search, Brain, Users2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ChatChannel } from '@/hooks/useChatChannels';
import type { ChatMessage } from '@/hooks/useChatMessages';
import ChatSearchDialog from './ChatSearchDialog';
import ChatMemberManager from './ChatMemberManager';

interface ChatChannelHeaderProps {
  channel: ChatChannel;
  messages?: ChatMessage[];
  onNavigateToChannel?: (channelId: string) => void;
}

function channelIcon(type: string) {
  switch (type) {
    case 'private': return <Lock className="h-4 w-4" />;
    case 'direct': return <Users className="h-4 w-4" />;
    case 'group': return <Users className="h-4 w-4" />;
    default: return <Hash className="h-4 w-4" />;
  }
}

export default function ChatChannelHeader({ channel, messages, onNavigateToChannel }: ChatChannelHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const handleAIAction = async (action: 'summarize' | 'action-items' | 'weekly-recap') => {
    if (!messages?.length) { toast.info('Δεν υπάρχουν μηνύματα για ανάλυση'); return; }
    setAiLoading(true);
    try {
      const inputMessages = messages.slice(-50).map(m => ({
        sender: m.sender?.full_name || 'Unknown',
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke('chat-ai-assistant', {
        body: { action, channelId: channel.id, messages: inputMessages },
      });

      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }

      toast.success(
        <div className="max-w-md">
          <p className="font-semibold mb-1">
            {action === 'summarize' ? 'Σύνοψη' : action === 'action-items' ? 'Action Items' : 'Εβδομαδιαία Αναφορά'}
          </p>
          <p className="text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">{data.result}</p>
        </div>,
        { duration: 15000 }
      );
    } catch (err) {
      console.error('AI action failed:', err);
      toast.error('Αποτυχία AI ανάλυσης');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 shrink-0 bg-background/80 backdrop-blur-sm">
        <span className="text-muted-foreground">{channelIcon(channel.type)}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate">{channel.name}</h3>
          {channel.description && (
            <p className="text-xs text-muted-foreground/60 truncate">{channel.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSearchOpen(true)} title="Αναζήτηση">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMembersOpen(true)} title="Μέλη">
            <Users2 className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={aiLoading} title="AI">
                <Brain className={cn("h-4 w-4", aiLoading && "animate-pulse")} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleAIAction('summarize')}>📝 Σύνοψη συζήτησης</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAIAction('action-items')}>✅ Εξαγωγή Action Items</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAIAction('weekly-recap')}>📊 Εβδομαδιαία αναφορά</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ChatSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onNavigate={(channelId, messageId) => onNavigateToChannel?.(channelId)}
      />
      <ChatMemberManager
        open={membersOpen}
        onOpenChange={setMembersOpen}
        channelId={channel.id}
      />
    </>
  );
}
