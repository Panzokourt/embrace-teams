import { useState } from 'react';
import { Hash, Lock, Users, Search, Plus, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { ChatChannel } from '@/hooks/useChatChannels';

interface ChatSidebarProps {
  channels: ChatChannel[];
  activeChannelId: string | null;
  onSelectChannel: (channel: ChatChannel) => void;
  onCreateChannel: () => void;
  onNewDM: () => void;
  compact?: boolean;
}

function channelIcon(type: string, className?: string) {
  switch (type) {
    case 'private': return <Lock className={cn('h-4 w-4', className)} />;
    case 'direct': return <MessageSquare className={cn('h-4 w-4', className)} />;
    case 'group': return <Users className={cn('h-4 w-4', className)} />;
    default: return <Hash className={cn('h-4 w-4', className)} />;
  }
}

export default function ChatSidebar({
  channels,
  activeChannelId,
  onSelectChannel,
  onCreateChannel,
  onNewDM,
  compact,
}: ChatSidebarProps) {
  const [search, setSearch] = useState('');

  const filtered = channels.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const publicChannels = filtered.filter(c => c.type === 'public' || c.type === 'private');
  const projectChannels = filtered.filter(c => c.project_id);
  const directMessages = filtered.filter(c => c.type === 'direct' || c.type === 'group');

  const regularChannels = publicChannels.filter(c => !c.project_id);

  return (
    <div className={cn("flex flex-col h-full bg-card/50", compact ? "w-full" : "w-64 border-r border-border/40")}>
      {/* Header */}
      <div className="p-3 space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Chat</h3>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onNewDM} title="Νέο DM">
              <MessageSquare className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCreateChannel} title="Νέο κανάλι">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Αναζήτηση..."
            className="h-8 pl-7 text-xs"
          />
        </div>
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-3">
        {regularChannels.length > 0 && (
          <ChannelGroup title="Κανάλια" channels={regularChannels} activeId={activeChannelId} onSelect={onSelectChannel} />
        )}
        {projectChannels.length > 0 && (
          <ChannelGroup title="Κανάλια Έργων" channels={projectChannels} activeId={activeChannelId} onSelect={onSelectChannel} />
        )}
        {directMessages.length > 0 && (
          <ChannelGroup title="Μηνύματα" channels={directMessages} activeId={activeChannelId} onSelect={onSelectChannel} />
        )}
        {filtered.length === 0 && (
          <div className="text-xs text-muted-foreground/60 text-center py-4">
            {search ? 'Δεν βρέθηκαν κανάλια' : 'Δεν υπάρχουν κανάλια ακόμα'}
          </div>
        )}
      </div>
    </div>
  );
}

function ChannelGroup({
  title,
  channels,
  activeId,
  onSelect,
}: {
  title: string;
  channels: ChatChannel[];
  activeId: string | null;
  onSelect: (c: ChatChannel) => void;
}) {
  return (
    <div>
      <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider px-2">
        {title}
      </span>
      <div className="mt-1 space-y-0.5">
        {channels.map(ch => (
          <button
            key={ch.id}
            onClick={() => onSelect(ch)}
            className={cn(
              "flex items-center gap-2 w-full rounded-lg px-2 py-1.5 text-sm transition-colors text-left",
              activeId === ch.id
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
            )}
          >
            {channelIcon(ch.type, activeId === ch.id ? 'text-primary' : 'text-muted-foreground/60')}
            <span className="truncate text-xs">{ch.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
