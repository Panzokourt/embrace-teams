import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Save, Key } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

export function AccountProfileSection() {
  const { profile, user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) throw error;
      toast.success('Το προφίλ ενημερώθηκε!');
    } catch {
      toast.error('Σφάλμα κατά την αποθήκευση');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) return toast.error('Οι κωδικοί δεν ταιριάζουν');
    if (newPw.length < 6) return toast.error('Τουλάχιστον 6 χαρακτήρες');
    setChanging(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      toast.success('Ο κωδικός άλλαξε επιτυχώς!');
      setPwOpen(false);
      setNewPw('');
      setConfirmPw('');
    } catch (err: any) {
      toast.error(err.message || 'Σφάλμα');
    } finally {
      setChanging(false);
    }
  };

  const statusLabel = (s?: string) =>
    s === 'active' ? 'Ενεργός' : s === 'pending' ? 'Εκκρεμεί' : s === 'inactive' ? 'Ανενεργός' : s;

  const statusStyle = (s?: string) =>
    s === 'active' ? 'bg-success/10 text-success border-success/20'
    : s === 'pending' ? 'bg-warning/10 text-warning border-warning/20'
    : 'bg-muted text-muted-foreground';

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fullName">Ονοματεπώνυμο</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Το όνομά σας" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile?.email || ''} disabled className="bg-muted" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Label>Κατάσταση:</Label>
          <Badge variant="outline" className={statusStyle(profile?.status)}>
            {statusLabel(profile?.status)}
          </Badge>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Αποθήκευση
        </Button>

        <Separator />

        <div>
          <Label>Κωδικός Πρόσβασης</Label>
          <p className="text-sm text-muted-foreground mb-2">Αλλάξτε τον κωδικό του λογαριασμού σας</p>
          <Button variant="outline" onClick={() => setPwOpen(true)}>
            <Key className="h-4 w-4 mr-2" />
            Αλλαγή Κωδικού
          </Button>
        </div>

        <Dialog open={pwOpen} onOpenChange={setPwOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Αλλαγή Κωδικού</DialogTitle>
              <DialogDescription>Εισάγετε τον νέο σας κωδικό</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleChangePw} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPw">Νέος Κωδικός</Label>
                <Input id="newPw" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={6} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPw">Επιβεβαίωση</Label>
                <Input id="confirmPw" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required minLength={6} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPwOpen(false)}>Ακύρωση</Button>
                <Button type="submit" disabled={changing}>
                  {changing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Αλλαγή
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
