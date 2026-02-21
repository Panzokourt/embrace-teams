import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatChannel {
  id: string;
  company_id: string;
  project_id: string | null;
  name: string;
  description: string | null;
  type: 'public' | 'private' | 'direct' | 'group';
  created_by: string;
  is_archived: boolean;
  avatar_url: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  unread_count?: number;
  member_role?: string;
  members?: { user_id: string; full_name: string | null; avatar_url: string | null }[];
}

export function useChatChannels() {
  const { user, companyRole } = useAuth();
  const companyId = companyRole?.company_id;
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChannels = useCallback(async () => {
    if (!user || !companyId) return;
    try {
      // Get channels where user is a member
      const { data: memberChannels, error: memberErr } = await supabase
        .from('chat_channel_members')
        .select('channel_id, role, last_read_at')
        .eq('user_id', user.id);

      if (memberErr) throw memberErr;

      const channelIds = (memberChannels || []).map(m => m.channel_id);

      // Also get public channels in company
      const { data: publicChannels, error: pubErr } = await supabase
        .from('chat_channels')
        .select('*')
        .eq('company_id', companyId)
        .eq('type', 'public')
        .eq('is_archived', false);

      if (pubErr) throw pubErr;

      let allChannelIds = [...new Set([...channelIds, ...(publicChannels || []).map(c => c.id)])];

      if (allChannelIds.length === 0) {
        setChannels([]);
        setLoading(false);
        return;
      }

      const { data: allChannels, error: chErr } = await supabase
        .from('chat_channels')
        .select('*')
        .in('id', allChannelIds)
        .eq('is_archived', false)
        .order('last_message_at', { ascending: false });

      if (chErr) throw chErr;

      // Enrich with member info
      const enriched: ChatChannel[] = (allChannels || []).map(ch => {
        const membership = (memberChannels || []).find(m => m.channel_id === ch.id);
        return {
          ...ch,
          type: ch.type as ChatChannel['type'],
          member_role: membership?.role,
        };
      });

      setChannels(enriched);
    } catch (err) {
      console.error('Failed to fetch channels:', err);
    } finally {
      setLoading(false);
    }
  }, [user, companyId]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // Realtime subscription for channel updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('chat-channels-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_channel_members', filter: `user_id=eq.${user.id}` }, () => {
        fetchChannels();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchChannels]);

  const createChannel = useCallback(async (params: {
    name: string;
    type: 'public' | 'private' | 'direct' | 'group';
    description?: string;
    memberIds?: string[];
    project_id?: string;
  }) => {
    if (!user || !companyId) return null;

    const { data: ch, error: chErr } = await supabase
      .from('chat_channels')
      .insert({
        name: params.name,
        type: params.type,
        description: params.description || null,
        company_id: companyId,
        created_by: user.id,
        project_id: params.project_id || null,
      })
      .select()
      .single();

    if (chErr) throw chErr;

    // Add creator as owner
    await supabase.from('chat_channel_members').insert({
      channel_id: ch.id,
      user_id: user.id,
      role: 'owner',
    });

    // Add other members
    if (params.memberIds?.length) {
      const members = params.memberIds
        .filter(id => id !== user.id)
        .map(id => ({
          channel_id: ch.id,
          user_id: id,
          role: 'member' as const,
        }));
      if (members.length) {
        await supabase.from('chat_channel_members').insert(members);
      }
    }

    await fetchChannels();
    return ch;
  }, [user, companyId, fetchChannels]);

  const findOrCreateDM = useCallback(async (otherUserId: string) => {
    if (!user || !companyId) return null;

    // Check if DM already exists between these two users
    const { data: existing } = await supabase
      .from('chat_channels')
      .select('id, chat_channel_members!inner(user_id)')
      .eq('type', 'direct')
      .eq('company_id', companyId);

    if (existing) {
      for (const ch of existing) {
        const memberIds = (ch as any).chat_channel_members?.map((m: any) => m.user_id) || [];
        if (memberIds.length === 2 && memberIds.includes(user.id) && memberIds.includes(otherUserId)) {
          return ch;
        }
      }
    }

    // Create new DM
    const { data: otherProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', otherUserId)
      .single();

    return createChannel({
      name: otherProfile?.full_name || 'Direct Message',
      type: 'direct',
      memberIds: [otherUserId],
    });
  }, [user, companyId, createChannel]);

  return { channels, loading, fetchChannels, createChannel, findOrCreateDM };
}
