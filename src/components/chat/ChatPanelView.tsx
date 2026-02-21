import { useState } from 'react';
import { useChatChannels, type ChatChannel } from '@/hooks/useChatChannels';
import ChatChannelView from './ChatChannelView';
import ChatNewDMDialog from './ChatNewDMDialog';
import ChatCreateChannel from './ChatCreateChannel';
import { Button } from '@/components/ui/button';
import { Hash, Lock, MessageSquare, Users, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export default function ChatPanelView() {
  const { channels, createChannel, findOrCreateDM } = useChatChannels();
  const [activeChannel, setActiveChannel] = useState<ChatChannel | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [dmOpen, setDmOpen] = useState(false);

  const handleCreateChannel = async (params: { name: string; type: 'public' | 'private' | 'group'; description?: string }) => {
    const ch = await createChannel(params);
    if (ch) setActiveChannel({ ...ch, type: ch.type as ChatChannel['type'] } as ChatChannel);
  };

  const handleStartDM = async (userId: string) => {
    const ch = await findOrCreateDM(userId);
    if (ch) setActiveChannel(ch as any);
    setDmOpen(false);
  };

  function channelIcon(type: string) {
    switch (type) {
      case 'private': return <Lock className="h-3 w-3" />;
      case 'direct': return <MessageSquare className="h-3 w-3" />;
      case 'group': return <Users className="h-3 w-3" />;
      default: return <Hash className="h-3 w-3" />;
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Channel pills */}
      <div className="shrink-0 border-b border-border/40 px-2 py-2">
        <ScrollArea className="w-full">
          <div className="flex items-center gap-1">
            {channels.map(ch => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch)}
                className={cn(
                  "inline-flex items-center gap-1 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  activeChannel?.id === ch.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                )}
              >
                {channelIcon(ch.type)}
                <span className="truncate max-w-[80px]">{ch.name}</span>
              </button>
            ))}
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setDmOpen(true)}>
              <MessageSquare className="h-3 w-3" />
            </Button>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Active channel view */}
      <div className="flex-1 overflow-hidden">
        <ChatChannelView channel={activeChannel} compact hideHeader />
      </div>

      <ChatCreateChannel open={createOpen} onOpenChange={setCreateOpen} onCreate={handleCreateChannel} />
      <ChatNewDMDialog open={dmOpen} onOpenChange={setDmOpen} onSelectUser={handleStartDM} />
    </div>
  );
}
