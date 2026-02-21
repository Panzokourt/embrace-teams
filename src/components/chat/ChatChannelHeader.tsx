import { Hash, Lock, Users, Pin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatChannel } from '@/hooks/useChatChannels';

interface ChatChannelHeaderProps {
  channel: ChatChannel;
}

function channelIcon(type: string) {
  switch (type) {
    case 'private': return <Lock className="h-4 w-4" />;
    case 'direct': return <Users className="h-4 w-4" />;
    case 'group': return <Users className="h-4 w-4" />;
    default: return <Hash className="h-4 w-4" />;
  }
}

export default function ChatChannelHeader({ channel }: ChatChannelHeaderProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 shrink-0 bg-background/80 backdrop-blur-sm">
      <span className="text-muted-foreground">{channelIcon(channel.type)}</span>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold truncate">{channel.name}</h3>
        {channel.description && (
          <p className="text-xs text-muted-foreground/60 truncate">{channel.description}</p>
        )}
      </div>
    </div>
  );
}
