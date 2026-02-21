import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, X, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Member {
  user_id: string;
  role: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
}

interface ChatMemberManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
}

export default function ChatMemberManager({ open, onOpenChange, channelId }: ChatMemberManagerProps) {
  const { user, companyRole } = useAuth();
  const companyId = companyRole?.company_id;
  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; full_name: string | null; email: string; avatar_url: string | null }[]>([]);

  const fetchMembers = async () => {
    const { data } = await supabase
      .from('chat_channel_members')
      .select('user_id, role')
      .eq('channel_id', channelId);

    if (!data?.length) { setMembers([]); return; }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .in('id', data.map(m => m.user_id));

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    setMembers(data.map(m => {
      const p = profileMap.get(m.user_id);
      return { user_id: m.user_id, role: m.role, full_name: p?.full_name || null, avatar_url: p?.avatar_url || null, email: p?.email || '' };
    }));
  };

  useEffect(() => { if (open) fetchMembers(); }, [open, channelId]);

  const searchUsers = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim() || !companyId) { setSearchResults([]); return; }
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(10);
    const memberIds = new Set(members.map(m => m.user_id));
    setSearchResults((data || []).filter(p => !memberIds.has(p.id)));
  };

  const addMember = async (userId: string) => {
    await supabase.from('chat_channel_members').insert({ channel_id: channelId, user_id: userId, role: 'member' });
    toast.success('Μέλος προστέθηκε');
    setSearchQuery('');
    setSearchResults([]);
    fetchMembers();
  };

  const removeMember = async (userId: string) => {
    await supabase.from('chat_channel_members').delete().eq('channel_id', channelId).eq('user_id', userId);
    toast.success('Μέλος αφαιρέθηκε');
    fetchMembers();
  };

  const changeRole = async (userId: string, role: string) => {
    await supabase.from('chat_channel_members').update({ role }).eq('channel_id', channelId).eq('user_id', userId);
    fetchMembers();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Διαχείριση μελών</DialogTitle>
        </DialogHeader>

        {/* Add member */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => searchUsers(e.target.value)}
            placeholder="Προσθήκη μέλους..."
            className="pl-9"
          />
        </div>
        {searchResults.length > 0 && (
          <div className="border border-border/40 rounded-lg max-h-32 overflow-y-auto">
            {searchResults.map(p => (
              <button
                key={p.id}
                className="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted/30 text-sm"
                onClick={() => addMember(p.id)}
              >
                <UserPlus className="h-3.5 w-3.5 text-primary" />
                <span>{p.full_name || p.email}</span>
              </button>
            ))}
          </div>
        )}

        {/* Members list */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {members.map(m => (
            <div key={m.user_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/20">
              <Avatar className="h-7 w-7">
                <AvatarImage src={m.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">{(m.full_name || m.email)?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <span className="text-sm truncate block">{m.full_name || m.email}</span>
              </div>
              <Select value={m.role} onValueChange={v => changeRole(m.user_id, v)}>
                <SelectTrigger className="h-7 w-24 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
              {m.user_id !== user?.id && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeMember(m.user_id)}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
