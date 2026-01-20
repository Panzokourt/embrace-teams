import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    positive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
}: StatCardProps) {
  const variantStyles = {
    default: 'bg-card border-border/50',
    primary: 'bg-primary/[0.03] border-primary/10',
    success: 'bg-success/[0.03] border-success/10',
    warning: 'bg-warning/[0.03] border-warning/10',
    destructive: 'bg-destructive/[0.03] border-destructive/10',
  };

  const iconStyles = {
    default: 'bg-secondary/50 text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className={cn(
      "group relative rounded-2xl border p-5 transition-all duration-300 ease-apple",
      "hover:shadow-soft hover:border-border hover:-translate-y-0.5",
      "animate-fade-in",
      variantStyles[variant]
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
            {title}
          </p>
          <p className="text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              "flex items-center gap-1.5 text-xs font-medium pt-1",
              trend.positive ? "text-success" : "text-destructive"
            )}>
              <span className="inline-flex items-center gap-0.5">
                {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-muted-foreground font-normal">vs προηγούμενο</span>
            </div>
          )}
        </div>
        <div className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0",
          "transition-transform duration-300 ease-apple group-hover:scale-105",
          iconStyles[variant]
        )}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
