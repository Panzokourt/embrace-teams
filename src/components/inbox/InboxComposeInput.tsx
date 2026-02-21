import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Send, Loader2, Plus, X } from 'lucide-react';

interface InboxComposeInputProps {
  onSend: (params: { to: string[]; cc?: string[]; subject: string; body: string; reply_to_message_id?: string }) => Promise<any>;
  replyTo?: { message_id: string; subject: string; to: string };
  isNewCompose?: boolean;
}

export function InboxComposeInput({ onSend, replyTo, isNewCompose }: InboxComposeInputProps) {
  const [body, setBody] = useState('');
  const [to, setTo] = useState(replyTo?.to || '');
  const [subject, setSubject] = useState(replyTo ? `Re: ${replyTo.subject?.replace(/^Re:\s*/i, '')}` : '');
  const [sending, setSending] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [cc, setCc] = useState('');

  const handleSend = async () => {
    if (!body.trim() || !to.trim()) return;
    setSending(true);
    const result = await onSend({
      to: to.split(',').map(e => e.trim()).filter(Boolean),
      cc: showCc ? cc.split(',').map(e => e.trim()).filter(Boolean) : undefined,
      subject: subject || '(χωρίς θέμα)',
      body: body.trim(),
      reply_to_message_id: replyTo?.message_id,
    });
    if (result) {
      setBody('');
      if (isNewCompose) {
        setTo('');
        setSubject('');
        setCc('');
      }
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border bg-card p-4 space-y-3">
      {(isNewCompose || !replyTo) && (
        <>
          <div className="flex gap-2 items-center">
            <Input
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder="Προς (email, χωρισμένα με κόμμα)"
              className="flex-1 h-9 text-sm"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs"
              onClick={() => setShowCc(!showCc)}
            >
              {showCc ? <X className="h-3 w-3" /> : 'CC'}
            </Button>
          </div>
          {showCc && (
            <Input
              value={cc}
              onChange={e => setCc(e.target.value)}
              placeholder="CC (email, χωρισμένα με κόμμα)"
              className="h-9 text-sm"
            />
          )}
          <Input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Θέμα"
            className="h-9 text-sm"
          />
        </>
      )}
      <div className="flex items-end gap-2">
        <Textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={replyTo ? 'Γράψτε απάντηση...' : 'Γράψτε μήνυμα...'}
          className="min-h-[60px] max-h-[200px] resize-none text-sm"
          rows={2}
        />
        <Button
          onClick={handleSend}
          disabled={sending || !body.trim() || !to.trim()}
          size="icon"
          className="h-10 w-10 shrink-0"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Ctrl+Enter για αποστολή</p>
    </div>
  );
}
