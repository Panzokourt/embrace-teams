import { useRef, useEffect } from 'react';
import { EmailThread } from '@/hooks/useEmailMessages';
import { InboxMessageBubble } from './InboxMessageBubble';
import { InboxComposeInput } from './InboxComposeInput';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Star, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InboxConversationProps {
  thread: EmailThread;
  userEmail: string;
  onSend: (params: any) => Promise<any>;
  onToggleStar: (messageId: string, starred: boolean) => void;
  onBack?: () => void;
}

export function InboxConversation({ thread, userEmail, onSend, onToggleStar, onBack }: InboxConversationProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread.messages.length]);

  const lastMessage = thread.messages[thread.messages.length - 1];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        {onBack && (
          <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{thread.subject}</h3>
          <p className="text-xs text-muted-foreground truncate">
            {thread.participants.join(', ')} · {thread.messages.length} μηνύματα
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onToggleStar(lastMessage.id, !thread.is_starred)}
        >
          <Star className={cn('h-4 w-4', thread.is_starred && 'text-warning fill-warning')} />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-3xl mx-auto">
          {thread.messages.map(msg => (
            <InboxMessageBubble
              key={msg.id}
              message={msg}
              isOutgoing={msg.from_address?.toLowerCase() === userEmail.toLowerCase() || msg.folder === 'Sent'}
              userEmail={userEmail}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Reply */}
      <InboxComposeInput
        onSend={onSend}
        replyTo={{
          message_id: lastMessage.id,
          subject: thread.subject,
          to: lastMessage.from_address || '',
        }}
      />
    </div>
  );
}
