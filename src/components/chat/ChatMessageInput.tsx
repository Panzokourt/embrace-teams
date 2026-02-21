import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChatMessageInputProps {
  onSend: (content: string) => void;
  onFileUpload?: (files: FileList) => void;
  placeholder?: string;
  disabled?: boolean;
  compact?: boolean;
  replyingTo?: { id: string; content: string; senderName: string } | null;
  onCancelReply?: () => void;
}

const EMOJI_QUICK = ['👍', '❤️', '😂', '🎉', '🔥', '👀', '✅', '💯'];

export default function ChatMessageInput({
  onSend,
  onFileUpload,
  placeholder = 'Γράψε μήνυμα...',
  disabled,
  compact,
  replyingTo,
  onCancelReply,
}: ChatMessageInputProps) {
  const [content, setContent] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [content]);

  const handleSend = () => {
    if (!content.trim() || disabled) return;
    onSend(content);
    setContent('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length && onFileUpload) {
      onFileUpload(e.target.files);
      e.target.value = '';
    }
  };

  const insertEmoji = (emoji: string) => {
    setContent(prev => prev + emoji);
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="border-t border-border/40 bg-background">
      {replyingTo && (
        <div className="flex items-center gap-2 px-3 pt-2 text-xs text-muted-foreground">
          <div className="w-0.5 h-4 bg-primary rounded-full" />
          <span className="font-medium">{replyingTo.senderName}</span>
          <span className="truncate flex-1">{replyingTo.content}</span>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onCancelReply}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      <div className={cn("flex items-end gap-1 p-2", compact && "p-1.5")}>
        {onFileUpload && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className={cn("shrink-0", compact ? "h-7 w-7" : "h-8 w-8")}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </>
        )}

        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              "w-full resize-none rounded-lg border border-border/60 bg-secondary/20 px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all",
              compact && "text-xs py-1.5 px-2"
            )}
          />

          {showEmoji && (
            <div className="absolute bottom-full mb-1 left-0 bg-popover border border-border/60 rounded-lg shadow-lg p-2 flex gap-1 z-50">
              {EMOJI_QUICK.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  className="h-8 w-8 flex items-center justify-center rounded hover:bg-secondary/60 text-lg transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className={cn("shrink-0", compact ? "h-7 w-7" : "h-8 w-8")}
          onClick={() => setShowEmoji(!showEmoji)}
        >
          <Smile className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
        </Button>

        <Button
          size="icon"
          className={cn("shrink-0", compact ? "h-7 w-7" : "h-8 w-8")}
          onClick={handleSend}
          disabled={!content.trim() || disabled}
        >
          <Send className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
        </Button>
      </div>
    </div>
  );
}
