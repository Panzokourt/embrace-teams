import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatMessage {
  id: string;
  channel_id: string;
  user_id: string;
  parent_message_id: string | null;
  content: string;
  message_type: 'text' | 'file' | 'system' | 'action';
  metadata: Record<string, any>;
  is_pinned: boolean;
  is_edited: boolean;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  // joined
  sender?: {
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  };
  reactions?: { emoji: string; user_id: string }[];
  attachments?: { id: string; file_name: string; file_path: string; file_size: number | null; content_type: string | null }[];
  reply_count?: number;
}

export function useChatMessages(channelId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 50;
  const offsetRef = useRef(0);

  const fetchMessages = useCallback(async (reset = true) => {
    if (!channelId || !user) return;
    setLoading(true);

    if (reset) {
      offsetRef.current = 0;
    }

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('channel_id', channelId)
        .is('deleted_at', null)
        .is('parent_message_id', null)
        .order('created_at', { ascending: false })
        .range(offsetRef.current, offsetRef.current + pageSize - 1);

      if (error) throw error;

      // Fetch sender profiles
      const userIds = [...new Set((data || []).map(m => m.user_id))];
      const { data: profiles } = userIds.length
        ? await supabase.from('profiles').select('id, full_name, avatar_url, email').in('id', userIds)
        : { data: [] };

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Fetch reactions
      const msgIds = (data || []).map(m => m.id);
      const { data: reactions } = msgIds.length
        ? await supabase.from('chat_message_reactions').select('message_id, emoji, user_id').in('message_id', msgIds)
        : { data: [] };

      // Fetch attachments
      const { data: attachments } = msgIds.length
        ? await supabase.from('chat_message_attachments').select('*').in('message_id', msgIds)
        : { data: [] };

      // Fetch reply counts
      const { data: replyCounts } = msgIds.length
        ? await supabase.from('chat_messages').select('parent_message_id').in('parent_message_id', msgIds).is('deleted_at', null)
        : { data: [] };

      const replyMap = new Map<string, number>();
      (replyCounts || []).forEach(r => {
        if (r.parent_message_id) {
          replyMap.set(r.parent_message_id, (replyMap.get(r.parent_message_id) || 0) + 1);
        }
      });

      const enriched: ChatMessage[] = (data || []).map(m => ({
        ...m,
        message_type: m.message_type as ChatMessage['message_type'],
        metadata: (m.metadata as Record<string, any>) || {},
        sender: profileMap.get(m.user_id) || { full_name: null, avatar_url: null, email: '' },
        reactions: (reactions || []).filter(r => r.message_id === m.id),
        attachments: (attachments || []).filter(a => a.message_id === m.id),
        reply_count: replyMap.get(m.id) || 0,
      }));

      if (reset) {
        setMessages(enriched.reverse());
      } else {
        setMessages(prev => [...enriched.reverse(), ...prev]);
      }

      setHasMore((data || []).length === pageSize);
      offsetRef.current += (data || []).length;
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  }, [channelId, user]);

  useEffect(() => {
    if (channelId) {
      fetchMessages(true);
    } else {
      setMessages([]);
    }
  }, [channelId, fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel(`chat-messages-${channelId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `channel_id=eq.${channelId}`,
      }, async (payload) => {
        const newMsg = payload.new as any;
        if (newMsg.parent_message_id) {
          // Thread reply - update reply count
          setMessages(prev => prev.map(m =>
            m.id === newMsg.parent_message_id
              ? { ...m, reply_count: (m.reply_count || 0) + 1 }
              : m
          ));
          return;
        }

        // Fetch sender profile
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

        setMessages(prev => [...prev, enriched]);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: `channel_id=eq.${channelId}`,
      }, (payload) => {
        const updated = payload.new as any;
        setMessages(prev => prev.map(m =>
          m.id === updated.id ? { ...m, ...updated, metadata: updated.metadata || {} } : m
        ));
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'chat_messages',
        filter: `channel_id=eq.${channelId}`,
      }, (payload) => {
        const deleted = payload.old as any;
        setMessages(prev => prev.filter(m => m.id !== deleted.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [channelId]);

  const sendMessage = useCallback(async (content: string, metadata?: Record<string, any>, parentId?: string) => {
    if (!channelId || !user || !content.trim()) return null;

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        channel_id: channelId,
        user_id: user.id,
        content: content.trim(),
        parent_message_id: parentId || null,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) throw error;

    // Update channel last_message_at
    await supabase
      .from('chat_channels')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', channelId);

    return data;
  }, [channelId, user]);

  const editMessage = useCallback(async (messageId: string, content: string) => {
    const { error } = await supabase
      .from('chat_messages')
      .update({ content, is_edited: true, edited_at: new Date().toISOString() })
      .eq('id', messageId);
    if (error) throw error;
  }, []);

  const deleteMessage = useCallback(async (messageId: string) => {
    const { error } = await supabase
      .from('chat_messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId);
    if (error) throw error;
    setMessages(prev => prev.filter(m => m.id !== messageId));
  }, []);

  const togglePin = useCallback(async (messageId: string, pinned: boolean) => {
    const { error } = await supabase
      .from('chat_messages')
      .update({ is_pinned: pinned })
      .eq('id', messageId);
    if (error) throw error;
  }, []);

  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('chat_message_reactions')
      .insert({ message_id: messageId, user_id: user.id, emoji });
    if (error && !error.message.includes('duplicate')) throw error;
    // Optimistic update
    setMessages(prev => prev.map(m =>
      m.id === messageId
        ? { ...m, reactions: [...(m.reactions || []), { emoji, user_id: user.id }] }
        : m
    ));
  }, [user]);

  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return;
    await supabase
      .from('chat_message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji);
    setMessages(prev => prev.map(m =>
      m.id === messageId
        ? { ...m, reactions: (m.reactions || []).filter(r => !(r.emoji === emoji && r.user_id === user.id)) }
        : m
    ));
  }, [user]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchMessages(false);
    }
  }, [loading, hasMore, fetchMessages]);

  // Mark channel as read
  const markAsRead = useCallback(async () => {
    if (!channelId || !user) return;
    await supabase
      .from('chat_channel_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('channel_id', channelId)
      .eq('user_id', user.id);
  }, [channelId, user]);

  return {
    messages,
    loading,
    hasMore,
    sendMessage,
    editMessage,
    deleteMessage,
    togglePin,
    addReaction,
    removeReaction,
    loadMore,
    markAsRead,
    refetch: () => fetchMessages(true),
  };
}
