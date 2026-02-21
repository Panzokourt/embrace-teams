import { X, Minus, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useChat, type FloatingWindow as FloatingWindowType } from '@/contexts/ChatContext';
import ChatChannelView from './ChatChannelView';
import type { ChatChannel } from '@/hooks/useChatChannels';

interface ChatFloatingWindowProps {
  window: FloatingWindowType;
  index: number;
}

export default function ChatFloatingWindow({ window: win, index }: ChatFloatingWindowProps) {
  const { closeFloatingWindow, minimizeFloatingWindow, restoreFloatingWindow } = useChat();

  // Create a minimal channel object
  const channel: ChatChannel = {
    id: win.channelId,
    company_id: '',
    project_id: null,
    name: win.channelName,
    description: null,
    type: win.channelType,
    created_by: '',
    is_archived: false,
    avatar_url: null,
    last_message_at: '',
    created_at: '',
    updated_at: '',
  };

  if (win.minimized) {
    return (
      <button
        onClick={() => restoreFloatingWindow(win.channelId)}
        className="h-12 px-4 bg-card border border-border/40 rounded-t-xl shadow-lg flex items-center gap-2 hover:bg-muted/30 transition-colors"
        style={{ right: `${index * 100 + 20}px` }}
      >
        <span className="text-xs font-medium truncate max-w-[120px]">{win.channelName}</span>
      </button>
    );
  }

  return (
    <div
      className="w-[350px] h-[450px] bg-card border border-border/40 rounded-t-xl shadow-xl flex flex-col overflow-hidden"
      style={{ right: `${index * 370 + 20}px` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-primary/5 border-b border-border/40 shrink-0">
        <span className="text-sm font-semibold truncate">{win.channelName}</span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => minimizeFloatingWindow(win.channelId)}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => closeFloatingWindow(win.channelId)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Chat content */}
      <div className="flex-1 overflow-hidden">
        <ChatChannelView channel={channel} compact hideHeader />
      </div>
    </div>
  );
}
