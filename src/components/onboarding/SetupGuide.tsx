import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, Rocket, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export default function SetupGuide() {
  const navigate = useNavigate();
  const { refreshUserData } = useAuth();
  const { steps, completedCount, totalCount, percent, isComplete, loading, markComplete } = useOnboardingProgress();

  if (isComplete || loading) return null;

  const handleGoToStep = (route: string) => {
    navigate(route);
  };

  const handleContinueSetup = () => {
    const nextStep = steps.find(s => !s.completed);
    if (nextStep) navigate(nextStep.route);
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
            {completedCount}/{totalCount}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        <div className="p-4 border-b border-border/40">
          <h3 className="text-sm font-semibold text-foreground mb-1">Οδηγός Ρύθμισης</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Ολοκληρώστε τα βήματα για να αξιοποιήσετε πλήρως την εφαρμογή.
          </p>
          <Progress value={percent} className="h-2" />
          <p className="text-[10px] text-muted-foreground mt-1">{percent}% ολοκληρώθηκε</p>
        </div>

        <div className="p-2">
          {steps.map((step) => (
            <button
              key={step.key}
              onClick={!step.completed ? () => handleGoToStep(step.route) : undefined}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors",
                step.completed
                  ? "opacity-60"
                  : "hover:bg-muted/50 cursor-pointer"
              )}
            >
              {step.completed ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", step.completed && "line-through text-muted-foreground")}>
                  {step.label}
                </p>
                <p className="text-[11px] text-muted-foreground">{step.description}</p>
              </div>
              {!step.completed && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-border/40 flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={handleGoToOnboarding}>
            Συνέχεια Setup
          </Button>
          <Button size="sm" className="flex-1 text-xs" onClick={handleFinish}>
            Ολοκλήρωση ✓
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
