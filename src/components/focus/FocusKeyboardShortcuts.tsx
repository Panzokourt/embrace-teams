import { useEffect, useState } from 'react';
import { Keyboard, X } from 'lucide-react';

const SHORTCUTS: { keys: string[]; description: string }[] = [
  { keys: ['?'], description: 'Άνοιγμα/κλείσιμο shortcuts' },
  { keys: ['Space'], description: 'Play / Pause timer' },
  { keys: ['J'], description: 'Επόμενο task (Up Next)' },
  { keys: ['K'], description: 'Προηγούμενο task' },
  { keys: ['C'], description: 'Ολοκλήρωση τρέχοντος task' },
  { keys: ['S'], description: 'Skip στο επόμενο' },
  { keys: ['/'], description: 'Focus στο AI chat' },
  { keys: ['V'], description: 'Voice command (μέσω AI chat)' },
  { keys: ['Esc'], description: 'Έξοδος Focus Mode' },
];

interface Props {
  /** Called when user presses J (next) */
  onNext?: () => void;
  onPrev?: () => void;
  onTogglePlay?: () => void;
  onComplete?: () => void;
  onSkip?: () => void;
  onFocusChat?: () => void;
}

export default function FocusKeyboardShortcuts({
  onNext, onPrev, onTogglePlay, onComplete, onSkip, onFocusChat,
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const isEditable = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || el.isContentEditable;
    };

    const onKey = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const k = e.key.toLowerCase();
      if (e.key === '?') {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === ' ') {
        if (onTogglePlay) { e.preventDefault(); onTogglePlay(); }
        return;
      }
      if (k === 'j') { onNext?.(); return; }
      if (k === 'k') { onPrev?.(); return; }
      if (k === 'c') { onComplete?.(); return; }
      if (k === 's') { onSkip?.(); return; }
      if (k === '/') {
        if (onFocusChat) { e.preventDefault(); onFocusChat(); }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNext, onPrev, onTogglePlay, onComplete, onSkip, onFocusChat]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Keyboard shortcuts (?)"
        className="fixed bottom-6 right-6 z-[58] w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 backdrop-blur-xl border border-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors"
      >
        <Keyboard className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#161b25] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-lg font-semibold flex items-center gap-2">
                <Keyboard className="h-5 w-5 text-[#3b82f6]" />
                Keyboard Shortcuts
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {SHORTCUTS.map((s) => (
                <div key={s.description} className="flex items-center justify-between py-1.5">
                  <span className="text-white/70 text-sm">{s.description}</span>
                  <div className="flex items-center gap-1">
                    {s.keys.map((k) => (
                      <kbd
                        key={k}
                        className="min-w-[28px] text-center px-2 py-1 rounded-md bg-white/10 border border-white/10 text-white/80 text-xs font-mono"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
