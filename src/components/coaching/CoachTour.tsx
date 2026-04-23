import { useState } from 'react';
import { Sparkles, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CoachStep } from '@/lib/coaching/registry';

interface Props {
  title: string;
  body?: string;
  steps: CoachStep[];
  onDismiss: () => void;
  onComplete: () => void;
}

/**
 * CoachTour — multi-step modal-ish tour overlay.
 *
 * Lightweight implementation: a centered card that walks the user through
 * each step. Optional `selector` is currently used only for naming; full
 * spotlight/cutout overlay can be added later without changing the API.
 */
export default function CoachTour({ title, body, steps, onDismiss, onComplete }: Props) {
  const [index, setIndex] = useState(0);
  const total = steps.length + 1; // intro + steps
  const currentStep = index === 0 ? null : steps[index - 1];

  const next = () => {
    if (index < steps.length) setIndex(index + 1);
    else onComplete();
  };
  const back = () => setIndex(Math.max(0, index - 1));

  return (
    <div
      className="fixed inset-0 z-[60] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl bg-background shadow-2xl border border-border/40 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Tour · Βήμα {index + 1} / {total}
                </p>
                <h3 className="text-base font-semibold text-foreground mt-0.5">
                  {currentStep ? currentStep.title : title}
                </h3>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Κλείσιμο"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed min-h-[60px]">
            {currentStep ? currentStep.body : body}
          </p>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5 mt-5">
            {Array.from({ length: total }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-6 bg-primary' : i < index ? 'w-1.5 bg-primary/40' : 'w-1.5 bg-muted'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 mt-6">
            <Button
              size="sm"
              variant="ghost"
              onClick={back}
              disabled={index === 0}
              className="text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />Πίσω
            </Button>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={onDismiss} className="text-xs text-muted-foreground">
                Παράλειψη
              </Button>
              <Button size="sm" onClick={next} className="text-xs">
                {index < steps.length ? 'Επόμενο' : 'Τέλος'}
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
