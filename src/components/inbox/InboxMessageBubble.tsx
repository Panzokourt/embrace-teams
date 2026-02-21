import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { EmailMessage } from '@/hooks/useEmailMessages';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, Paperclip, Download } from 'lucide-react';

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
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function stripEmailClutter(text: string): string {
  if (!text) return '';
  let clean = text;
  // Strip unsubscribe lines
  clean = clean.replace(/^.*unsubscribe.*$/gmi, '');
  // Strip disclaimer/confidentiality
  clean = clean.replace(/^.*(?:confidential|disclaimer|this email is intended).*$/gmi, '');
  // Strip address blocks (lines with zip codes etc)
  clean = clean.replace(/^\s*\d{3,5}\s+\w.*(?:street|ave|blvd|road|rd|st)\b.*$/gmi, '');
  // Trim excessive blank lines
  clean = clean.replace(/\n{3,}/g, '\n\n');
  return clean.trim();
}

function extractImagesFromHtml(html: string | null): string[] {
  if (!html) return [];
  const imgs: string[] = [];
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1];
    // Skip tracking pixels and tiny images, skip CID references
    if (src.startsWith('cid:')) continue;
    if (src.includes('tracking') || src.includes('pixel') || src.includes('beacon')) continue;
    imgs.push(src);
  }
  return imgs;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function InboxMessageBubble({ message, isOutgoing, userEmail, attachments, onDownloadAttachment }: InboxMessageBubbleProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const senderName = message.from_name || message.from_address || 'Άγνωστος';
  const sentTime = message.sent_at
    ? format(new Date(message.sent_at), 'dd MMM, HH:mm', { locale: el })
    : '';

  const rawText = message.body_text || '';
  const displayText = showOriginal ? rawText : stripEmailClutter(rawText);
  const images = extractImagesFromHtml(message.body_html);

  return (
    <div className={cn('flex gap-3', isOutgoing ? 'justify-end' : 'justify-start')}>
      {!isOutgoing && (
        <Avatar className="h-8 w-8 shrink-0 mt-1">
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {getInitials(senderName)}
          </AvatarFallback>
        </Avatar>
      )}
      <div className={cn('space-y-1 max-w-[75%]', isOutgoing && 'text-right')}>
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
              : 'bg-white dark:bg-card border border-border/40 rounded-tl-md text-foreground'
          )}
        >
          {displayText || <span className="italic text-muted-foreground">(κενό μήνυμα)</span>}
        </div>

        {/* Images from HTML */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {images.map((src, i) => (
              <a key={i} href={src} target="_blank" rel="noopener noreferrer">
                <img
                  src={src}
                  alt={`Image ${i + 1}`}
                  className="max-w-[200px] max-h-[150px] rounded-lg border border-border/40 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        )}

        {/* Attachment chips */}
        {attachments && attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {attachments.map(att => (
              <button
                key={att.id}
                onClick={() => onDownloadAttachment?.(att)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs',
                  'bg-muted hover:bg-muted/80 text-foreground border border-border/40 transition-colors'
                )}
              >
                <Paperclip className="h-3 w-3 text-muted-foreground" />
                <span className="truncate max-w-[120px]">{att.filename}</span>
                {att.size_bytes && (
                  <span className="text-muted-foreground">{formatFileSize(att.size_bytes)}</span>
                )}
                <Download className="h-3 w-3 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        {(message.body_html || rawText !== displayText) && (
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
