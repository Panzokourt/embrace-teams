import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Building2, Mail, Link2, ArrowLeft, CheckCircle, Clock } from 'lucide-react';
import olsenyLogo from '@/assets/olseny-logo.png';

type Step = 'loading' | 'choose' | 'create-org' | 'accept-invite' | 'domain-join' | 'pending';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, profile, companyRole, signOut, refreshUserData } = useAuth();
  const [step, setStep] = useState<Step>('loading');

  // If user already has an active company role, redirect to main app immediately
  useEffect(() => {
    if (companyRole) {
      navigate('/', { replace: true });
    }
  }, [companyRole, navigate]);
  const [loading, setLoading] = useState(false);
  const [autoOnboardRan, setAutoOnboardRan] = useState(false);

  // Create org state
  const [companyName, setCompanyName] = useState('');
  const [companyDomain, setCompanyDomain] = useState('');

  // Invite state
  const [inviteToken, setInviteToken] = useState('');

  // Domain join state
  const [domainCompanies, setDomainCompanies] = useState<any[]>([]);
  const [domainChecked, setDomainChecked] = useState(false);

  // Pending info
  const [pendingCompanyName, setPendingCompanyName] = useState('');

  const emailDomain = user?.email?.split('@')[1] || '';
  const isPersonalEmail = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'icloud.com', 'yahoo.gr', 'hotmail.gr', 'googlemail.com', 'protonmail.com', 'aol.com', 'mail.com', 'zoho.com'].includes(emailDomain);

  // Auto-onboard on mount
  useEffect(() => {
    if (!user || autoOnboardRan) return;
    setAutoOnboardRan(true);

    const runAutoOnboard = async () => {
      try {
        const { data, error } = await supabase.rpc('auto_onboard_user');
        if (error) throw error;

        const result = data as any;
        switch (result.action) {
          case 'created_company':
            toast.success(`Η εταιρεία "${result.company_name}" δημιουργήθηκε αυτόματα!`);
            await refreshUserData();
            navigate('/', { replace: true });
            return;
          case 'join_requested':
            setPendingCompanyName(result.company_name || '');
            setStep('pending');
            return;
          case 'already_requested':
            setPendingCompanyName(result.company_name || '');
            setStep('pending');
            return;
          case 'already_member':
            await refreshUserData();
            navigate('/', { replace: true });
            return;
          case 'personal_email':
          default:
            setStep('choose');
            return;
        }
      } catch (error: any) {
        console.error('Auto-onboard error:', error);
        setStep('choose');
      }
    };

    runAutoOnboard();
  }, [user]);

  const handleCreateOrg = async () => {
    if (!companyName.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('create_company_with_owner', {
        _name: companyName.trim(),
        _domain: companyDomain.trim() || emailDomain
      });
      if (error) throw error;
      toast.success('Η εταιρεία δημιουργήθηκε!');
      await refreshUserData();
      navigate('/', { replace: true });
    } catch (error: any) {
      toast.error(error.message || 'Σφάλμα δημιουργίας');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!inviteToken.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('accept_invitation', {
        _token: inviteToken.trim()
      });
      if (error) throw error;
      const result = data as any;
      if (!result.success) {
        toast.error(result.error || 'Μη έγκυρη πρόσκληση');
        return;
      }
      toast.success('Η πρόσκληση έγινε αποδεκτή!');
      await refreshUserData();
      navigate('/', { replace: true });
    } catch (error: any) {
      toast.error(error.message || 'Σφάλμα αποδοχής');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckDomain = async () => {
    if (isPersonalEmail) {
      toast.error('Χρησιμοποιήστε εταιρικό email για αυτή τη λειτουργία');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('find_companies_by_domain', {
        _domain: emailDomain
      });
      if (error) throw error;
      setDomainCompanies(data || []);
      setDomainChecked(true);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestJoin = async (companyId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('join_requests')
        .insert({ user_id: user!.id, company_id: companyId });
      if (error) throw error;
      setStep('pending');
      toast.success('Το αίτημα στάλθηκε!');
    } catch (error: any) {
      if (error.message?.includes('duplicate')) {
        toast.error('Έχετε ήδη στείλει αίτημα');
      } else {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <img src={olsenyLogo} alt="Olseny" className="h-10 w-10 rounded-lg" />
          <span className="text-2xl font-bold text-foreground">OLSENY</span>
        </div>

        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Ρύθμιση λογαριασμού...</p>
          </div>
        )}

        {step === 'choose' && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground">Καλωσήρθατε, {profile?.full_name || 'χρήστη'}!</h1>
              <p className="text-muted-foreground mt-2">Πώς θέλετε να ξεκινήσετε;</p>
            </div>

            <Card className="cursor-pointer hover:border-primary/40 transition-colors border-border/40" onClick={() => setStep('create-org')}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Building2 className="h-6 w-6" /></div>
                <div>
                  <h3 className="font-semibold text-foreground">Δημιουργία εταιρείας</h3>
                  <p className="text-sm text-muted-foreground">Δημιουργήστε νέο workspace και γίνετε Owner</p>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:border-primary/40 transition-colors border-border/40" onClick={() => setStep('accept-invite')}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Mail className="h-6 w-6" /></div>
                <div>
                  <h3 className="font-semibold text-foreground">Αποδοχή πρόσκλησης</h3>
                  <p className="text-sm text-muted-foreground">Εισάγετε κωδικό πρόσκλησης</p>
                </div>
              </CardContent>
            </Card>

            {!isPersonalEmail && (
              <Card className="cursor-pointer hover:border-primary/40 transition-colors border-border/40" onClick={() => { setStep('domain-join'); handleCheckDomain(); }}>
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Link2 className="h-6 w-6" /></div>
                  <div>
                    <h3 className="font-semibold text-foreground">Αίτημα μέσω domain</h3>
                    <p className="text-sm text-muted-foreground">Βρείτε εταιρεία με domain @{emailDomain}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="text-center pt-4">
              <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
                <ArrowLeft className="h-4 w-4 mr-2" />Αποσύνδεση
              </Button>
            </div>
          </div>
        )}

        {step === 'create-org' && (
          <Card className="border-border/40">
            <CardHeader>
              <Button variant="ghost" size="sm" className="w-fit -ml-2 mb-2" onClick={() => setStep('choose')}>
                <ArrowLeft className="h-4 w-4 mr-1" />Πίσω
              </Button>
              <CardTitle>Δημιουργία εταιρείας</CardTitle>
              <CardDescription>Θα γίνετε Owner αυτού του workspace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Όνομα εταιρείας *</Label>
                <Input placeholder="Η εταιρεία μου" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Domain</Label>
                <Input placeholder={emailDomain || 'company.com'} value={companyDomain} onChange={(e) => setCompanyDomain(e.target.value)} />
                <p className="text-xs text-muted-foreground">Χρησιμοποιείται για domain-based join requests</p>
              </div>
              <Button className="w-full" onClick={handleCreateOrg} disabled={loading || !companyName.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Δημιουργία
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'accept-invite' && (
          <Card className="border-border/40">
            <CardHeader>
              <Button variant="ghost" size="sm" className="w-fit -ml-2 mb-2" onClick={() => setStep('choose')}>
                <ArrowLeft className="h-4 w-4 mr-1" />Πίσω
              </Button>
              <CardTitle>Αποδοχή πρόσκλησης</CardTitle>
              <CardDescription>Εισάγετε τον κωδικό πρόσκλησης</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Κωδικός πρόσκλησης</Label>
                <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={inviteToken} onChange={(e) => setInviteToken(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleAcceptInvite} disabled={loading || !inviteToken.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Αποδοχή
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'domain-join' && (
          <Card className="border-border/40">
            <CardHeader>
              <Button variant="ghost" size="sm" className="w-fit -ml-2 mb-2" onClick={() => setStep('choose')}>
                <ArrowLeft className="h-4 w-4 mr-1" />Πίσω
              </Button>
              <CardTitle>Αίτημα μέσω domain</CardTitle>
              <CardDescription>Εταιρείες με domain @{emailDomain}</CardDescription>
            </CardHeader>
            <CardContent>
              {loading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
              {domainChecked && !loading && domainCompanies.length === 0 && (
                <p className="text-center text-muted-foreground py-8">Δεν βρέθηκαν εταιρείες με αυτό το domain</p>
              )}
              {domainCompanies.map((company) => (
                <div key={company.id} className="flex items-center justify-between p-4 rounded-xl border border-border/40 mb-3">
                  <div>
                    <p className="font-medium text-foreground">{company.name}</p>
                  </div>
                  <Button size="sm" onClick={() => handleRequestJoin(company.id)} disabled={loading}>
                    Αίτημα
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {step === 'pending' && (
          <Card className="border-border/40">
            <CardContent className="text-center py-12">
              <Clock className="h-16 w-16 text-amber-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Σε αναμονή έγκρισης</h2>
              <p className="text-muted-foreground mb-2">
                Το αίτημά σας για ένταξη στην εταιρεία {pendingCompanyName && <strong>"{pendingCompanyName}"</strong>} έχει σταλεί.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Ο διαχειριστής θα εγκρίνει το αίτημά σας. Θα ενημερωθείτε μόλις γίνει αποδεκτό.
              </p>
              <Button variant="outline" onClick={signOut}>Αποσύνδεση</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
