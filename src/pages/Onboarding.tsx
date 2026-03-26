import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Loader2, PartyPopper, Building2, User, Settings, Rocket,
  ChevronRight, ChevronLeft, Sun, Moon, Link2, ArrowLeft, Clock
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import olsenyLogo from '@/assets/olseny-logo.png';

type WizardStep = 'loading' | 'welcome' | 'company' | 'profile' | 'preferences' | 'ready' | 'pending';

interface DomainCompany {
  id: string;
  name: string;
  logo_url: string | null;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, profile, companyRole, signOut, refreshUserData } = useAuth();
  const { theme, setTheme } = useTheme();

  const [step, setStep] = useState<WizardStep>('loading');
  const [loading, setLoading] = useState(false);
  const [autoCheckDone, setAutoCheckDone] = useState(false);

  // Domain detection state
  const [isPersonalEmail, setIsPersonalEmail] = useState(true);
  const [emailDomain, setEmailDomain] = useState('');
  const [domainCompanies, setDomainCompanies] = useState<DomainCompany[]>([]);
  const [suggestedCompanyName, setSuggestedCompanyName] = useState('');
  const [invitationCompanyName, setInvitationCompanyName] = useState('');

  // Company setup state
  const [companyMode, setCompanyMode] = useState<'create' | 'join' | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [companyDomain, setCompanyDomain] = useState('');

  // Profile fields
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  // Pending info
  const [pendingCompanyName, setPendingCompanyName] = useState('');

  // If user already has an active company role, redirect
  useEffect(() => {
    if (companyRole) {
      navigate('/', { replace: true });
    }
  }, [companyRole, navigate]);

  // Auto-onboard check on mount
  useEffect(() => {
    if (!user || autoCheckDone) return;
    setAutoCheckDone(true);

    const runCheck = async () => {
      try {
        const { data, error } = await supabase.rpc('auto_onboard_user');
        if (error) throw error;

        const result = data as any;
        switch (result.action) {
          case 'invitation_accepted':
            setInvitationCompanyName(result.company_name || '');
            await refreshUserData();
            // Skip to profile step — company already set
            setStep('profile');
            toast.success(`Η πρόσκλησή σας για "${result.company_name}" έγινε αποδεκτή!`);
            return;

          case 'already_member':
            await refreshUserData();
            navigate('/', { replace: true });
            return;

          case 'needs_onboarding':
            setEmailDomain(result.domain || '');
            setIsPersonalEmail(result.is_personal_email || false);
            setDomainCompanies(result.domain_companies || []);
            setSuggestedCompanyName(result.suggested_company_name || '');
            // Pre-fill company name from domain
            if (result.suggested_company_name) {
              setCompanyName(result.suggested_company_name);
              setCompanyDomain(result.domain || '');
            }
            setStep('welcome');
            return;

          default:
            setStep('welcome');
            return;
        }
      } catch (error: any) {
        console.error('Auto-onboard error:', error);
        setStep('welcome');
      }
    };

    runCheck();
  }, [user]);

  // Wizard steps (excluding loading and pending)
  const wizardSteps: WizardStep[] = ['welcome', 'company', 'profile', 'preferences', 'ready'];
  const currentIndex = wizardSteps.indexOf(step);
  const progressPercent = step === 'loading' ? 0 : step === 'pending' ? 50
    : ((currentIndex + 1) / wizardSteps.length) * 100;

  const goNext = () => {
    if (currentIndex >= 0 && currentIndex < wizardSteps.length - 1) {
      setStep(wizardSteps[currentIndex + 1]);
    }
  };
  const goBack = () => {
    if (currentIndex > 0) {
      setStep(wizardSteps[currentIndex - 1]);
    }
  };

  const handleCreateCompany = async () => {
    if (!companyName.trim()) return;
    setLoading(true);
    try {
      // Auto-generate domain: corporate email → emailDomain, personal → unique slug
      const autoDomain = isPersonalEmail
        ? `${companyName.trim().toLowerCase().replace(/\s+/g, '-')}-${user!.id.slice(0, 8)}.personal`
        : emailDomain || 'default.com';

      const { error } = await supabase.rpc('create_company_with_owner', {
        _name: companyName.trim(),
        _domain: autoDomain,
      });
      if (error) {
        if (error.code === '23505') {
          toast.error('Υπάρχει ήδη εταιρεία με αυτό το domain. Ζητήστε πρόσβαση από τον διαχειριστή.');
        } else {
          throw error;
        }
        return;
      }
      toast.success('Η εταιρεία δημιουργήθηκε!');
      await refreshUserData();
      goNext();
    } catch (error: any) {
      toast.error(error.message || 'Σφάλμα δημιουργίας');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestJoin = async (company: DomainCompany) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('join_requests')
        .insert({ user_id: user!.id, company_id: company.id });
      if (error) {
        if (error.message?.includes('duplicate')) {
          toast.error('Έχετε ήδη στείλει αίτημα');
        } else {
          throw error;
        }
        return;
      }
      setPendingCompanyName(company.name);
      setStep('pending');
      toast.success('Το αίτημα στάλθηκε!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const updates: Record<string, any> = { onboarding_completed: true };
      if (phone.trim()) updates.phone = phone.trim();
      if (jobTitle.trim()) updates.job_title = jobTitle.trim();

      await supabase.from('profiles').update(updates).eq('id', user!.id);
      await refreshUserData();
      toast.success('Καλωσήρθατε! 🎉');
      navigate('/', { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Σφάλμα');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="force-light min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <img src={olsenyLogo} alt="Olseny" className="h-10 w-10 rounded-lg" />
          <span className="text-2xl font-bold text-foreground">OLSENY</span>
        </div>

        {/* Progress bar */}
        {step !== 'loading' && (
          <div className="w-full h-1.5 bg-muted rounded-full mb-8 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Loading */}
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Ρύθμιση λογαριασμού...</p>
          </div>
        )}

        {/* Pending */}
        {step === 'pending' && (
          <Card className="border-border/40">
            <CardContent className="text-center py-12">
              <Clock className="h-16 w-16 text-primary mx-auto mb-4" />
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

        {/* Main wizard card */}
        {!['loading', 'pending'].includes(step) && (
          <Card className="border-border/40">
            <CardContent className="py-10 px-8">

              {/* Step: Welcome */}
              {step === 'welcome' && (
                <div className="text-center space-y-6">
                  <PartyPopper className="h-16 w-16 text-primary mx-auto" />
                  <h1 className="text-2xl font-bold text-foreground">
                    Καλωσήρθατε, {profile?.full_name || 'χρήστη'}!
                  </h1>
                  <p className="text-muted-foreground">
                    Ας ρυθμίσουμε μαζί τον χώρο εργασίας σας σε λίγα βήματα.
                  </p>
                  <Button onClick={goNext} className="w-full">
                    Ας ξεκινήσουμε <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
                    <ArrowLeft className="h-4 w-4 mr-2" />Αποσύνδεση
                  </Button>
                </div>
              )}

              {/* Step: Company Setup */}
              {step === 'company' && (
                <div className="space-y-6">
                  <div className="text-center mb-4">
                    <Building2 className="h-10 w-10 text-primary mx-auto mb-2" />
                    <h2 className="text-xl font-semibold text-foreground">Ο χώρος εργασίας σας</h2>
                    <p className="text-sm text-muted-foreground">
                      {isPersonalEmail
                        ? 'Δημιουργήστε μια νέα εταιρεία'
                        : domainCompanies.length > 0
                          ? `Βρέθηκαν εταιρείες με domain @${emailDomain}`
                          : `Δημιουργήστε εταιρεία για @${emailDomain}`
                      }
                    </p>
                  </div>

                  {/* Domain companies found — show join options */}
                  {!isPersonalEmail && domainCompanies.length > 0 && companyMode !== 'create' && (
                    <div className="space-y-3">
                      <Label className="text-muted-foreground text-xs uppercase tracking-wider">Υπάρχουσες εταιρείες</Label>
                      {domainCompanies.map((dc) => (
                        <div key={dc.id} className="flex items-center justify-between p-4 rounded-xl border border-border/40">
                          <div className="flex items-center gap-3">
                            {dc.logo_url ? (
                              <img src={dc.logo_url} alt={dc.name} className="h-8 w-8 rounded-lg" />
                            ) : (
                              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <span className="font-medium text-foreground">{dc.name}</span>
                          </div>
                          <Button size="sm" onClick={() => handleRequestJoin(dc)} disabled={loading}>
                            <Link2 className="h-3.5 w-3.5 mr-1.5" />Αίτημα
                          </Button>
                        </div>
                      ))}
                      <div className="text-center pt-2">
                        <Button variant="ghost" size="sm" onClick={() => setCompanyMode('create')} className="text-muted-foreground">
                          Ή δημιουργήστε νέα εταιρεία
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Create company form */}
                  {(isPersonalEmail || domainCompanies.length === 0 || companyMode === 'create') && (
                    <div className="space-y-4">
                      {companyMode === 'create' && domainCompanies.length > 0 && (
                        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setCompanyMode(null)}>
                          <ArrowLeft className="h-4 w-4 mr-1" />Πίσω στις υπάρχουσες
                        </Button>
                      )}
                      <div className="space-y-2">
                        <Label>Όνομα εταιρείας *</Label>
                        <Input
                          placeholder="Η εταιρεία μου"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                        />
                      </div>
                      <Button
                        className="w-full"
                        onClick={handleCreateCompany}
                        disabled={loading || !companyName.trim()}
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Δημιουργία & συνέχεια
                      </Button>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={goBack} className="flex-1">
                      <ChevronLeft className="h-4 w-4 mr-1" /> Πίσω
                    </Button>
                  </div>
                </div>
              )}

              {/* Step: Profile */}
              {step === 'profile' && (
                <div className="space-y-6">
                  <div className="text-center mb-4">
                    <User className="h-10 w-10 text-primary mx-auto mb-2" />
                    <h2 className="text-xl font-semibold text-foreground">Το προφίλ σας</h2>
                    <p className="text-sm text-muted-foreground">Προαιρετικά στοιχεία</p>
                    {invitationCompanyName && (
                      <p className="text-xs text-primary mt-1">Εταιρεία: {invitationCompanyName}</p>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Τηλέφωνο</Label>
                      <Input placeholder="+30 210 1234567" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Θέση εργασίας</Label>
                      <Input placeholder="π.χ. Project Manager" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    {!invitationCompanyName && (
                      <Button variant="outline" onClick={goBack} className="flex-1">
                        <ChevronLeft className="h-4 w-4 mr-1" /> Πίσω
                      </Button>
                    )}
                    <Button onClick={goNext} className="flex-1">
                      Συνέχεια <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step: Preferences */}
              {step === 'preferences' && (
                <div className="space-y-6">
                  <div className="text-center mb-4">
                    <Settings className="h-10 w-10 text-primary mx-auto mb-2" />
                    <h2 className="text-xl font-semibold text-foreground">Προτιμήσεις</h2>
                    <p className="text-sm text-muted-foreground">Προσαρμόστε την εμπειρία σας</p>
                  </div>
                  <div className="space-y-4">
                    <Label>Θέμα εμφάνισης</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setTheme('light')}
                        className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${
                          theme === 'light' ? 'border-primary bg-primary/5' : 'border-border/40 hover:border-primary/40'
                        }`}
                      >
                        <Sun className="h-5 w-5 text-foreground" />
                        <span className="text-sm font-medium text-foreground">Φωτεινό</span>
                      </button>
                      <button
                        onClick={() => setTheme('dark')}
                        className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${
                          theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border/40 hover:border-primary/40'
                        }`}
                      >
                        <Moon className="h-5 w-5 text-foreground" />
                        <span className="text-sm font-medium text-foreground">Σκοτεινό</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={goBack} className="flex-1">
                      <ChevronLeft className="h-4 w-4 mr-1" /> Πίσω
                    </Button>
                    <Button onClick={goNext} className="flex-1">
                      Συνέχεια <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step: Ready */}
              {step === 'ready' && (
                <div className="text-center space-y-6">
                  <Rocket className="h-16 w-16 text-primary mx-auto" />
                  <h2 className="text-xl font-semibold text-foreground">Είστε έτοιμοι!</h2>
                  <div className="text-left bg-muted/50 rounded-xl p-4 space-y-2 text-sm">
                    <p className="text-muted-foreground"><strong className="text-foreground">Email:</strong> {profile?.email}</p>
                    {jobTitle && <p className="text-muted-foreground"><strong className="text-foreground">Θέση:</strong> {jobTitle}</p>}
                    {phone && <p className="text-muted-foreground"><strong className="text-foreground">Τηλέφωνο:</strong> {phone}</p>}
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={goBack} className="flex-1">
                      <ChevronLeft className="h-4 w-4 mr-1" /> Πίσω
                    </Button>
                    <Button onClick={handleFinish} disabled={loading} className="flex-1">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Μπείτε στον χώρο εργασίας
                    </Button>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
