import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { lovable } from '@/integrations/lovable/index';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import olsenyLogo from '@/assets/olseny-logo.png';
import PasswordStrengthBar, { getPasswordScore } from '@/components/auth/PasswordStrengthBar';

// --- Schemas ---
const signInSchema = z.object({
  email: z.string().email('Μη έγκυρο email'),
  password: z.string().min(6, 'Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες'),
});

const signUpSchema = z.object({
  email: z.string().email('Μη έγκυρο email'),
  password: z.string().min(8, 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες'),
  confirmPassword: z.string(),
  fullName: z.string().min(2, 'Το όνομα πρέπει να έχει τουλάχιστον 2 χαρακτήρες'),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Οι κωδικοί δεν ταιριάζουν',
  path: ['confirmPassword'],
});

// --- Rate limiter ---
const MAX_ATTEMPTS = 5;
const COOLDOWN_SEC = 30;

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading, signIn, signUp, postLoginRoute } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Forgot password
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // Rate limiting
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownEnd, setCooldownEnd] = useState<number | null>(null);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  useEffect(() => {
    if (!loading && user && postLoginRoute) {
      navigate(postLoginRoute, { replace: true });
    }
  }, [user, loading, navigate, postLoginRoute]);

  // Countdown timer
  useEffect(() => {
    if (!cooldownEnd) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((cooldownEnd - Date.now()) / 1000));
      setCooldownLeft(left);
      if (left <= 0) setCooldownEnd(null);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [cooldownEnd]);

  const isLockedOut = cooldownEnd !== null && cooldownLeft > 0;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) return;

    try {
      signInSchema.parse({ email, password });
      setErrors({});
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach(e => { if (e.path[0]) newErrors[e.path[0] as string] = e.message; });
        setErrors(newErrors);
      }
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      const attempts = failedAttempts + 1;
      setFailedAttempts(attempts);
      if (attempts >= MAX_ATTEMPTS) {
        setCooldownEnd(Date.now() + COOLDOWN_SEC * 1000);
        setFailedAttempts(0);
        toast.error(`Πολλές αποτυχημένες προσπάθειες. Δοκιμάστε ξανά σε ${COOLDOWN_SEC} δευτερόλεπτα.`);
      } else {
        toast.error(error.message.includes('Invalid login credentials') ? 'Λάθος email ή κωδικός' : error.message);
      }
    } else {
      setFailedAttempts(0);
      toast.success('Επιτυχής σύνδεση!');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!acceptTerms) {
      toast.error('Πρέπει να αποδεχτείτε τους Όρους Χρήσης');
      return;
    }

    try {
      signUpSchema.parse({ email, password, confirmPassword, fullName });
      setErrors({});
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach(e => { if (e.path[0]) newErrors[e.path[0] as string] = e.message; });
        setErrors(newErrors);
      }
      return;
    }

    if (getPasswordScore(password) < 3) {
      toast.error('Ο κωδικός δεν πληροί τα κριτήρια ασφαλείας (τουλάχιστον 3/4 κριτήρια)');
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(email, password, fullName);
    setIsLoading(false);

    if (error) {
      toast.error(error.message.includes('already registered') ? 'Αυτό το email χρησιμοποιείται ήδη' : error.message);
    } else {
      toast.success('Ελέγξτε το email σας για επιβεβαίωση!');
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast.error('Σφάλμα σύνδεσης με Google');
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Ελέγξτε το email σας για σύνδεσμο επαναφοράς!');
      setShowForgot(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="force-light min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <img src={olsenyLogo} alt="Olseny" className="h-10 w-10 rounded-lg" />
          <span className="text-2xl font-bold text-foreground tracking-tight">OLSENY</span>
        </div>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Σύνδεση</TabsTrigger>
              <TabsTrigger value="signup">Εγγραφή</TabsTrigger>
            </TabsList>

            {/* ===== SIGN IN ===== */}
            <TabsContent value="signin">
              <Card className="border-border/40">
                <CardHeader className="pb-4">
                  <CardTitle>Καλωσήρθατε</CardTitle>
                  <CardDescription>Συνδεθείτε στο λογαριασμό σας</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <GoogleButton onClick={handleGoogleLogin} loading={googleLoading} label="Σύνδεση με Google" />
                  <MicrosoftPlaceholder />
                  <OrSeparator />

                  {showForgot ? (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <p className="text-sm text-muted-foreground">Εισάγετε το email σας και θα λάβετε σύνδεσμο επαναφοράς.</p>
                      <Input type="email" placeholder="you@company.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required />
                      <div className="flex gap-2">
                        <Button type="submit" className="flex-1" disabled={forgotLoading}>
                          {forgotLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Αποστολή
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setShowForgot(false)}>Πίσω</Button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email">Email</Label>
                        <Input id="signin-email" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
                        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="signin-password">Κωδικός</Label>
                          <button type="button" className="text-xs text-primary hover:underline" onClick={() => setShowForgot(true)}>
                            Ξεχάσατε τον κωδικό;
                          </button>
                        </div>
                        <Input id="signin-password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                        {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                      </div>
                      {isLockedOut && (
                        <p className="text-sm text-destructive font-medium">
                          Πολλές αποτυχημένες προσπάθειες. Δοκιμάστε ξανά σε {cooldownLeft}″
                        </p>
                      )}
                      <Button type="submit" className="w-full" disabled={isLoading || isLockedOut}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Σύνδεση…</> : 'Σύνδεση'}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ===== SIGN UP ===== */}
            <TabsContent value="signup">
              <Card className="border-border/40">
                <CardHeader className="pb-4">
                  <CardTitle>Δημιουργία λογαριασμού</CardTitle>
                  <CardDescription>Εγγραφείτε για να ξεκινήσετε</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <GoogleButton onClick={handleGoogleLogin} loading={googleLoading} label="Εγγραφή με Google" />
                  <OrSeparator />

                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Ονοματεπώνυμο</Label>
                      <Input id="signup-name" type="text" placeholder="Γιάννης Παπαδόπουλος" value={fullName} onChange={e => setFullName(e.target.value)} required />
                      {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input id="signup-email" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
                      {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Κωδικός</Label>
                      <Input id="signup-password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                      {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                      <PasswordStrengthBar password={password} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm">Επιβεβαίωση κωδικού</Label>
                      <Input id="signup-confirm" type="password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                      {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                    </div>
                    <div className="flex items-start gap-2">
                      <Checkbox id="terms" checked={acceptTerms} onCheckedChange={(v) => setAcceptTerms(v === true)} className="mt-0.5" />
                      <Label htmlFor="terms" className="text-sm font-normal leading-snug cursor-pointer">
                        Αποδέχομαι τους{' '}
                        <a href="#" className="text-primary hover:underline" onClick={e => e.stopPropagation()}>Όρους Χρήσης</a>{' '}
                        και την{' '}
                        <a href="#" className="text-primary hover:underline" onClick={e => e.stopPropagation()}>Πολιτική Απορρήτου</a>
                      </Label>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Εγγραφή…</> : 'Εγγραφή'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          <p className="text-center text-muted-foreground text-xs mt-6">© 2026 Olseny. All rights reserved.</p>
        </div>
      </div>
  );
}

// --- Sub-components ---

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">{icon}</div>
      <div>
        <h3 className="font-semibold text-sidebar-foreground">{title}</h3>
        <p className="text-sidebar-foreground/60 text-sm">{description}</p>
      </div>
    </div>
  );
}

function GoogleButton({ onClick, loading, label }: { onClick: () => void; loading: boolean; label: string }) {
  return (
    <Button variant="outline" className="w-full gap-2" onClick={onClick} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      )}
      {label}
    </Button>
  );
}

function MicrosoftPlaceholder() {
  return (
    <Button variant="outline" className="w-full gap-2 opacity-50 cursor-not-allowed" disabled>
      <svg className="h-4 w-4" viewBox="0 0 24 24">
        <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
        <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
        <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
        <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
      </svg>
      Microsoft — Coming soon
    </Button>
  );
}

function OrSeparator() {
  return (
    <div className="relative">
      <Separator />
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">ή</span>
    </div>
  );
}
