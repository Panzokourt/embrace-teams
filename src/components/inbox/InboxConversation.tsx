import { useRef, useEffect, useState, Fragment } from 'react';
import { EmailThread } from '@/hooks/useEmailMessages';
import { InboxMessageBubble } from './InboxMessageBubble';
import { InboxComposeInput } from './InboxComposeInput';
import { InboxEntityLinker } from './InboxEntityLinker';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Star,
  ArrowLeft,
  Link2,
  Reply,
  ReplyAll,
  Forward,
  Sparkles,
  Archive,
  Clock,
  MoreVertical,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { EmailToProjectBanner } from './EmailToProjectBanner';
import { useEmailToProject } from '@/hooks/useEmailToProject';
import { toast } from 'sonner';
import {
  getAvatarColor,
  getInitials,
  formatDaySeparator,
  shouldShowDaySeparator,
} from './inboxUtils';

type ReplyMode = 'reply' | 'reply-all' | 'forward';

interface InboxConversationProps {
  thread: EmailThread;
  userEmail: string;
  onSend: (params: any) => Promise<any>;
  onToggleStar: (messageId: string, starred: boolean) => void;
  onBack?: () => void;
}

export function InboxConversation({
  thread,
  userEmail,
  onSend,
  onToggleStar,
  onBack,
}: InboxConversationProps) {
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [replyMode, setReplyMode] = useState<ReplyMode>('reply');
  const [showLinker, setShowLinker] = useState(false);
  const [entityLinks, setEntityLinks] = useState<any[]>([]);
  const [attachmentsMap, setAttachmentsMap] = useState<Record<string, any[]>>({});
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [showAISummary, setShowAISummary] = useState(false);
  const emailToProject = useEmailToProject();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread.messages.length]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('email_entity_links')
      .select('*')
      .eq('thread_id', thread.thread_id)
      .eq('user_id', user.id)
      .then(({ data }) => setEntityLinks(data || []));
  }, [thread.thread_id, user]);

  useEffect(() => {
    if (!user) return;
    const msgIds = thread.messages.map((m) => m.id);
    if (!msgIds.length) return;
    supabase
      .from('email_attachments')
      .select('*')
      .in('message_id', msgIds)
      .eq('user_id', user.id)
      .then(({ data }) => {
        const map: Record<string, any[]> = {};
        (data || []).forEach((att: any) => {
          if (!map[att.message_id]) map[att.message_id] = [];
          map[att.message_id].push(att);
        });
        setAttachmentsMap(map);
      });
  }, [thread.messages, user]);

  const lastMessage = thread.messages[thread.messages.length - 1];
  const headerName = lastMessage?.from_name || lastMessage?.from_address || thread.participants[0] || 'Άγνωστος';
  const headerColor = getAvatarColor(headerName);

  const getReplyParams = () => {
    if (replyMode === 'forward') {
      return {
        to: '',
        cc: '',
        subject: `Fwd: ${thread.subject?.replace(/^Fwd:\s*/i, '')}`,
        prefillBody: `\n\n---------- Forwarded message ----------\nFrom: ${lastMessage.from_name || lastMessage.from_address}\nSubject: ${thread.subject}\n\n${lastMessage.body_text || ''}`,
      };
    }
    if (replyMode === 'reply-all') {
      const allTo = new Set<string>();
      if (lastMessage.from_address) allTo.add(lastMessage.from_address);
      (lastMessage.to_addresses || []).forEach((a: string) => {
        if (a.toLowerCase() !== userEmail.toLowerCase()) allTo.add(a);
      });
      const allCc = (lastMessage.cc_addresses || []).filter(
        (a: string) => a.toLowerCase() !== userEmail.toLowerCase()
      );
      return {
        to: Array.from(allTo).join(', '),
        cc: allCc.join(', '),
        subject: `Re: ${thread.subject?.replace(/^Re:\s*/i, '')}`,
      };
    }
    return {
      to: lastMessage.from_address || '',
      cc: '',
      subject: `Re: ${thread.subject?.replace(/^Re:\s*/i, '')}`,
    };
  };

  const handleDownloadAttachment = async (attachment: any) => {
    if (attachment.storage_path) {
      const { data } = supabase.storage
        .from('email-attachments')
        .getPublicUrl(attachment.storage_path);
      window.open(data.publicUrl, '_blank');
    }
  };

  const handleAISummary = () => {
    // Mock summary for now — wire to AI later
    const count = thread.messages.length;
    const participants = thread.participants.slice(0, 3).join(', ');
    setAiSummary(
      `Συνομιλία ${count} μηνυμάτων με ${participants}. Κύρια σημεία: συντονισμός εργασιών, ανταλλαγή ενημερώσεων και επόμενα βήματα. (Mock summary — σύνδεση με AI σύντομα.)`
    );
    setShowAISummary(true);
  };

  const handleSnooze = (label: string) => {
    toast.success(`Snooze: ${label} (σύντομα διαθέσιμο)`);
  };

  const handleArchive = () => {
    toast.success('Αρχειοθετήθηκε (σύντομα διαθέσιμο)');
  };

  const replyParams = getReplyParams();

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 px-4 py-3 border-b border-border flex items-center gap-3 bg-background/95 backdrop-blur">
        {onBack && (
          <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className={cn('text-xs font-semibold', headerColor.bg, headerColor.text)}>
            {getInitials(headerName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate leading-tight">{headerName}</h3>
          <p className="text-xs text-muted-foreground truncate">{thread.subject}</p>
          {entityLinks.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {entityLinks.map((link) => (
                <Badge key={link.id} variant="secondary" className="text-[10px] h-4 px-1.5">
                  {link.entity_type === 'client' ? '👤' : link.entity_type === 'project' ? '📁' : '✅'}{' '}
                  {link.entity_type}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-primary hover:text-primary"
            onClick={handleAISummary}
            title="AI Summary"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">AI Summary</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Snooze">
                <Clock className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleSnooze('Αύριο πρωί')}>
                Αύριο πρωί
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSnooze('Σε 3 μέρες')}>
                Σε 3 μέρες
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSnooze('Επόμενη εβδομάδα')}>
                Επόμενη εβδομάδα
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleArchive} title="Αρχειοθέτηση">
            <Archive className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onToggleStar(lastMessage.id, !thread.is_starred)}
              >
                <Star
                  className={cn(
                    'h-3.5 w-3.5 mr-2',
                    thread.is_starred && 'text-warning fill-warning'
                  )}
                />
                {thread.is_starred ? 'Ξεκαρφίτσωμα' : 'Καρφίτσωμα'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowLinker(true)}>
                <Link2 className="h-3.5 w-3.5 mr-2" /> Σύνδεση με Πελάτη/Έργο
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => emailToProject.parseBrief(lastMessage.id)}>
                <Sparkles className="h-3.5 w-3.5 mr-2 text-amber-500" />
                Ανάλυση ως Project Brief
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* AI Summary Banner */}
      {showAISummary && aiSummary && (
        <div className="mx-4 mt-3 p-3 rounded-xl border border-primary/30 bg-primary/5 flex items-start gap-3">
          <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-primary mb-0.5">AI Summary</p>
            <p className="text-sm text-foreground/90 leading-relaxed">{aiSummary}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 -mt-1 -mr-1"
            onClick={() => setShowAISummary(false)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Email-to-Project Banner */}
      <EmailToProjectBanner
        state={emailToProject.state}
        draft={emailToProject.draft}
        error={emailToProject.error}
        onParse={() => emailToProject.parseBrief(lastMessage.id)}
        onUpdateDraft={emailToProject.updateDraft}
        onCreateProject={emailToProject.createProject}
        onReset={emailToProject.reset}
      />

      {/* Messages */}
      <ScrollArea className="flex-1 px-4">
        <div className="py-4 max-w-3xl mx-auto">
          {(() => {
            let prevDate: Date | null = null;
            let prevDir: 'in' | 'out' | null = null;
            return thread.messages.map((msg) => {
              const isOutgoing =
                msg.from_address?.toLowerCase() === userEmail.toLowerCase() ||
                msg.folder === 'Sent';
              const dir: 'in' | 'out' = isOutgoing ? 'out' : 'in';
              const msgDate = msg.sent_at ? new Date(msg.sent_at) : new Date(msg.created_at);
              const showSep = shouldShowDaySeparator(prevDate, msgDate);
              const grouped = !showSep && prevDir === dir;
              prevDate = msgDate;
              prevDir = dir;

              return (
                <Fragment key={msg.id}>
                  {showSep && (
                    <div className="flex items-center gap-2 my-4">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold px-3 py-1 rounded-full border border-border bg-muted/50">
                        {formatDaySeparator(msgDate)}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}
                  <InboxMessageBubble
                    message={msg}
                    isOutgoing={isOutgoing}
                    userEmail={userEmail}
                    attachments={attachmentsMap[msg.id]}
                    onDownloadAttachment={handleDownloadAttachment}
                    isGroupedWithPrev={grouped}
                  />
                </Fragment>
              );
            });
          })()}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Reply mode + compose */}
      <div className="border-t border-border bg-muted/30">
        <div className="flex items-center gap-1 px-4 pt-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                {replyMode === 'reply' && (
                  <>
                    <Reply className="h-3 w-3" /> Απάντηση
                  </>
                )}
                {replyMode === 'reply-all' && (
                  <>
                    <ReplyAll className="h-3 w-3" /> Απάντηση σε όλους
                  </>
                )}
                {replyMode === 'forward' && (
                  <>
                    <Forward className="h-3 w-3" /> Προώθηση
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setReplyMode('reply')}>
                <Reply className="h-3.5 w-3.5 mr-2" /> Απάντηση
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setReplyMode('reply-all')}>
                <ReplyAll className="h-3.5 w-3.5 mr-2" /> Απάντηση σε όλους
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setReplyMode('forward')}>
                <Forward className="h-3.5 w-3.5 mr-2" /> Προώθηση
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <InboxComposeInput
          onSend={onSend}
          replyTo={{
            message_id: lastMessage.id,
            subject: replyParams.subject,
            to: replyParams.to,
            cc: replyParams.cc,
          }}
          prefillBody={replyMode === 'forward' ? replyParams.prefillBody : undefined}
          showRecipients={replyMode === 'reply-all' || replyMode === 'forward'}
        />
      </div>

      {showLinker && (
        <InboxEntityLinker
          threadId={thread.thread_id}
          messageId={lastMessage.id}
          onClose={() => setShowLinker(false)}
          onLinked={(link) => setEntityLinks((prev) => [...prev, link])}
        />
      )}
    </div>
  );
}
