import { useChat } from '@/contexts/ChatContext';
import ChatFloatingWindow from './ChatFloatingWindow';

export default function ChatFloatingBubbles() {
  const { floatingWindows } = useChat();

  if (floatingWindows.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-end gap-2 pointer-events-none">
      {floatingWindows.map((win, i) => (
        <div key={win.channelId} className="pointer-events-auto">
          <ChatFloatingWindow window={win} index={i} />
        </div>
      ))}
    </div>
  );
}
