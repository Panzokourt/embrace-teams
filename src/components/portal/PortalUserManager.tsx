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
import { Checkbox } from '@/components/ui/checkbox';
import { UserPlus, Trash2, ExternalLink, Copy, Check, RefreshCw } from 'lucide-react';
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

// Always send invitations from the production domain so the magic link in the
// email never points to a preview/Lovable URL.
const PORTAL_BASE_URL = 'https://app.olseny.com';

export function PortalUserManager() {
  const { company } = useAuth();
  const [portalUsers, setPortalUsers] = useState<PortalUser[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [requirePin, setRequirePin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
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
    const userIds = Array.from(new Set((users || []).map((u: any) => u.user_id).filter(Boolean)));
    const profileMap: Record<string, { full_name: string | null; email: string | null }> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
      (profiles || []).forEach((p: any) => {
        profileMap[p.id] = { full_name: p.full_name, email: p.email };
      });
    }

    // Fallback: try to get email from active portal access tokens (covers cases where
    // the profile row is missing email — guarantees the resend button always has an email).
    const tokens = await supabase
      .from('client_portal_access_tokens')
      .select('user_id, email, created_at')
      .eq('company_id', company.id)
      .is('revoked_at', null)
      .order('created_at', { ascending: false });

    const tokenEmailMap: Record<string, string> = {};
    (tokens.data || []).forEach((t: any) => {
      if (t.user_id && t.email && !tokenEmailMap[t.user_id]) {
        tokenEmailMap[t.user_id] = t.email;
      }
    });

    setPortalUsers(
      (users || []).map((u: any) => {
        const profile = profileMap[u.user_id] || { full_name: null, email: null };
        const email = profile.email || tokenEmailMap[u.user_id] || null;
        return { ...u, profile: { full_name: profile.full_name, email } };
      }) as PortalUser[]
    );
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
          full_name: fullName.trim() || null,
          client_id: selectedClient,
          company_id: company.id,
          app_url: PORTAL_BASE_URL,
          require_pin: requirePin,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(
        requirePin
          ? 'Η πρόσκληση στάλθηκε με PIN στο email του πελάτη.'
          : 'Η πρόσκληση στάλθηκε. Ο χρήστης θα λάβει email με σύνδεσμο εισόδου.'
      );
      setDialogOpen(false);
      setFullName('');
      setEmail('');
      setSelectedClient('');
      setRequirePin(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || 'Σφάλμα κατά την πρόσκληση';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const resendInvitation = async (pu: PortalUser) => {
    if (!company?.id) return;
    const targetEmail = pu.profile?.email;
    if (!targetEmail) {
      toast.error('Λείπει το email του χρήστη — διέγραψε και ξανά πρόσκαλεσε.');
      return;
    }
    setResendingId(pu.id);
    try {
      const { data, error } = await supabase.functions.invoke('invite-portal-user', {
        body: {
          email: targetEmail,
          full_name: pu.profile?.full_name || null,
          client_id: pu.client_id,
          company_id: company.id,
          app_url: PORTAL_BASE_URL,
          require_pin: false,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Νέα πρόσκληση στάλθηκε. Το παλιό link ακυρώθηκε.');
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Αποτυχία επαναποστολής');
    } finally {
      setResendingId(null);
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

  const portalUrl = `${PORTAL_BASE_URL}/portal`;

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
                    <Label>Όνομα χρήστη</Label>
                    <Input
                      placeholder="π.χ. Γιάννης Παπαδόπουλος"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Προαιρετικό — εμφανίζεται στη λίστα και στο portal.
                    </p>
                  </div>
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
                  <div className="flex items-start gap-2 p-3 rounded-lg border border-border/40 bg-muted/30">
                    <Checkbox
                      id="require-pin"
                      checked={requirePin}
                      onCheckedChange={(c) => setRequirePin(!!c)}
                      className="mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <Label htmlFor="require-pin" className="text-xs font-medium cursor-pointer">
                        Απαιτείται PIN για είσοδο
                      </Label>
                      <p className="text-[10px] text-muted-foreground">
                        Θα σταλεί 6-ψήφιος κωδικός στο email. Ο πελάτης θα τον χρειάζεται σε κάθε σύνδεση.
                      </p>
                    </div>
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
            {portalUsers.map((pu) => {
              const displayName =
                pu.profile?.full_name?.trim() ||
                pu.profile?.email ||
                'Χωρίς όνομα';
              const showEmailLine = !!pu.profile?.email && pu.profile.email !== displayName;
              return (
                <div key={pu.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/40">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{displayName}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {showEmailLine && (
                        <span className="text-[10px] text-muted-foreground truncate">
                          {pu.profile?.email}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">·</span>
                      <span className="text-[10px] text-muted-foreground">{pu.client?.name}</span>
                      <Badge variant={pu.is_active ? 'default' : 'secondary'} className="text-[9px] px-1.5 py-0">
                        {pu.is_active ? 'Ενεργός' : 'Ανενεργός'}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost" size="sm" className="text-xs gap-1.5"
                    onClick={() => resendInvitation(pu)}
                    disabled={resendingId === pu.id}
                  >
                    <RefreshCw className={`h-3 w-3 ${resendingId === pu.id ? 'animate-spin' : ''}`} />
                    Επαναποστολή
                  </Button>
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
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
