import { useState } from 'react';
import { useChatChannels, type ChatChannel } from '@/hooks/useChatChannels';
import ChatSidebar from './ChatSidebar';
import ChatChannelView from './ChatChannelView';
import ChatCreateChannel from './ChatCreateChannel';
import ChatNewDMDialog from './ChatNewDMDialog';

export default function ChatPage() {
  const { channels, loading, createChannel, findOrCreateDM } = useChatChannels();
  const [activeChannel, setActiveChannel] = useState<ChatChannel | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [dmOpen, setDmOpen] = useState(false);

  const handleCreateChannel = async (params: { name: string; type: 'public' | 'private' | 'group'; description?: string }) => {
    const ch = await createChannel(params);
    if (ch) {
      setActiveChannel({ ...ch, type: ch.type as ChatChannel['type'] } as ChatChannel);
    }
  };

  const handleStartDM = async (userId: string) => {
    const ch = await findOrCreateDM(userId);
    if (ch) {
      setActiveChannel(ch as any);
    }
    setDmOpen(false);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <ChatSidebar
        channels={channels}
        activeChannelId={activeChannel?.id || null}
        onSelectChannel={setActiveChannel}
        onCreateChannel={() => setCreateOpen(true)}
        onNewDM={() => setDmOpen(true)}
      />
      <ChatChannelView channel={activeChannel} />

      <ChatCreateChannel
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreateChannel}
      />
      <ChatNewDMDialog
        open={dmOpen}
        onOpenChange={setDmOpen}
        onSelectUser={handleStartDM}
      />
    </div>
  );
}
