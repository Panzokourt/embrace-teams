import { useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Send, X } from "lucide-react";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import { cn } from "@/lib/utils";

interface VoiceCommandPopupProps {
  open: boolean;
  onClose: () => void;
  onSend: (text: string) => void;
}

export default function VoiceCommandPopup({ open, onClose, onSend }: VoiceCommandPopupProps) {
  const { isListening, fullTranscript, error, isSupported, start, stop, abort } = useVoiceRecognition();

  // Auto-start listening when popup opens
  useEffect(() => {
    if (open && isSupported && !isListening) {
      const timer = setTimeout(() => start(), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleClose = () => {
    abort();
    onClose();
  };

  const handleSend = () => {
    stop();
    // Small delay to capture final results
    setTimeout(() => {
      if (fullTranscript.trim()) {
        onSend(fullTranscript.trim());
      }
    }, 200);
  };

  const toggleListening = () => {
    if (isListening) stop();
    else start();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm gap-6">
        <DialogTitle className="sr-only">Φωνητική εντολή</DialogTitle>
        
        {!isSupported ? (
          <div className="text-center py-6 space-y-3">
            <MicOff className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Ο browser σου δεν υποστηρίζει αναγνώριση φωνής. Δοκίμασε Chrome ή Edge.
            </p>
            <Button variant="outline" onClick={handleClose}>Κλείσιμο</Button>
          </div>
        ) : (
          <>
            {/* Mic button with pulse */}
            <div className="flex flex-col items-center gap-4 pt-2">
              <button
                onClick={toggleListening}
                className={cn(
                  "relative h-20 w-20 rounded-full flex items-center justify-center transition-all duration-300",
                  isListening
                    ? "bg-destructive/10 text-destructive"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                )}
              >
                {isListening && (
                  <>
                    <span className="absolute inset-0 rounded-full bg-destructive/20 animate-ping" />
                    <span className="absolute inset-[-8px] rounded-full border-2 border-destructive/30 animate-pulse" />
                  </>
                )}
                <Mic className="h-8 w-8 relative z-10" />
              </button>
              <p className="text-xs text-muted-foreground">
                {isListening ? "Μιλήστε τώρα..." : "Πατήστε για ηχογράφηση"}
              </p>
            </div>

            {/* Transcript preview */}
            <div className="min-h-[60px] max-h-32 overflow-y-auto rounded-xl bg-muted/50 px-4 py-3">
              {fullTranscript ? (
                <p className="text-sm text-foreground whitespace-pre-wrap">{fullTranscript}</p>
              ) : (
                <p className="text-sm text-muted-foreground/50 italic">
                  {isListening ? "Ακούω..." : "Το κείμενο θα εμφανιστεί εδώ"}
                </p>
              )}
            </div>

            {error && (
              <p className="text-xs text-destructive text-center">{error}</p>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                <X className="h-4 w-4 mr-1.5" />
                Ακύρωση
              </Button>
              <Button
                className="flex-1"
                disabled={!fullTranscript.trim()}
                onClick={handleSend}
              >
                <Send className="h-4 w-4 mr-1.5" />
                Αποστολή
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground/50 text-center">
              Συντόμευση: Cmd+Shift+V
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
