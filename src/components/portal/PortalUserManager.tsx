import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserPlus, Trash2, ExternalLink, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface PortalUser {
  id: string;
  user_id: string;
  client_id: string;
  is_active: boolean;
  created_at: string;
  client: { name: string } | null;
  profile?: { full_name: string | null; email: string | null } | null;
}

export function PortalUserManager() {
  const { company } = useAuth();
  const [portalUsers, setPortalUsers] = useState<PortalUser[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (company?.id) {
      fetchData();
    }
  }, [company?.id]);

  const fetchData = async () => {
    if (!company?.id) return;

    const [{ data: users }, { data: clientList }] = await Promise.all([
      supabase
        .from('client_portal_users')
        .select('*, client:clients(name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('clients')
        .select('id, name')
        .eq('company_id', company.id)
        .order('name'),
    ]);

    // Fetch profiles for portal users
    const userIds = (users || []).map(u => u.user_id);
    let profileMap: Record<string, { full_name: string | null; email: string | null }> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
      (profiles || []).forEach(p => { profileMap[p.id] = p; });
    }

    setPortalUsers((users || []).map(u => ({ ...u, profile: profileMap[u.user_id] || null })) as any);
    setClients(clientList || []);
    setLoading(false);
  };

  const invitePortalUser = async () => {
    if (!email || !selectedClient || !company?.id) return;
    setSaving(true);

    try {
      const { data, error } = await supabase.functions.invoke('invite-portal-user', {
        body: {
          email: email.trim().toLowerCase(),
          client_id: selectedClient,
          company_id: company.id,
          app_url: window.location.origin,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Η πρόσκληση στάλθηκε. Ο χρήστης θα λάβει email με σύνδεσμο εισόδου.');
      setDialogOpen(false);
      setEmail('');
      setSelectedClient('');
      fetchData();
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || 'Σφάλμα κατά την πρόσκληση';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleAccess = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('client_portal_users')
      .update({ is_active: !isActive })
      .eq('id', id);

    if (error) { toast.error('Σφάλμα'); return; }
    toast.success(isActive ? 'Πρόσβαση απενεργοποιήθηκε' : 'Πρόσβαση ενεργοποιήθηκε');
    fetchData();
  };

  const removeAccess = async (id: string) => {
    const { error } = await supabase
      .from('client_portal_users')
      .delete()
      .eq('id', id);

    if (error) { toast.error('Σφάλμα'); return; }
    toast.success('Πρόσβαση αφαιρέθηκε');
    fetchData();
  };

  const portalUrl = `${window.location.origin}/portal`;

  const copyPortalUrl = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('URL αντιγράφηκε');
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-primary" />
            Client Portal
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={copyPortalUrl}>
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              Portal URL
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 text-xs">
                  <UserPlus className="h-3 w-3" />
                  Πρόσκληση
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Πρόσκληση στο Client Portal</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Email χρήστη</Label>
                    <Input
                      placeholder="client@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Δεν χρειάζεται να έχει λογαριασμό — θα λάβει email με σύνδεσμο εισόδου.
                    </p>
                  </div>
                  <div>
                    <Label>Πελάτης</Label>
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                      <SelectTrigger>
                        <SelectValue placeholder="Επιλέξτε πελάτη" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={invitePortalUser} disabled={saving || !email || !selectedClient} className="w-full">
                    {saving ? 'Αποστολή...' : 'Αποστολή Πρόσκλησης'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {portalUsers.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Δεν υπάρχουν χρήστες portal. Προσκαλέστε τον πρώτο πελάτη σας.
          </p>
        ) : (
          <div className="space-y-2">
            {portalUsers.map((pu) => (
              <div key={pu.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/40">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {pu.profile?.full_name || pu.profile?.email || 'Unknown'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{pu.client?.name}</span>
                    <Badge variant={pu.is_active ? 'default' : 'secondary'} className="text-[9px] px-1.5 py-0">
                      {pu.is_active ? 'Ενεργός' : 'Ανενεργός'}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost" size="sm" className="text-xs"
                  onClick={() => toggleAccess(pu.id, pu.is_active)}
                >
                  {pu.is_active ? 'Απενεργοποίηση' : 'Ενεργοποίηση'}
                </Button>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                  onClick={() => removeAccess(pu.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
