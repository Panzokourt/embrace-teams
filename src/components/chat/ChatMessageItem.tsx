import { useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { el } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from '@/components/ui/dropdown-menu';
import { MessageSquare, Pin, MoreHorizontal, Pencil, Trash2, CheckSquare, FileText, Tag, SmilePlus, Link2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { ChatMessage } from '@/hooks/useChatMessages';
import { useNavigate } from 'react-router-dom';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '✅'];
const TAG_OPTIONS = [
  { value: 'urgent', label: '🔴 Επείγον', color: 'bg-destructive/10 text-destructive border-destructive/30' },
  { value: 'approved', label: '✅ Εγκρίθηκε', color: 'bg-green-500/10 text-green-700 border-green-500/30' },
  { value: 'pending', label: '🟡 Εκκρεμεί', color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30' },
  { value: 'info', label: 'ℹ️ Πληροφορία', color: 'bg-blue-500/10 text-blue-700 border-blue-500/30' },
];

interface ChatMessageItemProps {
  message: ChatMessage;
  onReply?: (message: ChatMessage) => void;
  onPin?: (messageId: string, pinned: boolean) => void;
  onDelete?: (messageId: string) => void;
  onEdit?: (messageId: string, content: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  onRemoveReaction?: (messageId: string, emoji: string) => void;
  onOpenThread?: (message: ChatMessage) => void;
  onAddTag?: (messageId: string, tag: string) => void;
  onRemoveTag?: (tagId: string, messageId: string) => void;
  compact?: boolean;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Χθες ' + format(d, 'HH:mm');
  return format(d, 'dd MMM HH:mm', { locale: el });
}

// Parse @mentions in content and render as clickable badges
function renderContent(content: string, metadata?: Record<string, any>) {
  const mentions = metadata?.mentions as { type: string; id: string; name: string }[] | undefined;
  if (!mentions?.length) return <span>{content}</span>;

  // Simple approach: highlight @Name patterns
  let result = content;
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;

  mentions.forEach((m, i) => {
    const pattern = `@${m.name}`;
    const idx = result.indexOf(pattern, lastIndex);
    if (idx >= 0) {
      if (idx > lastIndex) parts.push(result.slice(lastIndex, idx));
      parts.push(
        <span key={i} className="inline-flex items-center gap-0.5 bg-primary/15 text-primary rounded px-1 py-0.5 text-xs font-medium cursor-pointer hover:bg-primary/25" data-mention-type={m.type} data-mention-id={m.id}>
          @{m.name}
        </span>
      );
      lastIndex = idx + pattern.length;
    }
  });
  if (lastIndex < result.length) parts.push(result.slice(lastIndex));

  return <>{parts}</>;
}

export default function ChatMessageItem({
  message,
  onReply,
  onPin,
  onDelete,
  onEdit,
  onReaction,
  onRemoveReaction,
  onOpenThread,
  onAddTag,
  onRemoveTag,
  compact,
}: ChatMessageItemProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hovering, setHovering] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const isOwn = user?.id === message.user_id;
  const initials = message.sender?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  const reactionGroups = (message.reactions || []).reduce<Record<string, string[]>>((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = [];
    acc[r.emoji].push(r.user_id);
    return acc;
  }, {});

  const handleEditSave = () => {
    if (editContent.trim() && onEdit) onEdit(message.id, editContent);
    setEditing(false);
  };

  const handleDownload = async (att: ChatMessage['attachments'][number]) => {
    const { data } = await supabase.storage.from('chat-attachments').createSignedUrl(att.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const handleConvertToTask = () => {
    // Navigate to tasks with pre-filled content
    const params = new URLSearchParams({ from_chat: message.content.slice(0, 200), message_id: message.id });
    navigate(`/tasks?${params.toString()}`);
  };

  if (message.message_type === 'system') {
    return (
      <div className="flex justify-center py-1">
        <span className="text-xs text-muted-foreground/60 bg-muted/30 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex gap-2 px-3 py-1.5 transition-colors hover:bg-muted/20 relative",
        compact && "px-2 py-1",
        message.is_pinned && "bg-primary/5 border-l-2 border-primary"
      )}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <Avatar className={cn("shrink-0", compact ? "h-6 w-6" : "h-8 w-8")}>
        <AvatarImage src={message.sender?.avatar_url || undefined} />
        <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className={cn("font-semibold truncate", compact ? "text-xs" : "text-sm")}>
            {message.sender?.full_name || message.sender?.email || 'Unknown'}
          </span>
          <span className="text-[10px] text-muted-foreground/60 shrink-0">{formatTime(message.created_at)}</span>
          {message.is_edited && <span className="text-[10px] text-muted-foreground/40">(edited)</span>}
          {message.is_pinned && <Pin className="h-3 w-3 text-primary/60" />}
        </div>

        {editing ? (
          <div className="mt-1 flex gap-1">
            <input
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleEditSave(); if (e.key === 'Escape') setEditing(false); }}
              className="flex-1 text-sm bg-secondary/30 rounded px-2 py-1 border border-border/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
              autoFocus
            />
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-7 text-xs">Ακύρωση</Button>
            <Button size="sm" onClick={handleEditSave} className="h-7 text-xs">Αποθήκευση</Button>
          </div>
        ) : (
          <p className={cn("whitespace-pre-wrap break-words", compact ? "text-xs" : "text-sm")}>
            {renderContent(message.content, message.metadata)}
          </p>
        )}

        {/* Tags */}
        {(message.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {(message.tags || []).map(t => {
              const tagDef = TAG_OPTIONS.find(to => to.value === t.tag);
              return (
                <span key={t.id} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] border cursor-pointer", tagDef?.color || 'bg-muted/30 border-border/40')}
                  onClick={() => onRemoveTag?.(t.id, message.id)}
                  title="Κλικ για αφαίρεση"
                >
                  {tagDef?.label || t.tag}
                </span>
              );
            })}
          </div>
        )}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {message.attachments.map(att => {
              const isImage = att.content_type?.startsWith('image/');
              return (
                <div key={att.id} className="flex items-center gap-1.5 bg-muted/30 rounded-lg px-2 py-1 text-xs cursor-pointer hover:bg-muted/50" onClick={() => handleDownload(att)}>
                  {isImage && <span className="text-primary">🖼️</span>}
                  <span className="truncate max-w-[150px]">{att.file_name}</span>
                  <Download className="h-3 w-3 text-muted-foreground" />
                </div>
              );
            })}
          </div>
        )}

        {/* Reactions */}
        {Object.keys(reactionGroups).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(reactionGroups).map(([emoji, users]) => (
              <button
                key={emoji}
                onClick={() => {
                  if (users.includes(user?.id || '')) {
                    onRemoveReaction?.(message.id, emoji);
                  } else {
                    onReaction?.(message.id, emoji);
                  }
                }}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border transition-colors",
                  users.includes(user?.id || '')
                    ? "border-primary/40 bg-primary/10"
                    : "border-border/40 hover:bg-muted/40"
                )}
              >
                <span>{emoji}</span>
                <span className="text-muted-foreground">{users.length}</span>
              </button>
            ))}
          </div>
        )}

        {/* Thread indicator */}
        {(message.reply_count || 0) > 0 && (
          <button
            onClick={() => onOpenThread?.(message)}
            className="flex items-center gap-1 mt-1 text-xs text-primary hover:underline"
          >
            <MessageSquare className="h-3 w-3" />
            {message.reply_count} {message.reply_count === 1 ? 'απάντηση' : 'απαντήσεις'}
          </button>
        )}
      </div>

      {/* Hover actions */}
      {hovering && !editing && (
        <div className="absolute top-0 right-2 flex items-center gap-0.5 bg-popover border border-border/40 rounded-lg shadow-sm p-0.5 -translate-y-1/2">
          {QUICK_REACTIONS.slice(0, 3).map(emoji => (
            <button
              key={emoji}
              onClick={() => onReaction?.(message.id, emoji)}
              className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted/60 text-sm"
            >
              {emoji}
            </button>
          ))}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onReply?.(message)}>
            <MessageSquare className="h-3 w-3" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => onOpenThread?.(message)}>
                <MessageSquare className="h-4 w-4 mr-2" /> Νήμα συζήτησης
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPin?.(message.id, !message.is_pinned)}>
                <Pin className="h-4 w-4 mr-2" /> {message.is_pinned ? 'Unpin' : 'Pin'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleConvertToTask}>
                <CheckSquare className="h-4 w-4 mr-2" /> Μετατροπή σε Task
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Tag className="h-4 w-4 mr-2" /> Ετικέτα
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {TAG_OPTIONS.map(t => (
                    <DropdownMenuItem key={t.value} onClick={() => onAddTag?.(message.id, t.value)}>
                      {t.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              {isOwn && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { setEditing(true); setEditContent(message.content); }}>
                    <Pencil className="h-4 w-4 mr-2" /> Επεξεργασία
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete?.(message.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" /> Διαγραφή
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
