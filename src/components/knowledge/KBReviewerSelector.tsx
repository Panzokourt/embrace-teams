import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface KBReviewerSelectorProps {
  value: string | null;
  onChange: (id: string | null) => void;
  excludeUserId?: string | null;
}

interface UserOption { id: string; full_name: string | null; }

/** Dropdown για επιλογή reviewer από τα active μέλη της εταιρείας. */
export function KBReviewerSelector({ value, onChange, excludeUserId }: KBReviewerSelectorProps) {
  const { companyRole } = useAuth();
  const companyId = companyRole?.company_id;
  const [users, setUsers] = useState<UserOption[]>([]);

  useEffect(() => {
    let alive = true;
    if (!companyId) return;
    (async () => {
      const { data } = await supabase
        .from('user_company_roles')
        .select('user_id, profiles!inner(id, full_name)')
        .eq('company_id', companyId)
        .eq('status', 'active');
      if (!alive) return;
      const opts = (data || [])
        .map((r: any) => ({ id: r.profiles?.id, full_name: r.profiles?.full_name }))
        .filter((u: UserOption) => u.id && u.id !== excludeUserId);
      setUsers(opts);
    })();
    return () => { alive = false; };
  }, [companyId, excludeUserId]);

  return (
    <Select value={value || '__none__'} onValueChange={(v) => onChange(v === '__none__' ? null : v)}>
      <SelectTrigger><SelectValue placeholder="Καμία επιλογή" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">— Καμία —</SelectItem>
        {users.map(u => (
          <SelectItem key={u.id} value={u.id}>{u.full_name || 'Χωρίς όνομα'}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
