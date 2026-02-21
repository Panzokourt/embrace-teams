import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { EmailMessage } from '@/hooks/useEmailMessages';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';

interface InboxMessageBubbleProps {
  message: EmailMessage;
  isOutgoing: boolean;
  userEmail: string;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function InboxMessageBubble({ message, isOutgoing, userEmail }: InboxMessageBubbleProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const senderName = message.from_name || message.from_address || 'Άγνωστος';
  const sentTime = message.sent_at
    ? format(new Date(message.sent_at), 'dd MMM, HH:mm', { locale: el })
    : '';

  const displayText = showOriginal
    ? (message.body_html ? message.body_text || '' : message.body_text || '')
    : (message.body_text || '');

  return (
    <div className={cn('flex gap-3 max-w-[85%]', isOutgoing ? 'ml-auto flex-row-reverse' : '')}>
      {!isOutgoing && (
        <Avatar className="h-8 w-8 shrink-0 mt-1">
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {getInitials(senderName)}
          </AvatarFallback>
        </Avatar>
      )}
      <div className={cn('space-y-1', isOutgoing && 'text-right')}>
        <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', isOutgoing && 'justify-end')}>
          <span className="font-medium">{isOutgoing ? 'Εσείς' : senderName}</span>
          <span>·</span>
          <span>{sentTime}</span>
        </div>
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words',
            isOutgoing
              ? 'bg-primary text-primary-foreground rounded-tr-md'
              : 'bg-muted rounded-tl-md'
          )}
        >
          {displayText || <span className="italic text-muted-foreground">(κενό μήνυμα)</span>}
        </div>
        {message.body_html && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-muted-foreground px-2"
            onClick={() => setShowOriginal(!showOriginal)}
          >
            <Eye className="h-3 w-3 mr-1" />
            {showOriginal ? 'Απόκρυψη' : 'Εμφάνιση'} πρωτοτύπου
          </Button>
        )}
      </div>
    </div>
  );
}
