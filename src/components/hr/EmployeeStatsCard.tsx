import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface EmployeeStatsCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
}

const variantStyles = {
  default: 'bg-card border-border/50',
  primary: 'bg-card border-primary/20',
  success: 'bg-card border-success/20',
  warning: 'bg-card border-warning/20',
  destructive: 'bg-card border-destructive/20',
};

const iconStyles = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
};

export function EmployeeStatsCard({ icon: Icon, value, label, variant = 'default' }: EmployeeStatsCardProps) {
  return (
    <div className={cn(
      'rounded-2xl border p-4 transition-all duration-200 hover:shadow-soft hover:-translate-y-0.5',
      variantStyles[variant]
    )}>
      <div className="flex items-center gap-3">
        <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0', iconStyles[variant])}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}
