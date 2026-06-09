import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { EmailMessage } from '@/hooks/useEmailMessages';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Eye, Paperclip, Download, Check, CheckCheck } from 'lucide-react';
import {
  getAvatarColor,
  getInitials,
  formatBubbleTime,
  sanitizeEmailHtml,
  linkifyText,
  classifyEmail,
  extractCleanPersonalText,
} from './inboxUtils';

interface EmailAttachment {
  id: string;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  gmail_attachment_id: string | null;
}

interface InboxMessageBubbleProps {
  message: EmailMessage;
  isOutgoing: boolean;
  userEmail: string;
  attachments?: EmailAttachment[];
  onDownloadAttachment?: (attachment: EmailAttachment) => void;
  showAvatar?: boolean;
  isGroupedWithPrev?: boolean;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function InboxMessageBubble({
  message,
  isOutgoing,
  attachments,
  onDownloadAttachment,
  showAvatar = true,
  isGroupedWithPrev = false,
}: InboxMessageBubbleProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const senderName = message.from_name || message.from_address || 'Άγνωστος';
  const sentTime = formatBubbleTime(message.sent_at);
  const color = getAvatarColor(senderName);
  const showAvatarSlot = !isOutgoing;

  const isRichHtml = hasMeaningfulHtml(message.body_html);

  const sanitizedHtml = useMemo(
    () => (isRichHtml ? sanitizeEmailHtml(message.body_html || '') : ''),
    [isRichHtml, message.body_html]
  );

  const rawText = message.body_text || '';
  const displayText = showOriginal ? rawText : stripSignature(rawText);
  const linkifiedText = useMemo(() => linkifyText(displayText), [displayText]);
  const canToggle = !isRichHtml && rawText && rawText !== displayText;

  return (
    <div
      className={cn(
        'group flex gap-2',
        isOutgoing ? 'justify-end' : 'justify-start',
        isGroupedWithPrev ? 'mt-1' : 'mt-3'
      )}
    >
      {showAvatarSlot && (
        <div className="w-7 shrink-0">
          {showAvatar && !isGroupedWithPrev && (
            <Avatar className="h-7 w-7">
              <AvatarFallback className={cn('text-[10px] font-semibold', color.bg, color.text)}>
                {getInitials(senderName)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      <div
        className={cn(
          'flex flex-col',
          isRichHtml ? 'max-w-[88%] w-full' : 'max-w-[72%]',
          isOutgoing && 'items-end'
        )}
      >
        <div className="relative w-full">
          {isRichHtml ? (
            <div
              className={cn(
                'overflow-hidden rounded-2xl border bg-card text-foreground shadow-sm',
                isOutgoing ? 'border-primary/30' : 'border-border/60'
              )}
            >
              <div
                className="email-html-body p-4 text-[14px] leading-[1.55] overflow-x-auto"
                // Sanitized via DOMPurify in sanitizeEmailHtml
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
              />
            </div>
          ) : (
            <div
              className={cn(
                'px-3.5 py-2 text-[14px] leading-[1.55] whitespace-pre-wrap break-words shadow-sm',
                isOutgoing
                  ? 'bg-primary text-primary-foreground rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl'
                  : 'bg-card border border-border/60 text-foreground rounded-tl-sm rounded-tr-2xl rounded-bl-2xl rounded-br-2xl',
                isGroupedWithPrev && (isOutgoing ? 'rounded-tr-2xl' : 'rounded-tl-2xl')
              )}
            >
              {linkifiedText ? (
                <span dangerouslySetInnerHTML={{ __html: linkifiedText }} />
              ) : (
                <span className="italic opacity-70">(κενό μήνυμα)</span>
              )}
            </div>
          )}

          {/* Hover reaction bar */}
          <div
            className={cn(
              'absolute -top-7 hidden group-hover:flex items-center gap-0.5 bg-popover border border-border rounded-full px-1.5 py-0.5 shadow-md z-10',
              isOutgoing ? 'right-1' : 'left-1'
            )}
          >
            {['👍', '❤️', '😄', '🎯'].map((e) => (
              <button
                key={e}
                className="text-sm hover:scale-125 transition-transform px-0.5"
                onClick={(ev) => ev.preventDefault()}
                type="button"
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Attachments */}
        {attachments && attachments.length > 0 && (
          <div className={cn('flex flex-wrap gap-1.5 mt-1.5', isOutgoing && 'justify-end')}>
            {attachments.map((att) => (
              <button
                key={att.id}
                onClick={() => onDownloadAttachment?.(att)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-muted hover:bg-muted/80 text-foreground border border-border/40 transition-colors"
              >
                <Paperclip className="h-3 w-3 text-muted-foreground" />
                <span className="truncate max-w-[140px]">{att.filename}</span>
                {att.size_bytes && (
                  <span className="text-muted-foreground">{formatFileSize(att.size_bytes)}</span>
                )}
                <Download className="h-3 w-3 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        {/* Meta row */}
        <div
          className={cn(
            'flex items-center gap-1 mt-1 text-[10.5px] text-muted-foreground',
            isOutgoing && 'flex-row-reverse'
          )}
        >
          <span>{sentTime}</span>
          {isOutgoing && (
            message.is_read ? (
              <CheckCheck className="h-3 w-3 text-primary" />
            ) : (
              <Check className="h-3 w-3" />
            )
          )}
          {canToggle && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 text-[10px] text-muted-foreground/80 px-1.5 hover:bg-transparent hover:text-foreground"
              onClick={() => setShowOriginal(!showOriginal)}
            >
              <Eye className="h-2.5 w-2.5 mr-0.5" />
              {showOriginal ? 'Συμπτυγμένη' : 'Πλήρης'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

