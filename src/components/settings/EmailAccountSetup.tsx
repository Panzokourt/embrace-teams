import { useState, useEffect, useRef } from 'react';
import { useGmailAccount } from '@/hooks/useGmailAccount';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Loader2, Trash2, Plug, CheckCircle2, LogIn, AlertCircle, Server } from 'lucide-react';
import { toast } from 'sonner';

type PresetKey = 'gmail' | 'outlook' | 'yahoo' | 'custom';

const PRESETS: Record<Exclude<PresetKey, 'custom'>, {
  imap_host: string; imap_port: number; smtp_host: string; smtp_port: number;
}> = {
  gmail:   { imap_host: 'imap.gmail.com',          imap_port: 993, smtp_host: 'smtp.gmail.com',          smtp_port: 587 },
  outlook: { imap_host: 'outlook.office365.com',   imap_port: 993, smtp_host: 'smtp.office365.com',      smtp_port: 587 },
  yahoo:   { imap_host: 'imap.mail.yahoo.com',     imap_port: 993, smtp_host: 'smtp.mail.yahoo.com',     smtp_port: 587 },
};

export function EmailAccountSetup() {
  const { account: gmailAccount, loading, startOAuth, disconnectAccount, testConnection, refetch } = useGmailAccount();
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const pollRef = useRef<{ interval: ReturnType<typeof setInterval>; timeout: ReturnType<typeof setTimeout> } | null>(null);

  // Manual IMAP state
  const [manualAccount, setManualAccount] = useState<any>(null);
  const [preset, setPreset] = useState<PresetKey>('gmail');
  const [form, setForm] = useState({
    email_address: '',
    display_name: '',
    imap_host: PRESETS.gmail.imap_host,
    imap_port: PRESETS.gmail.imap_port,
    smtp_host: PRESETS.gmail.smtp_host,
    smtp_port: PRESETS.gmail.smtp_port,
    username: '',
    password: '',
    use_tls: true,
  });
  const [testResult, setTestResult] = useState<{ ok: boolean; imap: boolean; smtp: boolean; error?: string } | null>(null);
  const [testingManual, setTestingManual] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load existing IMAP account
  const loadManual = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('email_accounts')
      .select('id, email_address, display_name, imap_host, imap_port, smtp_host, smtp_port, username, use_tls, last_sync_at, is_active')
      .eq('user_id', user.id)
      .maybeSingle();
    setManualAccount(data || null);
  };

  useEffect(() => { loadManual(); }, []);

  // Listen for OAuth completion from popup
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'gmail-oauth-complete' && event.data?.success) {
        stopPolling();
        setConnecting(false);
        refetch();
      }
    };
    window.addEventListener('message', handler);
    return () => {
      window.removeEventListener('message', handler);
      stopPolling();
    };
  }, [refetch]);

  useEffect(() => {
    if (gmailAccount && connecting) {
      stopPolling();
      setConnecting(false);
    }
  }, [gmailAccount, connecting]);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current.interval);
      clearTimeout(pollRef.current.timeout);
      pollRef.current = null;
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    const url = await startOAuth();
    if (url) {
      window.open(url, '_blank');
      const interval = setInterval(async () => { await refetch(); }, 4000);
      const timeout = setTimeout(() => {
        stopPolling();
        setConnecting(false);
      }, 120000);
      pollRef.current = { interval, timeout };
    } else {
      setConnecting(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    await testConnection();
    setTesting(false);
  };

  const handleDisconnect = async () => {
    if (confirm('Είστε σίγουροι ότι θέλετε να αποσυνδέσετε τον λογαριασμό Gmail;')) {
      await disconnectAccount();
    }
  };

  const handlePresetChange = (val: PresetKey) => {
    setPreset(val);
    if (val !== 'custom') {
      setForm((f) => ({ ...f, ...PRESETS[val] }));
    }
  };

  const handleTestManual = async () => {
    setTestingManual(true);
    setTestResult(null);
    try {
      const res = await supabase.functions.invoke('email-imap-test', {
        body: {
          imap_host: form.imap_host, imap_port: Number(form.imap_port),
          smtp_host: form.smtp_host, smtp_port: Number(form.smtp_port),
          username: form.username || form.email_address,
          password: form.password,
          use_tls: form.use_tls,
        },
      });
      if (res.error) {
        setTestResult({ ok: false, imap: false, smtp: false, error: (res.error as any)?.message || 'Σφάλμα' });
      } else {
        setTestResult(res.data);
      }
    } catch (e: any) {
      setTestResult({ ok: false, imap: false, smtp: false, error: e?.message || 'Σφάλμα' });
    } finally {
      setTestingManual(false);
    }
  };

  const handleSaveManual = async () => {
    if (!form.email_address || !form.password) {
      toast.error('Συμπληρώστε email και password');
      return;
    }
    setSaving(true);
    try {
      const res = await supabase.functions.invoke('email-imap-save', {
        body: {
          email_address: form.email_address,
          display_name: form.display_name || null,
          imap_host: form.imap_host, imap_port: Number(form.imap_port),
          smtp_host: form.smtp_host, smtp_port: Number(form.smtp_port),
          username: form.username || form.email_address,
          password: form.password,
          use_tls: form.use_tls,
        },
      });
      if (res.error || (res.data as any)?.error) {
        toast.error('Αποτυχία αποθήκευσης: ' + ((res.error as any)?.message || (res.data as any)?.error));
      } else {
        toast.success('Ο λογαριασμός αποθηκεύτηκε');
        setForm((f) => ({ ...f, password: '' }));
        setTestResult(null);
        loadManual();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteManual = async () => {
    if (!manualAccount?.id) return;
    if (!confirm('Να αποσυνδεθεί ο IMAP/SMTP λογαριασμός;')) return;
    const { error } = await supabase.from('email_accounts').delete().eq('id', manualAccount.id);
    if (error) toast.error('Σφάλμα: ' + error.message);
    else {
      toast.success('Ο λογαριασμός αποσυνδέθηκε');
      setManualAccount(null);
    }
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          <CardTitle>Email / Inbox</CardTitle>
        </div>
        <CardDescription>
          Συνδέστε τον email λογαριασμό σας — Gmail με ένα κλικ ή οποιοδήποτε άλλο mailbox μέσω IMAP/SMTP
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={manualAccount ? 'manual' : 'gmail'} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="gmail">
              <Mail className="h-4 w-4 mr-2" /> Gmail (OAuth)
            </TabsTrigger>
            <TabsTrigger value="manual">
              <Server className="h-4 w-4 mr-2" /> IMAP / SMTP
            </TabsTrigger>
          </TabsList>

          {/* ─────────── GMAIL TAB ─────────── */}
          <TabsContent value="gmail" className="space-y-6 pt-6">
            {gmailAccount && (
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Συνδεδεμένο
              </Badge>
            )}
            {gmailAccount ? (
              <>
                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <span className="font-medium">{gmailAccount.email_address}</span>
                  </div>
                  {gmailAccount.display_name && (
                    <p className="text-sm text-muted-foreground">{gmailAccount.display_name}</p>
                  )}
                  {gmailAccount.last_sync_at && (
                    <p className="text-xs text-muted-foreground">
                      Τελευταίος συγχρονισμός: {new Date(gmailAccount.last_sync_at).toLocaleString('el-GR')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <Button variant="outline" onClick={handleTest} disabled={testing}>
                    {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plug className="h-4 w-4 mr-2" />}
                    Δοκιμή Σύνδεσης
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleDisconnect}>
                    <Trash2 className="h-4 w-4 mr-2" /> Αποσύνδεση
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground space-y-2">
                  <p>Συνδεθείτε με Gmail μέσω OAuth2 — η πιο γρήγορη επιλογή.</p>
                </div>
                <Button onClick={handleConnect} disabled={connecting} size="lg">
                  {connecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
                  Σύνδεση με Gmail
                </Button>
              </div>
            )}
          </TabsContent>

          {/* ─────────── MANUAL IMAP/SMTP TAB ─────────── */}
          <TabsContent value="manual" className="space-y-4 pt-6">
            {manualAccount && (
              <div className="rounded-lg bg-success/5 border border-success/20 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span className="font-medium">{manualAccount.email_address}</span>
                  <Badge variant="outline" className="ml-auto">IMAP/SMTP</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {manualAccount.imap_host}:{manualAccount.imap_port} · {manualAccount.smtp_host}:{manualAccount.smtp_port}
                </p>
                {manualAccount.last_sync_at && (
                  <p className="text-xs text-muted-foreground">
                    Τελευταίος συγχρονισμός: {new Date(manualAccount.last_sync_at).toLocaleString('el-GR')}
                  </p>
                )}
                <Button variant="destructive" size="sm" onClick={handleDeleteManual} className="mt-2">
                  <Trash2 className="h-4 w-4 mr-2" /> Αποσύνδεση
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label>Πάροχος (προεπιλογές)</Label>
              <Select value={preset} onValueChange={(v) => handlePresetChange(v as PresetKey)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gmail">Gmail</SelectItem>
                  <SelectItem value="outlook">Outlook / Office 365</SelectItem>
                  <SelectItem value="yahoo">Yahoo</SelectItem>
                  <SelectItem value="custom">Άλλο (custom)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" placeholder="you@example.com"
                  value={form.email_address}
                  onChange={(e) => setForm({ ...form, email_address: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Display name</Label>
                <Input placeholder="Όνομα Επώνυμο"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
              </div>

              <div className="space-y-1.5">
                <Label>IMAP host *</Label>
                <Input value={form.imap_host}
                  onChange={(e) => { setForm({ ...form, imap_host: e.target.value }); setPreset('custom'); }} />
              </div>
              <div className="space-y-1.5">
                <Label>IMAP port *</Label>
                <Input type="number" value={form.imap_port}
                  onChange={(e) => { setForm({ ...form, imap_port: Number(e.target.value) }); setPreset('custom'); }} />
              </div>

              <div className="space-y-1.5">
                <Label>SMTP host *</Label>
                <Input value={form.smtp_host}
                  onChange={(e) => { setForm({ ...form, smtp_host: e.target.value }); setPreset('custom'); }} />
              </div>
              <div className="space-y-1.5">
                <Label>SMTP port *</Label>
                <Input type="number" value={form.smtp_port}
                  onChange={(e) => { setForm({ ...form, smtp_port: Number(e.target.value) }); setPreset('custom'); }} />
              </div>

              <div className="space-y-1.5">
                <Label>Username</Label>
                <Input placeholder="default: email"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Password *</Label>
                <Input type="password" placeholder="App password ή κωδικός λογαριασμού"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch id="use_tls" checked={form.use_tls}
                onCheckedChange={(v) => setForm({ ...form, use_tls: v })} />
              <Label htmlFor="use_tls" className="cursor-pointer">Χρήση TLS/SSL</Label>
            </div>

            {preset === 'gmail' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Για Gmail χρειάζεστε <strong>App Password</strong> (Google Account → Security → 2-Step Verification → App passwords),
                  όχι τον κανονικό κωδικό σας.
                </AlertDescription>
              </Alert>
            )}

            {testResult && (
              <Alert variant={testResult.ok ? 'default' : 'destructive'}>
                {testResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertDescription>
                  {testResult.ok
                    ? 'Επιτυχής σύνδεση σε IMAP & SMTP. Μπορείτε να αποθηκεύσετε.'
                    : (testResult.error || 'Αποτυχία σύνδεσης')}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center gap-3 flex-wrap pt-2">
              <Button variant="outline" onClick={handleTestManual}
                disabled={testingManual || !form.email_address || !form.password}>
                {testingManual ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plug className="h-4 w-4 mr-2" />}
                Δοκιμή Σύνδεσης
              </Button>
              <Button onClick={handleSaveManual} disabled={saving || !testResult?.ok}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Αποθήκευση
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
