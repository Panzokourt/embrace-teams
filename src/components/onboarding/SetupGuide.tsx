import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, Rocket, ChevronRight, Sparkles, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { useAuth } from '@/contexts/AuthContext';
import { useCoaching } from '@/components/coaching/CoachingProvider';
import { COACHING_REGISTRY } from '@/lib/coaching/registry';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * Map of onboarding step keys → coaching feature keys to launch as a tour.
 * Keeps things role-aware: e.g. team invite step maps to HR page tour.
 */
const STEP_TO_COACH: Record<string, string> = {
  company: 'page.settings',
  profile: 'page.settings',
  team: 'page.hr',
  client: 'page.clients',
  docs: 'page.knowledge',
  ai: 'page.knowledge',
};

/**
 * AI hints — short, concrete reasons each step matters for the user.
 * Static for now; future: per-user AI generated from coach-ai-suggest.
 */
const STEP_HINTS: Record<string, string> = {
  company: 'Τα στοιχεία της εταιρείας οδηγούν τον AI σε ακριβέστερες απαντήσεις και templates.',
  profile: 'Πλήρες προφίλ → καλύτερες αυτόματες αναθέσεις και mentions.',
  team: 'Με ομάδα ξεκλειδώνεις chat, εγκρίσεις και ορατότητα φόρτου.',
  client: 'Ο πρώτος πελάτης ενεργοποιεί projects, τιμολόγηση και reports.',
  docs: 'Τα έγγραφα τροφοδοτούν τη Wiki και κάνουν τον AI να μάθει την εταιρεία σου.',
  ai: 'Με AI εκπαίδευση μπορείς να ρωτάς τον βοηθό για SOPs, πελάτες και διαδικασίες.',
};

export default function SetupGuide() {
  const navigate = useNavigate();
  const { refreshUserData, companyRole } = useAuth();
  const { steps, completedCount, totalCount, percent, isComplete, loading, markComplete } = useOnboardingProgress();
  const { trigger, restartAll } = useCoaching();

  if (isComplete || loading) return null;

  // Role-aware filtering: members shouldn't see "Πρόσκληση μελών" prompts
  const role = companyRole?.role;
  const visibleSteps = steps.filter((s) => {
    if (s.key === 'team' && role && !['owner', 'admin', 'manager'].includes(role)) return false;
    return true;
  });

  const visibleCompleted = visibleSteps.filter((s) => s.completed).length;
  const visiblePercent = visibleSteps.length > 0 ? Math.round((visibleCompleted / visibleSteps.length) * 100) : 0;

  const handleGoToStep = (route: string) => navigate(route);

  const handleShowMe = (stepKey: string) => {
    const coachKey = STEP_TO_COACH[stepKey];
    if (coachKey) {
      trigger(coachKey);
    } else {
      toast.info('Δεν υπάρχει tour για αυτό το βήμα ακόμη.');
    }
  };

  const handleContinueSetup = () => {
    const nextStep = visibleSteps.find((s) => !s.completed);
    if (nextStep) navigate(nextStep.route);
  };

  const handleRestartTours = async () => {
    await restartAll();
    toast.success('Τα tutorials θα εμφανιστούν ξανά καθώς πλοηγείσαι.');
  };

  const handleFinish = async () => {
    await markComplete();
    await refreshUserData();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 transition-colors text-primary text-xs font-medium shrink-0">
          <Rocket className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden md:inline">Setup</span>
          <span className="font-mono text-[10px] bg-primary/20 rounded px-1 py-0.5">
            {visibleCompleted}/{visibleSteps.length}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="end" sideOffset={8}>
        <div className="p-4 border-b border-border/40">
          <h3 className="text-sm font-semibold text-foreground mb-1">Οδηγός Ρύθμισης</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Ολοκληρώστε τα βήματα και ζητήστε από τον AI Coach να σας δείξει κάθε feature.
          </p>
          <Progress value={visiblePercent} className="h-2" />
          <p className="text-[10px] text-muted-foreground mt-1">{visiblePercent}% ολοκληρώθηκε</p>
        </div>

        <div className="p-2 max-h-[360px] overflow-y-auto">
          {visibleSteps.map((step) => {
            const hint = STEP_HINTS[step.key];
            const hasTour = !!STEP_TO_COACH[step.key];
            return (
              <div
                key={step.key}
                className={cn(
                  'group flex items-start gap-3 px-3 py-2.5 rounded-md transition-colors',
                  step.completed ? 'opacity-60' : 'hover:bg-muted/50'
                )}
              >
                {step.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <button
                    onClick={!step.completed ? () => handleGoToStep(step.route) : undefined}
                    disabled={step.completed}
                    className="block w-full text-left"
                  >
                    <p className={cn('text-sm font-medium', step.completed && 'line-through text-muted-foreground')}>
                      {step.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{step.description}</p>
                  </button>
                  {!step.completed && hint && (
                    <p className="text-[10px] text-primary/80 mt-1 flex items-start gap-1">
                      <Sparkles className="h-2.5 w-2.5 shrink-0 mt-0.5" />
                      <span>{hint}</span>
                    </p>
                  )}
                  {!step.completed && hasTour && (
                    <button
                      onClick={() => handleShowMe(step.key)}
                      className="text-[10px] text-primary hover:underline mt-1"
                    >
                      ✨ Δείξε μου
                    </button>
                  )}
                </div>
                {!step.completed && (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
                )}
              </div>
            );
          })}
        </div>

        <div className="p-3 border-t border-border/40 space-y-2">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={handleContinueSetup}>
              Συνέχεια Setup
            </Button>
            <Button size="sm" className="flex-1 text-xs" onClick={handleFinish}>
              Ολοκλήρωση ✓
            </Button>
          </div>
          <button
            onClick={handleRestartTours}
            className="w-full flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            <RotateCcw className="h-3 w-3" />
            Επανέλαβε όλα τα intro tours
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
