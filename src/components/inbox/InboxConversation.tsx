import { useRef, useEffect, useState } from 'react';
import { EmailThread, EmailMessage } from '@/hooks/useEmailMessages';
import { InboxMessageBubble } from './InboxMessageBubble';
import { InboxComposeInput } from './InboxComposeInput';
import { InboxEntityLinker } from './InboxEntityLinker';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Star, ArrowLeft, Link2, Reply, ReplyAll, Forward, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { EmailToProjectBanner } from './EmailToProjectBanner';
import { useEmailToProject } from '@/hooks/useEmailToProject';

type ReplyMode = 'reply' | 'reply-all' | 'forward';

interface InboxConversationProps {
  thread: EmailThread;
  userEmail: string;
  onSend: (params: any) => Promise<any>;
  onToggleStar: (messageId: string, starred: boolean) => void;
  onBack?: () => void;
}

export function InboxConversation({ thread, userEmail, onSend, onToggleStar, onBack }: InboxConversationProps) {
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [replyMode, setReplyMode] = useState<ReplyMode>('reply');
  const [showLinker, setShowLinker] = useState(false);
  const [entityLinks, setEntityLinks] = useState<any[]>([]);
  const [attachmentsMap, setAttachmentsMap] = useState<Record<string, any[]>>({});
  const emailToProject = useEmailToProject();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread.messages.length]);

  // Fetch entity links
  useEffect(() => {
    if (!user) return;
    const fetchLinks = async () => {
      const { data } = await supabase
        .from('email_entity_links')
        .select('*')
        .eq('thread_id', thread.thread_id)
        .eq('user_id', user.id);
      setEntityLinks(data || []);
    };
    fetchLinks();
  }, [thread.thread_id, user]);

  // Fetch attachments for all messages
  useEffect(() => {
    if (!user) return;
    const msgIds = thread.messages.map(m => m.id);
    const fetchAttachments = async () => {
      const { data } = await supabase
        .from('email_attachments')
        .select('*')
        .in('message_id', msgIds)
        .eq('user_id', user.id);
      const map: Record<string, any[]> = {};
      (data || []).forEach((att: any) => {
        if (!map[att.message_id]) map[att.message_id] = [];
        map[att.message_id].push(att);
      });
      setAttachmentsMap(map);
    };
    if (msgIds.length) fetchAttachments();
  }, [thread.messages, user]);

  const lastMessage = thread.messages[thread.messages.length - 1];

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
      (lastMessage.to_addresses || []).forEach((a: string) => { if (a.toLowerCase() !== userEmail.toLowerCase()) allTo.add(a); });
      const allCc = (lastMessage.cc_addresses || []).filter((a: string) => a.toLowerCase() !== userEmail.toLowerCase());
      return {
        to: Array.from(allTo).join(', '),
        cc: allCc.join(', '),
        subject: `Re: ${thread.subject?.replace(/^Re:\s*/i, '')}`,
      };
    }
    // Default reply
    return {
      to: lastMessage.from_address || '',
      cc: '',
      subject: `Re: ${thread.subject?.replace(/^Re:\s*/i, '')}`,
    };
  };

  const handleDownloadAttachment = async (attachment: any) => {
    if (attachment.storage_path) {
      const { data } = supabase.storage.from('email-attachments').getPublicUrl(attachment.storage_path);
      window.open(data.publicUrl, '_blank');
    }
  };

  const replyParams = getReplyParams();

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
          {/* Entity link badges */}
          {entityLinks.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {entityLinks.map(link => (
                <Badge key={link.id} variant="secondary" className="text-[10px]">
                  {link.entity_type === 'client' ? '👤' : link.entity_type === 'project' ? '📁' : '✅'} {link.entity_type}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-amber-500 hover:text-amber-600"
          onClick={() => emailToProject.parseBrief(lastMessage.id)}
          title="Ανάλυση ως Project Brief"
          disabled={emailToProject.state === 'parsing'}
        >
          <Sparkles className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setShowLinker(true)}
          title="Σύνδεση με Πελάτη/Έργο/Task"
        >
          <Link2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onToggleStar(lastMessage.id, !thread.is_starred)}
        >
          <Star className={cn('h-4 w-4', thread.is_starred && 'text-warning fill-warning')} />
        </Button>
      </div>

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
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {thread.messages.map(msg => (
            <InboxMessageBubble
              key={msg.id}
              message={msg}
              isOutgoing={msg.from_address?.toLowerCase() === userEmail.toLowerCase() || msg.folder === 'Sent'}
              userEmail={userEmail}
              attachments={attachmentsMap[msg.id]}
              onDownloadAttachment={handleDownloadAttachment}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Reply mode selector + compose */}
      <div className="border-t border-border">
        <div className="flex items-center gap-1 px-4 pt-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                {replyMode === 'reply' && <><Reply className="h-3 w-3" /> Απάντηση</>}
                {replyMode === 'reply-all' && <><ReplyAll className="h-3 w-3" /> Απάντηση σε όλους</>}
                {replyMode === 'forward' && <><Forward className="h-3 w-3" /> Προώθηση</>}
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

      {/* Entity linker dialog */}
      {showLinker && (
        <InboxEntityLinker
          threadId={thread.thread_id}
          messageId={lastMessage.id}
          onClose={() => setShowLinker(false)}
          onLinked={(link) => setEntityLinks(prev => [...prev, link])}
        />
      )}
    </div>
  );
}
