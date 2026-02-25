import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ShieldAlert, ShieldCheck, Shield } from 'lucide-react';

export function RiskBadge({ level, score }: { level: string; score: number }) {
  const config = {
    high: { icon: ShieldAlert, className: 'bg-destructive/15 text-destructive border-destructive/30', label: 'Υψηλό' },
    medium: { icon: Shield, className: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30', label: 'Μέτριο' },
    low: { icon: ShieldCheck, className: 'bg-green-500/15 text-green-600 border-green-500/30', label: 'Χαμηλό' },
  }[level] || { icon: Shield, className: 'bg-muted text-muted-foreground', label: level };

  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn('gap-1 font-medium', config.className)}>
      <Icon className="h-3 w-3" />
      {config.label} ({score})
    </Badge>
  );
}
