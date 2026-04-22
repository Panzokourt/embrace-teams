import { useState } from 'react';
import { useChatChannels } from '@/hooks/useChatChannels';
import { useChat } from '@/contexts/ChatContext';
import { useDock } from '@/contexts/DockContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Hash, Lock, MessageSquare, Users, Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import ChatNewDMDialog from '@/components/chat/ChatNewDMDialog';
import ChatCreateChannel from '@/components/chat/ChatCreateChannel';

function channelIcon(type: string) {
  switch (type) {
    case 'private': return <Lock className="h-3.5 w-3.5" />;
    case 'direct': return <MessageSquare className="h-3.5 w-3.5" />;
    case 'group': return <Users className="h-3.5 w-3.5" />;
    default: return <Hash className="h-3.5 w-3.5" />;
  }
}

export default function DockChatPicker() {
  const { channels, createChannel, findOrCreateDM } = useChatChannels();
  const { openFloatingWindow } = useChat();
  const { closePanel } = useDock();
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [dmOpen, setDmOpen] = useState(false);

  const filtered = channels.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));

  const handleSelect = (ch: typeof channels[0]) => {
    openFloatingWindow(ch.id, ch.name, ch.type as any);
    closePanel();
  };

  const handleCreateChannel = async (params: { name: string; type: 'public' | 'private' | 'group'; description?: string }) => {
    const ch = await createChannel(params);
    if (ch) {
      openFloatingWindow(ch.id, ch.name, ch.type as any);
      closePanel();
    }
  };

  const handleStartDM = async (userId: string) => {
    const ch = await findOrCreateDM(userId);
    if (ch) {
      openFloatingWindow(ch.id, ch.name, ch.type as any);
      closePanel();
    }
    setDmOpen(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search + actions */}
      <div className="shrink-0 px-3 py-2 space-y-2 border-b border-border/40">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Αναζήτηση συνομιλίας..."
            className="h-8 pl-7 text-xs"
          />
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="h-7 flex-1 text-[11px] gap-1" onClick={() => setDmOpen(true)}>
            <MessageSquare className="h-3 w-3" />
            Νέο DM
          </Button>
          <Button variant="outline" size="sm" className="h-7 flex-1 text-[11px] gap-1" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3 w-3" />
            Νέο κανάλι
          </Button>
        </div>
      </div>

      {/* Channel list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {filtered.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-8">
              {query ? 'Δεν βρέθηκαν αποτελέσματα' : 'Δεν υπάρχουν συνομιλίες'}
            </div>
          )}
          {filtered.map(ch => (
            <button
              key={ch.id}
              onClick={() => handleSelect(ch)}
              className={cn(
                'w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-left',
                'hover:bg-accent hover:text-accent-foreground transition-colors',
                'group'
              )}
            >
              <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                {channelIcon(ch.type)}
              </span>
              <span className="flex-1 truncate text-foreground">{ch.name}</span>
            </button>
          ))}
        </div>
      </ScrollArea>

      <ChatCreateChannel open={createOpen} onOpenChange={setCreateOpen} onCreate={handleCreateChannel} />
      <ChatNewDMDialog open={dmOpen} onOpenChange={setDmOpen} onSelectUser={handleStartDM} />
    </div>
  );
}
