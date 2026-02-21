import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { EmailThread } from '@/hooks/useEmailMessages';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Star, RefreshCw, Loader2, PenSquare } from 'lucide-react';
import { useState } from 'react';

interface InboxThreadListProps {
  threads: EmailThread[];
  selectedThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onSync: () => void;
  syncing: boolean;
  onCompose: () => void;
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

type FilterTab = 'all' | 'unread' | 'starred';

export function InboxThreadList({
  threads,
  selectedThreadId,
  onSelectThread,
  onSync,
  syncing,
  onCompose,
}: InboxThreadListProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');

  const filtered = threads.filter(t => {
    if (filter === 'unread' && t.unread_count === 0) return false;
    if (filter === 'starred' && !t.is_starred) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.subject.toLowerCase().includes(q) ||
        t.participants.some(p => p.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full border-r border-border">
      {/* Header */}
      <div className="p-4 space-y-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Inbox</h2>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCompose}>
              <PenSquare className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSync} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Αναζήτηση..."
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'unread', 'starred'] as FilterTab[]).map(tab => (
            <Button
              key={tab}
              variant={filter === tab ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setFilter(tab)}
            >
              {tab === 'all' ? 'Όλα' : tab === 'unread' ? 'Μη αναγν.' : 'Σημαντικά'}
            </Button>
          ))}
        </div>
      </div>

      {/* Thread List */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {search ? 'Δεν βρέθηκαν αποτελέσματα' : 'Κανένα email'}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(thread => {
              const last = thread.last_message;
              const sender = last.from_name || last.from_address || 'Άγνωστος';
              const time = last.sent_at
                ? format(new Date(last.sent_at), 'dd/MM HH:mm', { locale: el })
                : '';
              const preview = last.body_text?.substring(0, 80) || '';

              return (
                <button
                  key={thread.thread_id}
                  onClick={() => onSelectThread(thread.thread_id)}
                  className={cn(
                    'w-full text-left p-3 hover:bg-muted/50 transition-colors',
                    selectedThreadId === thread.thread_id && 'bg-muted',
                    thread.unread_count > 0 && 'bg-primary/5'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(sender)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn('text-sm truncate', thread.unread_count > 0 && 'font-semibold')}>
                          {sender}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">{time}</span>
                      </div>
                      <p className={cn('text-sm truncate', thread.unread_count > 0 ? 'font-medium' : 'text-muted-foreground')}>
                        {thread.subject}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{preview}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {thread.unread_count > 0 && (
                          <Badge variant="default" className="h-5 text-[10px] px-1.5">
                            {thread.unread_count}
                          </Badge>
                        )}
                        {thread.is_starred && <Star className="h-3 w-3 text-warning fill-warning" />}
                        {thread.messages.length > 1 && (
                          <span className="text-[10px] text-muted-foreground">{thread.messages.length} μηνύματα</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
