import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Shield, Key, Smartphone, Monitor, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import PasswordStrengthBar, { getPasswordScore } from '@/components/auth/PasswordStrengthBar';

export default function SecuritySettings() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Οι κωδικοί δεν ταιριάζουν');
      return;
    }
    if (getPasswordScore(newPassword) < 3) {
      toast.error('Ο κωδικός δεν πληροί τα κριτήρια ασφαλείας');
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Ο κωδικός ενημερώθηκε επιτυχώς');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ασφάλεια</h1>
        <p className="text-sm text-muted-foreground">Ρυθμίσεις ασφάλειας λογαριασμού</p>
      </div>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Key className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Αλλαγή Κωδικού</CardTitle>
              <CardDescription>Ενημερώστε τον κωδικό πρόσβασης του λογαριασμού σας</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="new-pw">Νέος κωδικός</Label>
              <Input id="new-pw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" required />
              <PasswordStrengthBar password={newPassword} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pw">Επιβεβαίωση κωδικού</Label>
              <Input id="confirm-pw" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-destructive">Οι κωδικοί δεν ταιριάζουν</p>
              )}
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Αποθήκευση…</> : 'Αλλαγή κωδικού'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 2FA */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Έλεγχος Ταυτότητας 2 Παραγόντων (2FA)</CardTitle>
              <CardDescription>Πρόσθετο επίπεδο ασφάλειας για τον λογαριασμό σας</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge variant="outline">Ανενεργό</Badge>
            <Button variant="outline" size="sm" disabled>Ενεργοποίηση</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Η υποστήριξη 2FA θα είναι διαθέσιμη σύντομα.
          </p>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Monitor className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Ενεργές Συνεδρίες</CardTitle>
              <CardDescription>Διαχείριση συνδεδεμένων συσκευών</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted/30 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Monitor className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Τρέχουσα συνεδρία</p>
                <p className="text-xs text-muted-foreground">Αυτή η συσκευή</p>
              </div>
            </div>
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Ενεργή</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
