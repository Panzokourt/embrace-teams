import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface EmailAccount {
  id: string;
  user_id: string;
  company_id: string;
  email_address: string;
  display_name: string | null;
  imap_host: string;
  imap_port: number;
  smtp_host: string;
  smtp_port: number;
  username: string;
  encrypted_password: string;
  use_tls: boolean;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

const PROVIDER_PRESETS: Record<string, { imap_host: string; imap_port: number; smtp_host: string; smtp_port: number }> = {
  gmail: { imap_host: 'imap.gmail.com', imap_port: 993, smtp_host: 'smtp.gmail.com', smtp_port: 587 },
  outlook: { imap_host: 'outlook.office365.com', imap_port: 993, smtp_host: 'smtp.office365.com', smtp_port: 587 },
  yahoo: { imap_host: 'imap.mail.yahoo.com', imap_port: 993, smtp_host: 'smtp.mail.yahoo.com', smtp_port: 587 },
};

export { PROVIDER_PRESETS };

export function useEmailAccount() {
  const { user, company } = useAuth();
  const [account, setAccount] = useState<EmailAccount | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAccount = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setAccount(data as unknown as EmailAccount);
    } else {
      setAccount(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAccount();
  }, [user]);

  const saveAccount = async (values: Partial<EmailAccount>) => {
    if (!user || !company) return null;

    const payload = {
      ...values,
      user_id: user.id,
      company_id: company.id,
    };

    if (account) {
      const { data, error } = await supabase
        .from('email_accounts')
        .update(payload as any)
        .eq('id', account.id)
        .select()
        .single();
      if (error) {
        toast.error('Σφάλμα αποθήκευσης: ' + error.message);
        return null;
      }
      setAccount(data as unknown as EmailAccount);
      toast.success('Ο λογαριασμός email ενημερώθηκε!');
      return data;
    } else {
      const { data, error } = await supabase
        .from('email_accounts')
        .insert(payload as any)
        .select()
        .single();
      if (error) {
        toast.error('Σφάλμα δημιουργίας: ' + error.message);
        return null;
      }
      setAccount(data as unknown as EmailAccount);
      toast.success('Ο λογαριασμός email δημιουργήθηκε!');
      return data;
    }
  };

  const deleteAccount = async () => {
    if (!account) return;
    const { error } = await supabase
      .from('email_accounts')
      .delete()
      .eq('id', account.id);
    if (error) {
      toast.error('Σφάλμα διαγραφής');
      return;
    }
    setAccount(null);
    toast.success('Ο λογαριασμός email αφαιρέθηκε');
  };

  const testConnection = async () => {
    if (!account) return false;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('email-fetch', {
        body: { account_id: account.id, action: 'test' },
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
    } catch (err) {
      toast.error('Σφάλμα δοκιμής σύνδεσης');
      return false;
    }
  };

  return { account, loading, saveAccount, deleteAccount, testConnection, refetch: fetchAccount };
}
