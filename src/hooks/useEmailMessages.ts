import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface EmailMessage {
  id: string;
  account_id: string;
  user_id: string;
  message_uid: string | null;
  message_id_header: string | null;
  thread_id: string | null;
  subject: string | null;
  from_address: string | null;
  from_name: string | null;
  to_addresses: string[];
  cc_addresses: string[];
  body_text: string | null;
  body_html: string | null;
  is_read: boolean;
  is_starred: boolean;
  folder: string;
  sent_at: string | null;
  created_at: string;
}

export interface EmailThread {
  thread_id: string;
  subject: string;
  messages: EmailMessage[];
  last_message: EmailMessage;
  unread_count: number;
  is_starred: boolean;
  participants: string[];
}

export function useEmailMessages(accountId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!accountId || !user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('email_messages')
      .select('*')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Error fetching emails:', error);
      setLoading(false);
      return;
    }

    const msgs = (data || []) as unknown as EmailMessage[];
    setMessages(msgs);

    // Group into threads
    const threadMap: Record<string, EmailMessage[]> = {};
    for (const msg of msgs) {
      const tid = msg.thread_id || msg.id;
      if (!threadMap[tid]) threadMap[tid] = [];
      threadMap[tid].push(msg);
    }

    const threadList: EmailThread[] = Object.entries(threadMap).map(([tid, msgs]) => {
      const sorted = msgs.sort((a, b) => 
        new Date(a.sent_at || a.created_at).getTime() - new Date(b.sent_at || b.created_at).getTime()
      );
      const last = sorted[sorted.length - 1];
      const participants = [...new Set(msgs.map(m => m.from_name || m.from_address || 'Unknown'))];
      
      return {
        thread_id: tid,
        subject: msgs[0].subject || '(χωρίς θέμα)',
        messages: sorted,
        last_message: last,
        unread_count: msgs.filter(m => !m.is_read).length,
        is_starred: msgs.some(m => m.is_starred),
        participants,
      };
    });

    threadList.sort((a, b) => 
      new Date(b.last_message.sent_at || b.last_message.created_at).getTime() -
      new Date(a.last_message.sent_at || a.last_message.created_at).getTime()
    );

    setThreads(threadList);
    setLoading(false);
  }, [accountId, user]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const syncEmails = async () => {
    if (!accountId) return;
    setSyncing(true);
    try {
      const res = await supabase.functions.invoke('email-fetch', {
        body: { account_id: accountId },
      });
      if (res.error) {
        toast.error('Σφάλμα συγχρονισμού: ' + (res.error as any)?.message);
      } else if (res.data?.success === false) {
        toast.error(res.data.error || 'Σφάλμα συγχρονισμού');
      } else {
        await fetchMessages();
        toast.success(res.data?.message || `Συγχρονίστηκαν ${res.data?.count || 0} emails`);
      }
    } catch {
      toast.error('Σφάλμα συγχρονισμού');
    }
    setSyncing(false);
  };

  const sendEmail = async (params: {
    to: string[];
    cc?: string[];
    subject: string;
    body: string;
    reply_to_message_id?: string;
  }) => {
    if (!accountId) return null;
    try {
      const res = await supabase.functions.invoke('email-send', {
        body: { account_id: accountId, ...params },
      });
      if (res.error) {
        toast.error('Σφάλμα αποστολής');
        return null;
      }
      toast.success('Το email στάλθηκε!');
      await fetchMessages();
      return res.data;
    } catch {
      toast.error('Σφάλμα αποστολής');
      return null;
    }
  };

  const toggleRead = async (messageId: string, isRead: boolean) => {
    await supabase
      .from('email_messages')
      .update({ is_read: isRead } as any)
      .eq('id', messageId);
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_read: isRead } : m));
  };

  const toggleStar = async (messageId: string, isStarred: boolean) => {
    await supabase
      .from('email_messages')
      .update({ is_starred: isStarred } as any)
      .eq('id', messageId);
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_starred: isStarred } : m));
    await fetchMessages();
  };

  return {
    messages,
    threads,
    loading,
    syncing,
    syncEmails,
    sendEmail,
    toggleRead,
    toggleStar,
    refetch: fetchMessages,
  };
}
