import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEmailAccount, PROVIDER_PRESETS } from '@/hooks/useEmailAccount';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Mail, Loader2, Save, Trash2, Plug, CheckCircle2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export function EmailAccountSetup() {
  const { user, company } = useAuth();
  const { account, loading, saveAccount, deleteAccount, testConnection } = useEmailAccount();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [form, setForm] = useState({
    email_address: '',
    display_name: '',
    imap_host: '',
    imap_port: 993,
    smtp_host: '',
    smtp_port: 587,
    username: '',
    encrypted_password: '',
    use_tls: true,
  });

  // Sync form from account when loaded
  useState(() => {
    if (account) {
      setForm({
        email_address: account.email_address || '',
        display_name: account.display_name || '',
        imap_host: account.imap_host || '',
        imap_port: account.imap_port || 993,
        smtp_host: account.smtp_host || '',
        smtp_port: account.smtp_port || 587,
        username: account.username || '',
        encrypted_password: '',
        use_tls: account.use_tls ?? true,
      });
    }
  });

  const applyPreset = (provider: string) => {
    const preset = PROVIDER_PRESETS[provider];
    if (preset) {
      setForm(prev => ({ ...prev, ...preset }));
      toast.info(`Ρυθμίσεις ${provider.charAt(0).toUpperCase() + provider.slice(1)} εφαρμόστηκαν`);
    }
  };

  const handleSave = async () => {
    if (!form.email_address || !form.imap_host || !form.smtp_host || !form.username) {
      toast.error('Συμπληρώστε όλα τα υποχρεωτικά πεδία');
      return;
    }
    setSaving(true);
    const payload: any = { ...form };
    if (!payload.encrypted_password && account) {
      delete payload.encrypted_password;
    }
    await saveAccount(payload);
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    await testConnection();
    setTesting(false);
  };

  const handleDelete = async () => {
    if (confirm('Είστε σίγουροι ότι θέλετε να αφαιρέσετε τον λογαριασμό email;')) {
      await deleteAccount();
    }
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          <CardTitle>Email / Inbox</CardTitle>
          {account && (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Συνδεδεμένο
            </Badge>
          )}
        </div>
        <CardDescription>
          Συνδέστε τον email λογαριασμό σας για να βλέπετε και να στέλνετε emails μέσα από την εφαρμογή
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Provider Presets */}
        <div className="space-y-2">
          <Label>Γρήγορη Ρύθμιση</Label>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => applyPreset('gmail')}>
              Gmail
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyPreset('outlook')}>
              Outlook
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyPreset('yahoo')}>
              Yahoo
            </Button>
          </div>
        </div>

        <Separator />

        {/* Basic Info */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email_address">Email *</Label>
            <Input
              id="email_address"
              type="email"
              value={form.email_address}
              onChange={e => setForm(prev => ({ ...prev, email_address: e.target.value }))}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="display_name">Εμφανιζόμενο Όνομα</Label>
            <Input
              id="display_name"
              value={form.display_name}
              onChange={e => setForm(prev => ({ ...prev, display_name: e.target.value }))}
              placeholder="Το όνομά σας"
            />
          </div>
        </div>

        {/* IMAP Settings */}
        <div className="space-y-3">
          <Label className="text-muted-foreground text-xs uppercase tracking-wider">IMAP (Λήψη Email)</Label>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="imap_host">IMAP Server *</Label>
              <Input
                id="imap_host"
                value={form.imap_host}
                onChange={e => setForm(prev => ({ ...prev, imap_host: e.target.value }))}
                placeholder="imap.gmail.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imap_port">IMAP Port</Label>
              <Input
                id="imap_port"
                type="number"
                value={form.imap_port}
                onChange={e => setForm(prev => ({ ...prev, imap_port: parseInt(e.target.value) || 993 }))}
              />
            </div>
          </div>
        </div>

        {/* SMTP Settings */}
        <div className="space-y-3">
          <Label className="text-muted-foreground text-xs uppercase tracking-wider">SMTP (Αποστολή Email)</Label>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smtp_host">SMTP Server *</Label>
              <Input
                id="smtp_host"
                value={form.smtp_host}
                onChange={e => setForm(prev => ({ ...prev, smtp_host: e.target.value }))}
                placeholder="smtp.gmail.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp_port">SMTP Port</Label>
              <Input
                id="smtp_port"
                type="number"
                value={form.smtp_port}
                onChange={e => setForm(prev => ({ ...prev, smtp_port: parseInt(e.target.value) || 587 }))}
              />
            </div>
          </div>
        </div>

        {/* Auth */}
        <div className="space-y-3">
          <Label className="text-muted-foreground text-xs uppercase tracking-wider">Ταυτοποίηση</Label>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={form.username}
                onChange={e => setForm(prev => ({ ...prev, username: e.target.value }))}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="encrypted_password">App Password *</Label>
              <Input
                id="encrypted_password"
                type="password"
                value={form.encrypted_password}
                onChange={e => setForm(prev => ({ ...prev, encrypted_password: e.target.value }))}
                placeholder={account ? '••••••••' : 'Κωδικός εφαρμογής'}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.use_tls}
              onCheckedChange={v => setForm(prev => ({ ...prev, use_tls: v }))}
            />
            <Label className="text-sm">Χρήση TLS/SSL</Label>
          </div>
        </div>

        {/* Gmail help */}
        <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground space-y-1">
          <p className="font-medium">💡 Για Gmail:</p>
          <p>Χρησιμοποιήστε App Password αντί του κανονικού κωδικού σας.</p>
          <a
            href="https://myaccount.google.com/apppasswords"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            Δημιουργία App Password <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Αποθήκευση
          </Button>
          {account && (
            <>
              <Button variant="outline" onClick={handleTest} disabled={testing}>
                {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plug className="h-4 w-4 mr-2" />}
                Δοκιμή Σύνδεσης
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Αφαίρεση
              </Button>
            </>
          )}
        </div>

        {account?.last_sync_at && (
          <p className="text-xs text-muted-foreground">
            Τελευταίος συγχρονισμός: {new Date(account.last_sync_at).toLocaleString('el-GR')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
