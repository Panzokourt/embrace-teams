import { Lightbulb, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface Props {
  title: string;
  body?: string;
  cta?: { label: string; href?: string };
  onDismiss: () => void;
}

/**
 * CoachPopover — floating non-modal popover at bottom-right.
 * Used for type='popover' or 'banner' coaching entries (banner has same UX,
 * but lives near the page header — we keep one component for consistency).
 */
export default function CoachPopover({ title, body, cta, onDismiss }: Props) {
  const navigate = useNavigate();

  const handleCta = () => {
    if (cta?.href) navigate(cta.href);
    onDismiss();
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[60] w-[360px] rounded-2xl border border-primary/30 bg-background shadow-xl animate-in slide-in-from-bottom-4 fade-in duration-300"
    >
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Lightbulb className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {body && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{body}</p>}
          </div>
          <button
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors -mt-1 -mr-1"
            aria-label="Κλείσιμο"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 mt-4">
          {cta && (
            <Button size="sm" onClick={handleCta} className="text-xs">
              {cta.label}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onDismiss} className="text-xs text-muted-foreground">
            Κατάλαβα
          </Button>
        </div>
      </div>
    </div>
  );
}
