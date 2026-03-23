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
    default: 'bg-card border-border/30',
    primary: 'bg-card border-primary/20',
    success: 'bg-card border-success/20',
    warning: 'bg-card border-warning/20',
    destructive: 'bg-card border-destructive/20',
  };

  const iconStyles = {
    default: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/8 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className={cn(
      "group relative rounded-[16px] border p-5 transition-all duration-300 ease-apple",
      "hover:shadow-sm hover:border-border hover:-translate-y-0.5",
      "animate-fade-in",
      variantStyles[variant]
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
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
              <span className="inline-flex items-center gap-0.5 tabular-nums">
                {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-muted-foreground font-normal">vs προηγούμενο</span>
            </div>
          )}
        </div>
        <div className={cn(
          "h-10 w-10 rounded-[10px] flex items-center justify-center flex-shrink-0",
          "transition-transform duration-300 ease-apple group-hover:scale-105",
          iconStyles[variant]
        )}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
