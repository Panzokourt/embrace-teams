import { AlertTriangle, CheckCircle2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertItem {
  label: string;
  count: number;
  variant: 'destructive' | 'warning' | 'success';
}

interface AlertWidgetProps {
  title: string;
  icon?: LucideIcon;
  items: AlertItem[];
  emptyMessage?: string;
}

export default function AlertWidget({ title, icon: Icon = AlertTriangle, items, emptyMessage = 'Δεν υπάρχουν ειδοποιήσεις' }: AlertWidgetProps) {
  const hasAlerts = items.some(i => i.count > 0);

  return (
    <div className={cn(
      "rounded-2xl border p-6 animate-fade-in shadow-soft h-full",
      hasAlerts ? "border-destructive/10 bg-destructive/[0.02]" : "border-border/50 bg-card"
    )}>
      <h3 className="text-base font-semibold flex items-center gap-2 mb-4 text-foreground">
        <span className={cn(
          "h-8 w-8 rounded-lg flex items-center justify-center",
          hasAlerts ? "bg-destructive/10" : "bg-muted"
        )}>
          <Icon className={cn("h-4 w-4", hasAlerts ? "text-destructive" : "text-foreground")} />
        </span>
        {title}
      </h3>
      <div className="space-y-2">
        {!hasAlerts ? (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-success/[0.03] border border-success/10">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-sm text-success">{emptyMessage}</span>
          </div>
        ) : (
          items.filter(i => i.count > 0).map(item => (
            <div key={item.label} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-background/60 border border-destructive/10">
              <div className="flex items-center gap-3">
                <AlertTriangle className={cn("h-4 w-4", item.variant === 'destructive' ? 'text-destructive' : 'text-warning')} />
                <span className="text-sm text-foreground/80">{item.label}</span>
              </div>
              <span className="text-sm font-semibold text-foreground">{item.count}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
