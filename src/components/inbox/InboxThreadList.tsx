import { useState } from 'react';
import { cn } from '@/lib/utils';
import { EmailThread } from '@/hooks/useEmailMessages';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, RefreshCw, Loader2, PenSquare, Pin } from 'lucide-react';
import {
  getAvatarColor,
  getInitials,
  getFirstName,
  formatMessageTime,
  groupThreadsByTime,
  stripSignature,
} from './inboxUtils';

interface InboxThreadListProps {
  threads: EmailThread[];
  selectedThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onSync: () => void;
  syncing: boolean;
  onCompose: () => void;
  folderLabel?: string;
}

export function InboxThreadList({
  threads,
  selectedThreadId,
  onSelectThread,
  onSync,
  syncing,
  onCompose,
  folderLabel = 'Messages',
}: InboxThreadListProps) {
  const [search, setSearch] = useState('');

  const filtered = threads.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.subject.toLowerCase().includes(q) ||
      t.participants.some((p) => p.toLowerCase().includes(q)) ||
      (t.last_message?.body_text || '').toLowerCase().includes(q)
    );
  });

  const totalUnread = threads.reduce((s, t) => s + (t.unread_count || 0), 0);
  const pinned = filtered.filter((t) => t.is_starred);
  const unpinned = filtered.filter((t) => !t.is_starred);
  const groups = groupThreadsByTime(unpinned);

  const renderRow = (thread: EmailThread) => {
    const last = thread.last_message;
    const sender = last?.from_name || last?.from_address || 'Άγνωστος';
    const firstName = getFirstName(sender);
    const initials = getInitials(sender);
    const color = getAvatarColor(sender);
    const time = formatMessageTime(last?.sent_at || last?.created_at);
    const snippet = stripSignature(last?.body_text || '').replace(/\s+/g, ' ').slice(0, 80);
    const isActive = selectedThreadId === thread.thread_id;
    const isUnread = thread.unread_count > 0;

    return (
      <button
        key={thread.thread_id}
        onClick={() => onSelectThread(thread.thread_id)}
        className={cn(
          'group relative w-full text-left px-3 py-2.5 flex items-start gap-3 transition-colors border-l-[3px]',
          isActive
            ? 'bg-primary/10 border-primary'
            : 'border-transparent hover:bg-muted/60'
        )}
      >
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className={cn('text-xs font-semibold', color.bg, color.text)}>
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                'text-sm truncate',
                isUnread ? 'font-bold text-foreground' : 'font-semibold text-foreground/90'
              )}
            >
              {firstName}
            </span>
            <span
              className={cn(
                'text-[11px] shrink-0',
                isUnread ? 'text-primary font-medium' : 'text-muted-foreground'
              )}
            >
              {time}
            </span>
          </div>
          <p
            className={cn(
              'text-xs truncate mt-0.5',
              isUnread ? 'text-foreground/80 font-medium' : 'text-muted-foreground'
            )}
          >
            {thread.subject || '(χωρίς θέμα)'}
          </p>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <p className="text-xs text-muted-foreground/80 truncate">
              {snippet || '...'}
            </p>
            {isUnread && (
              <span className="shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5">
                {thread.unread_count}
              </span>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full border-r border-border bg-muted/30">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 space-y-3 border-b border-border bg-background/60 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight">{folderLabel}</h2>
            {totalUnread > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5">
                {totalUnread}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onSync}
            disabled={syncing}
            title="Συγχρονισμός"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Αναζήτηση..."
            className="pl-8 h-8 text-sm bg-muted/50 border-transparent focus-visible:bg-background"
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {search ? 'Δεν βρέθηκαν αποτελέσματα' : 'Κανένα μήνυμα ακόμα'}
          </div>
        ) : (
          <div className="py-1">
            {pinned.length > 0 && (
              <div className="mb-1">
                <div className="px-4 pt-2 pb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  <Pin className="h-3 w-3" />
                  Καρφιτσωμένα
                </div>
                {pinned.map(renderRow)}
              </div>
            )}
            {groups.map((g) => (
              <div key={g.key} className="mb-1">
                <div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  {g.key}
                </div>
                {g.items.map(renderRow)}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Bottom compose button */}
      <div className="p-3 border-t border-border bg-background/60">
        <Button onClick={onCompose} className="w-full gap-2 shadow-sm">
          <PenSquare className="h-4 w-4" />
          Νέο μήνυμα
        </Button>
      </div>
    </div>
  );
}
