import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Zap, Shield, Users, BarChart3 } from 'lucide-react';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Μη έγκυρο email'),
  password: z.string().min(6, 'Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες'),
  fullName: z.string().min(2, 'Το όνομα πρέπει να έχει τουλάχιστον 2 χαρακτήρες').optional()
});

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading, signIn, signUp, signOut } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && user) {
      // User is logged in, redirect to homepage
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  const validateForm = (isSignUp: boolean) => {
    try {
      if (isSignUp) {
        authSchema.parse({ email, password, fullName });
      } else {
        authSchema.omit({ fullName: true }).parse({ email, password });
      }
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(false)) return;

    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Λάθος email ή κωδικός');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Επιτυχής σύνδεση!');
      navigate('/', { replace: true });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(true)) return;

    setIsLoading(true);
    const { error } = await signUp(email, password, fullName);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('Αυτό το email χρησιμοποιείται ήδη');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Η εγγραφή ολοκληρώθηκε! Μπορείτε να συνδεθείτε.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // No more pending approval screen - users go directly to the app

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-sidebar-foreground">
              Agency Command
            </span>
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-6">
            Διαχείριση Projects
            <br />
            <span className="gradient-text">Χωρίς Όρια</span>
          </h1>
          
          <p className="text-sidebar-foreground text-lg mb-12">
            Ολοκληρωμένη πλατφόρμα για τη διαχείριση διαγωνισμών, έργων, 
            παραδοτέων και ομάδων σε ένα μέρος.
          </p>

          <div className="space-y-6">
            <Feature 
              icon={<BarChart3 className="h-5 w-5" />}
              title="Real-time Analytics"
              description="Παρακολουθήστε P&L, budgets και KPIs σε πραγματικό χρόνο"
            />
            <Feature 
              icon={<Users className="h-5 w-5" />}
              title="Team Management"
              description="Διαχείριση ομάδων με role-based access control"
            />
            <Feature 
              icon={<Shield className="h-5 w-5" />}
              title="Enterprise Security"
              description="Row-level security για κάθε χρήστη και project"
            />
          </div>
        </div>

        <p className="text-sidebar-foreground/60 text-sm">
          © 2026 Agency Command Center. All rights reserved.
        </p>
      </div>

      {/* Right Side - Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="signin">Σύνδεση</TabsTrigger>
              <TabsTrigger value="signup">Εγγραφή</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <Card>
                <CardHeader>
                  <CardTitle>Καλωσήρθατε πίσω</CardTitle>
                  <CardDescription>
                    Συνδεθείτε στο λογαριασμό σας
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive">{errors.email}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Κωδικός</Label>
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      {errors.password && (
                        <p className="text-sm text-destructive">{errors.password}</p>
                      )}
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Σύνδεση...
                        </>
                      ) : (
                        'Σύνδεση'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="signup">
              <Card>
                <CardHeader>
                  <CardTitle>Δημιουργία λογαριασμού</CardTitle>
                  <CardDescription>
                    Εγγραφείτε για να ξεκινήσετε
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Ονοματεπώνυμο</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Γιάννης Παπαδόπουλος"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                      {errors.fullName && (
                        <p className="text-sm text-destructive">{errors.fullName}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive">{errors.email}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Κωδικός</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      {errors.password && (
                        <p className="text-sm text-destructive">{errors.password}</p>
                      )}
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Εγγραφή...
                        </>
                      ) : (
                        'Εγγραφή'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-white">{title}</h3>
        <p className="text-sidebar-foreground text-sm">{description}</p>
      </div>
    </div>
  );
}

