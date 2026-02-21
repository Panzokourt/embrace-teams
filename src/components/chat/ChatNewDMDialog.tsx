import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ChatNewDMDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectUser: (userId: string) => void;
}

interface UserItem {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
  job_title: string | null;
}

export default function ChatNewDMDialog({ open, onOpenChange, onSelectUser }: ChatNewDMDialogProps) {
  const { user, companyRole } = useAuth();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !companyRole) return;
    setLoading(true);

    const fetchUsers = async () => {
      // Get all profiles in the same company
      const { data: companyUsers } = await supabase
        .from('user_company_roles')
        .select('user_id')
        .eq('company_id', companyRole.company_id);

      const userIds = (companyUsers || []).map(u => u.user_id).filter(id => id !== user?.id);

      if (!userIds.length) { setUsers([]); setLoading(false); return; }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email, job_title')
        .in('id', userIds);

      setUsers(profiles || []);
      setLoading(false);
    };

    fetchUsers();
  }, [open, companyRole, user]);

  const filtered = users.filter(u =>
    (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Νέο Μήνυμα</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Αναζήτηση ατόμου..."
              className="pl-9"
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-sm text-muted-foreground/60 text-center py-4">
                Δεν βρέθηκαν χρήστες
              </div>
            ) : (
              filtered.map(u => (
                <button
                  key={u.id}
                  onClick={() => onSelectUser(u.id)}
                  className="flex items-center gap-3 w-full rounded-lg px-3 py-2 hover:bg-muted/30 transition-colors text-left"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={u.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {(u.full_name || u.email).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.full_name || u.email}</p>
                    {u.job_title && <p className="text-xs text-muted-foreground/60 truncate">{u.job_title}</p>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
