import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Clock } from 'lucide-react';
import olsenyLogo from '@/assets/olseny-logo.png';

import OnboardingWelcome from '@/components/onboarding/OnboardingWelcome';
import OnboardingCompany from '@/components/onboarding/OnboardingCompany';
import OnboardingProfile from '@/components/onboarding/OnboardingProfile';
import OnboardingTeamInvite from '@/components/onboarding/OnboardingTeamInvite';
import OnboardingFirstClient from '@/components/onboarding/OnboardingFirstClient';
import OnboardingCompanyDocs from '@/components/onboarding/OnboardingCompanyDocs';
import OnboardingAISetup from '@/components/onboarding/OnboardingAISetup';
import OnboardingReady from '@/components/onboarding/OnboardingReady';

type WizardStep = 'loading' | 'welcome' | 'company' | 'profile' | 'team' | 'client' | 'docs' | 'ai-setup' | 'ready' | 'pending';

interface DomainCompany {
  id: string;
  name: string;
  logo_url: string | null;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, profile, company, companyRole, signOut, refreshUserData } = useAuth();

  const [step, setStep] = useState<WizardStep>('loading');
  const [loading, setLoading] = useState(false);
  const [autoCheckDone, setAutoCheckDone] = useState(false);

  // Domain detection state
  const [isPersonalEmail, setIsPersonalEmail] = useState(true);
  const [emailDomain, setEmailDomain] = useState('');
  const [domainCompanies, setDomainCompanies] = useState<DomainCompany[]>([]);
  const [suggestedCompanyName, setSuggestedCompanyName] = useState('');
  const [invitationCompanyName, setInvitationCompanyName] = useState('');

  // Profile fields
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  // Pending info
  const [pendingCompanyName, setPendingCompanyName] = useState('');

  // Docs upload state
  const [uploadedSourceIds, setUploadedSourceIds] = useState<string[]>([]);

  // If user already has an active company role, redirect
  useEffect(() => {
    if (companyRole && profile?.onboarding_completed) {
      navigate('/', { replace: true });
    }
  }, [companyRole, profile, navigate]);

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
  const wizardSteps: WizardStep[] = ['welcome', 'company', 'profile', 'team', 'client', 'docs', 'ai-setup', 'ready'];
  const currentIndex = wizardSteps.indexOf(step);
  const progressPercent = step === 'loading' ? 0 : step === 'pending' ? 25
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
  const skipToReady = () => setStep('ready');

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

  const handlePending = (companyName: string) => {
    setPendingCompanyName(companyName);
    setStep('pending');
  };

  const handleDocsComplete = (sourceIds: string[]) => {
    setUploadedSourceIds(sourceIds);
    goNext();
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
              {step === 'welcome' && (
                <OnboardingWelcome
                  profile={profile}
                  onNext={goNext}
                  onSignOut={signOut}
                />
              )}

              {step === 'company' && (
                <OnboardingCompany
                  userId={user!.id}
                  isPersonalEmail={isPersonalEmail}
                  emailDomain={emailDomain}
                  domainCompanies={domainCompanies}
                  suggestedCompanyName={suggestedCompanyName}
                  onNext={goNext}
                  onBack={goBack}
                  onSkip={goNext}
                  onPending={handlePending}
                  refreshUserData={refreshUserData}
                />
              )}

              {step === 'profile' && (
                <OnboardingProfile
                  userId={user!.id}
                  invitationCompanyName={invitationCompanyName || undefined}
                  onNext={goNext}
                  onBack={goBack}
                  onSkip={goNext}
                  phone={phone}
                  setPhone={setPhone}
                  jobTitle={jobTitle}
                  setJobTitle={setJobTitle}
                />
              )}

              {step === 'team' && (
                <OnboardingTeamInvite
                  userId={user!.id}
                  companyId={company?.id}
                  onNext={goNext}
                  onBack={goBack}
                  onSkip={goNext}
                />
              )}

              {step === 'client' && (
                <OnboardingFirstClient
                  companyId={company?.id}
                  onNext={goNext}
                  onBack={goBack}
                  onSkip={goNext}
                />
              )}

              {step === 'docs' && (
                <OnboardingCompanyDocs
                  userId={user!.id}
                  companyId={company?.id}
                  onNext={handleDocsComplete}
                  onBack={goBack}
                  onSkip={() => { setUploadedSourceIds([]); goNext(); }}
                />
              )}

              {step === 'ai-setup' && (
                <OnboardingAISetup
                  companyId={company?.id}
                  sourceIds={uploadedSourceIds}
                  onNext={goNext}
                  onSkip={goNext}
                />
              )}

              {step === 'ready' && (
                <OnboardingReady
                  profile={profile}
                  jobTitle={jobTitle}
                  phone={phone}
                  loading={loading}
                  onFinish={handleFinish}
                  onBack={goBack}
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
