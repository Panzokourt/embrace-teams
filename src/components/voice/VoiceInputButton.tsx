import { useEffect, useRef } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface VoiceInputButtonProps {
  /**
   * Called whenever the transcript changes.
   * `isFinal=false` for live interim updates, `isFinal=true` when the user stops talking.
   * Receives the FULL transcript so far (not deltas) — the consumer can simply set its input state.
   */
  onTranscript: (text: string, isFinal: boolean) => void;
  /** Optional: snapshot of the input value when listening starts, so we can append rather than overwrite. */
  baseText?: string;
  size?: "xs" | "sm" | "md";
  lang?: string;
  disabled?: boolean;
  className?: string;
}

const SIZE_MAP = {
  xs: "h-7 w-7",
  sm: "h-8 w-8",
  md: "h-9 w-9",
} as const;

const ICON_SIZE = {
  xs: "h-3.5 w-3.5",
  sm: "h-4 w-4",
  md: "h-4 w-4",
} as const;

export default function VoiceInputButton({
  onTranscript,
  baseText = "",
  size = "sm",
  lang = "el-GR",
  disabled,
  className,
}: VoiceInputButtonProps) {
  const { isListening, fullTranscript, error, isSupported, start, stop, abort } =
    useVoiceRecognition(lang);
  const baseRef = useRef(baseText);
  const lastEmittedRef = useRef<string>("");

  // Snapshot the base text when we start listening, so we append rather than overwrite.
  useEffect(() => {
    if (isListening) {
      baseRef.current = baseText;
      lastEmittedRef.current = "";
    }
  }, [isListening]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live interim updates → push to consumer
  useEffect(() => {
    if (!isListening) return;
    const merged = baseRef.current
      ? `${baseRef.current.trimEnd()} ${fullTranscript}`.trim()
      : fullTranscript;
    if (merged !== lastEmittedRef.current) {
      lastEmittedRef.current = merged;
      onTranscript(merged, false);
    }
  }, [fullTranscript, isListening, onTranscript]);

  // When listening ends (auto-stop on silence or user click), emit final
  useEffect(() => {
    if (!isListening && lastEmittedRef.current) {
      onTranscript(lastEmittedRef.current, true);
      lastEmittedRef.current = "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening]);

  // Show errors
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  // Esc to cancel
  useEffect(() => {
    if (!isListening) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        abort();
        // Restore base text
        onTranscript(baseRef.current, true);
        lastEmittedRef.current = "";
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isListening, abort, onTranscript]);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSupported) {
      toast.error("Ο browser δεν υποστηρίζει αναγνώριση φωνής. Δοκίμασε Chrome ή Edge.");
      return;
    }
    if (isListening) {
      stop();
    } else {
      start();
    }
  };

  const button = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled}
      onClick={toggle}
      className={cn(
        "shrink-0 relative transition-colors",
        SIZE_MAP[size],
        isListening && "text-destructive bg-destructive/10 hover:bg-destructive/20 hover:text-destructive",
        !isSupported && "opacity-50",
        className,
      )}
      aria-label={isListening ? "Διακοπή ηχογράφησης" : "Έναρξη ηχογράφησης"}
    >
      {isListening && (
        <span className="absolute inset-0 rounded-md bg-destructive/20 animate-ping pointer-events-none" />
      )}
      {isSupported ? (
        <Mic className={cn(ICON_SIZE[size], "relative z-10")} />
      ) : (
        <MicOff className={cn(ICON_SIZE[size], "relative z-10")} />
      )}
    </Button>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {!isSupported
            ? "Δεν υποστηρίζεται. Δοκίμασε Chrome/Edge."
            : isListening
              ? "Ακούω... (Esc για ακύρωση)"
              : "Φωνητική εισαγωγή"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
