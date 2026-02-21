import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface GmailAccount {
  id: string;
  user_id: string;
  company_id: string;
  email_address: string;
  display_name: string | null;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useGmailAccount() {
  const { user, company } = useAuth();
  const [account, setAccount] = useState<GmailAccount | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAccount = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('gmail_accounts_safe')
      .select('id, user_id, company_id, email_address, display_name, is_active, last_sync_at, created_at, updated_at')
      .maybeSingle();

    if (!error && data) {
      setAccount(data as unknown as GmailAccount);
    } else {
      setAccount(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  const startOAuth = async (): Promise<string | null> => {
    try {
      const res = await supabase.functions.invoke('gmail-auth-start', {});
      if (res.error) {
        toast.error('Σφάλμα εκκίνησης OAuth: ' + (res.error as any)?.message);
        return null;
      }
      return res.data?.url || null;
    } catch {
      toast.error('Σφάλμα σύνδεσης');
      return null;
    }
  };

  const disconnectAccount = async () => {
    if (!account) return;
    const { error } = await supabase
      .from('gmail_oauth_tokens')
      .delete()
      .eq('id', account.id);
    if (error) {
      toast.error('Σφάλμα αποσύνδεσης');
      return;
    }
    setAccount(null);
    toast.success('Ο λογαριασμός Gmail αποσυνδέθηκε');
  };

  const testConnection = async (): Promise<boolean> => {
    try {
      const res = await supabase.functions.invoke('email-fetch', {
        body: { action: 'test' },
      });
      if (res.error) {
        toast.error('Αποτυχία σύνδεσης: ' + (res.error as any)?.message);
        return false;
      }
      if (res.data?.success) {
        toast.success(res.data.message || 'Σύνδεση επιτυχής!');
        return true;
      }
      toast.error(res.data?.error || 'Αποτυχία σύνδεσης');
      return false;
    } catch {
      toast.error('Σφάλμα δοκιμής σύνδεσης');
      return false;
    }
  };

  return { account, loading, startOAuth, disconnectAccount, testConnection, refetch: fetchAccount };
}
