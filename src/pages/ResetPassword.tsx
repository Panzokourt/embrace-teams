import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import PasswordStrengthBar, { getPasswordScore } from '@/components/auth/PasswordStrengthBar';
import olsenyLogo from '@/assets/olseny-logo.png';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event from the hash fragment
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Οι κωδικοί δεν ταιριάζουν');
      return;
    }
    if (getPasswordScore(password) < 3) {
      toast.error('Ο κωδικός δεν πληροί τα κριτήρια ασφαλείας');
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Ο κωδικός ενημερώθηκε επιτυχώς!');
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="force-light min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <img src={olsenyLogo} alt="Olseny" className="h-8 w-8 rounded-lg" />
          <span className="text-xl font-bold text-foreground">OLSENY</span>
        </div>

        <Card className="border-border/40">
          <CardHeader className="pb-4">
            <CardTitle>Ορισμός νέου κωδικού</CardTitle>
            <CardDescription>
              {isRecovery
                ? 'Εισάγετε τον νέο σας κωδικό παρακάτω.'
                : 'Περιμένουμε επιβεβαίωση… Αν δεν ανακατευθυνθήκατε από email, ο σύνδεσμος μπορεί να έχει λήξει.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Νέος κωδικός</Label>
                <Input id="new-password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required disabled={!isRecovery} />
                <PasswordStrengthBar password={password} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">Επιβεβαίωση κωδικού</Label>
                <Input id="confirm-new-password" type="password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required disabled={!isRecovery} />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-sm text-destructive">Οι κωδικοί δεν ταιριάζουν</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || !isRecovery}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Αποθήκευση…</> : 'Αποθήκευση κωδικού'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
