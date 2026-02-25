import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle, Mail, Eye, EyeOff } from 'lucide-react';
import olsenyLogo from '@/assets/olseny-logo.png';

type Status = 'loading' | 'success' | 'error' | 'login-required' | 'register';

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, refreshUserData } = useAuth();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [invitationEmail, setInvitationEmail] = useState('');

  // Registration form
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [registering, setRegistering] = useState(false);

  // Login form
  const [loginPassword, setLoginPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user && token) {
      // Check if invitation exists and get email
      fetchInvitationEmail();
      return;
    }

    if (user && token) {
      acceptInvite();
    }
  }, [user, authLoading, token]);

  const fetchInvitationEmail = async () => {
    try {
      // We can't read invitations without auth, so we show login/register options
      setStatus('login-required');
    } catch {
      setStatus('login-required');
    }
  };

  const acceptInvite = async () => {
    setStatus('loading');
    try {
      const { data, error } = await supabase.rpc('accept_invitation', { _token: token });
      if (error) throw error;
      const result = data as any;
      if (!result.success) {
        setErrorMsg(result.error);
        setStatus('error');
        return;
      }
      setStatus('success');
      toast.success('Πρόσκληση αποδεκτή!');
      await refreshUserData();
    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  const handleLogin = async () => {
    if (!invitationEmail.trim() || !loginPassword.trim()) return;
    setLoggingIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: invitationEmail.trim(),
        password: loginPassword.trim(),
      });
      if (error) throw error;
      // After login, the useEffect will trigger acceptInvite
    } catch (err: any) {
      toast.error(err.message || 'Σφάλμα σύνδεσης');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleRegister = async () => {
    if (!invitationEmail.trim() || !password.trim() || !fullName.trim()) return;
    setRegistering(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: invitationEmail.trim(),
        password: password.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/accept-invite/${token}`,
          data: { full_name: fullName.trim() },
        },
      });
      if (error) throw error;
      toast.success('Ελέγξτε το email σας για επιβεβαίωση!');
    } catch (err: any) {
      toast.error(err.message || 'Σφάλμα εγγραφής');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <img src={olsenyLogo} alt="Olseny" className="h-10 w-10 rounded-lg" />
          <span className="text-2xl font-bold text-foreground">OLSENY</span>
        </div>

        <Card className="border-border/40">
          <CardContent className="py-10 px-8">
            {status === 'loading' && (
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Αποδοχή πρόσκλησης...</p>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">Επιτυχία!</h2>
                <p className="text-muted-foreground mb-6">Η πρόσκληση έγινε αποδεκτή</p>
                <Button onClick={() => navigate('/welcome', { replace: true })} className="w-full">
                  Συνέχεια
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center">
                <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">Σφάλμα</h2>
                <p className="text-muted-foreground mb-6">{errorMsg}</p>
                <Button variant="outline" onClick={() => navigate('/auth')}>Επιστροφή</Button>
              </div>
            )}

            {status === 'login-required' && (
              <div className="space-y-6">
                <div className="text-center">
                  <Mail className="h-12 w-12 text-primary mx-auto mb-3" />
                  <h2 className="text-xl font-semibold text-foreground mb-1">Αποδοχή πρόσκλησης</h2>
                  <p className="text-sm text-muted-foreground">
                    Συνδεθείτε ή δημιουργήστε λογαριασμό
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="you@company.com"
                      value={invitationEmail}
                      onChange={(e) => setInvitationEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Κωδικός</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleLogin} disabled={loggingIn || !invitationEmail || !loginPassword}>
                    {loggingIn ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Σύνδεση & Αποδοχή
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">ή</span>
                  </div>
                </div>

                <Button variant="outline" className="w-full" onClick={() => setStatus('register')}>
                  Δημιουργία νέου λογαριασμού
                </Button>
              </div>
            )}

            {status === 'register' && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-foreground mb-1">Δημιουργία λογαριασμού</h2>
                  <p className="text-sm text-muted-foreground">
                    Εγγραφείτε για να αποδεχθείτε την πρόσκληση
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Ονοματεπώνυμο</Label>
                    <Input
                      placeholder="Γιάννης Παπαδόπουλος"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="you@company.com"
                      value={invitationEmail}
                      onChange={(e) => setInvitationEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Κωδικός</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Τουλάχιστον 6 χαρακτήρες"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleRegister} disabled={registering || !fullName || !invitationEmail || !password}>
                    {registering ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Εγγραφή
                  </Button>
                </div>

                <Button variant="ghost" className="w-full" onClick={() => setStatus('login-required')}>
                  Έχω ήδη λογαριασμό
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
