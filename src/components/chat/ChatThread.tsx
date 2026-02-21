import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ChatMessageItem from './ChatMessageItem';
import ChatMessageInput from './ChatMessageInput';
import type { ChatMessage } from '@/hooks/useChatMessages';

interface ChatThreadProps {
  parentMessage: ChatMessage;
  channelId: string;
  onClose: () => void;
}

export default function ChatThread({ parentMessage, channelId, onClose }: ChatThreadProps) {
  const { user } = useAuth();
  const [replies, setReplies] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchReplies = useCallback(async () => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('parent_message_id', parentMessage.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) { console.error(error); return; }

    const userIds = [...new Set((data || []).map(m => m.user_id))];
    const { data: profiles } = userIds.length
      ? await supabase.from('profiles').select('id, full_name, avatar_url, email').in('id', userIds)
      : { data: [] };
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    setReplies((data || []).map(m => ({
      ...m,
      message_type: m.message_type as ChatMessage['message_type'],
      metadata: (m.metadata as Record<string, any>) || {},
      sender: profileMap.get(m.user_id) || { full_name: null, avatar_url: null, email: '' },
      reactions: [],
      attachments: [],
      reply_count: 0,
    })));
    setLoading(false);
  }, [parentMessage.id]);

  useEffect(() => {
    fetchReplies();
  }, [fetchReplies]);

  // Realtime for thread
  useEffect(() => {
    const channel = supabase
      .channel(`thread-${parentMessage.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `parent_message_id=eq.${parentMessage.id}`,
      }, async (payload) => {
        const newMsg = payload.new as any;
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, email')
          .eq('id', newMsg.user_id)
          .single();

        const enriched: ChatMessage = {
          ...newMsg,
          message_type: newMsg.message_type as ChatMessage['message_type'],
          metadata: (newMsg.metadata as Record<string, any>) || {},
          sender: profile || { full_name: null, avatar_url: null, email: '' },
          reactions: [],
          attachments: [],
          reply_count: 0,
        };
        setReplies(prev => [...prev, enriched]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [parentMessage.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies.length]);

  const handleSend = async (content: string) => {
    if (!user) return;
    await supabase.from('chat_messages').insert({
      channel_id: channelId,
      user_id: user.id,
      parent_message_id: parentMessage.id,
      content: content.trim(),
    });
  };

  return (
    <div className="w-80 border-l border-border/40 flex flex-col h-full bg-background">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
        <span className="text-sm font-semibold">Νήμα</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Parent message */}
      <div className="border-b border-border/20 bg-muted/10">
        <ChatMessageItem message={parentMessage} compact />
      </div>

      {/* Replies */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : replies.length === 0 ? (
          <div className="text-xs text-muted-foreground/60 text-center py-8">
            Δεν υπάρχουν απαντήσεις ακόμα
          </div>
        ) : (
          <div className="py-1">
            {replies.map(r => (
              <ChatMessageItem key={r.id} message={r} compact />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <ChatMessageInput onSend={handleSend} compact placeholder="Απάντησε..." />
    </div>
  );
}
