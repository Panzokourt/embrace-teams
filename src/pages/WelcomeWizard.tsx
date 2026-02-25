import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, PartyPopper, User, Settings, Rocket, ChevronRight, ChevronLeft, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import olsenyLogo from '@/assets/olseny-logo.png';

type WizardStep = 'welcome' | 'profile' | 'preferences' | 'ready';

export default function WelcomeWizard() {
  const navigate = useNavigate();
  const { user, profile, company, refreshUserData } = useAuth();
  const { theme, setTheme } = useTheme();
  const [step, setStep] = useState<WizardStep>('welcome');
  const [loading, setLoading] = useState(false);

  // Profile fields
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  const steps: WizardStep[] = ['welcome', 'profile', 'preferences', 'ready'];
  const currentIndex = steps.indexOf(step);

  const goNext = () => {
    if (currentIndex < steps.length - 1) setStep(steps[currentIndex + 1]);
  };
  const goBack = () => {
    if (currentIndex > 0) setStep(steps[currentIndex - 1]);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      // Save profile data
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

  const progressPercent = ((currentIndex + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <img src={olsenyLogo} alt="Olseny" className="h-10 w-10 rounded-lg" />
          <span className="text-2xl font-bold text-foreground">OLSENY</span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-muted rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <Card className="border-border/40">
          <CardContent className="py-10 px-8">
            {/* Step: Welcome */}
            {step === 'welcome' && (
              <div className="text-center space-y-6">
                <PartyPopper className="h-16 w-16 text-primary mx-auto" />
                <h1 className="text-2xl font-bold text-foreground">
                  Καλωσήρθατε στο {company?.name || 'workspace'}!
                </h1>
                <p className="text-muted-foreground">
                  Ας ρυθμίσουμε μαζί τον λογαριασμό σας σε λίγα βήματα.
                </p>
                {company?.logo_url && (
                  <img src={company.logo_url} alt={company.name} className="h-16 mx-auto rounded-xl" />
                )}
                <Button onClick={goNext} className="w-full">
                  Ας ξεκινήσουμε <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Step: Profile */}
            {step === 'profile' && (
              <div className="space-y-6">
                <div className="text-center mb-4">
                  <User className="h-10 w-10 text-primary mx-auto mb-2" />
                  <h2 className="text-xl font-semibold text-foreground">Το προφίλ σας</h2>
                  <p className="text-sm text-muted-foreground">Προαιρετικά στοιχεία</p>
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
                  <Button variant="outline" onClick={goBack} className="flex-1">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Πίσω
                  </Button>
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
                  <p className="text-muted-foreground"><strong className="text-foreground">Εταιρεία:</strong> {company?.name}</p>
                  <p className="text-muted-foreground"><strong className="text-foreground">Email:</strong> {profile?.email}</p>
                  {jobTitle && <p className="text-muted-foreground"><strong className="text-foreground">Θέση:</strong> {jobTitle}</p>}
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
      </div>
    </div>
  );
}
