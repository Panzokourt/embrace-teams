import { type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FloatingDockPanelProps {
  title: string;
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export default function FloatingDockPanel({ title, icon, onClose, children, className }: FloatingDockPanelProps) {
  return (
    <div
      className={cn(
        'fixed bottom-20 left-1/2 -translate-x-1/2 z-40',
        'w-[min(92vw,420px)] h-[min(75vh,560px)]',
        'rounded-2xl border border-border/50 shadow-2xl',
        'bg-card/95 backdrop-blur-xl',
        'flex flex-col overflow-hidden',
        'animate-scale-in origin-bottom',
        className
      )}
      style={{ animationDuration: '180ms' }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          {icon}
          <span>{title}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
