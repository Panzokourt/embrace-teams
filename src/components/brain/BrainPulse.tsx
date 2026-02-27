import { cn } from '@/lib/utils';
import { Brain } from 'lucide-react';

interface BrainPulseProps {
  isAnalyzing: boolean;
  statusText?: string;
}

export function BrainPulse({ isAnalyzing, statusText }: BrainPulseProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-4">
      <div className="relative flex items-center justify-center">
        {/* Pulse rings */}
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "absolute rounded-full border border-primary/30",
              isAnalyzing ? "animate-ping" : "opacity-20"
            )}
            style={{
              width: `${60 + i * 40}px`,
              height: `${60 + i * 40}px`,
              animationDuration: `${1.5 + i * 0.5}s`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}

        {/* Glow background */}
        <div
          className={cn(
            "absolute w-24 h-24 rounded-full transition-all duration-700",
            isAnalyzing
              ? "bg-primary/20 shadow-[0_0_40px_10px_hsl(var(--primary)/0.25)]"
              : "bg-primary/5"
          )}
        />

        {/* Brain icon */}
        <div
          className={cn(
            "relative z-10 flex items-center justify-center w-16 h-16 rounded-full bg-card border-2 transition-all duration-500",
            isAnalyzing
              ? "border-primary shadow-[0_0_20px_4px_hsl(var(--primary)/0.3)] scale-110"
              : "border-border"
          )}
        >
          <Brain
            className={cn(
              "h-8 w-8 transition-colors duration-500",
              isAnalyzing ? "text-primary" : "text-muted-foreground"
            )}
          />
        </div>
      </div>

      {/* Status text */}
      {statusText && (
        <p className={cn(
          "text-sm font-medium transition-colors duration-300",
          isAnalyzing ? "text-foreground animate-pulse" : "text-muted-foreground"
        )}>
          {statusText}
        </p>
      )}
    </div>
  );
}
