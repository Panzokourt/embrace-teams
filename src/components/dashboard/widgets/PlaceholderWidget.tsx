import { type LucideIcon, BarChart3 } from 'lucide-react';

interface PlaceholderWidgetProps {
  title: string;
  icon?: LucideIcon;
  description?: string;
}

export default function PlaceholderWidget({ title, icon: Icon = BarChart3, description }: PlaceholderWidgetProps) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6 animate-fade-in shadow-soft h-full flex flex-col">
      <h3 className="text-base font-semibold flex items-center gap-2 mb-4 text-foreground">
        <span className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
          <Icon className="h-4 w-4 text-foreground" />
        </span>
        {title}
      </h3>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center py-6">
          <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
            <Icon className="h-5 w-5 text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground/60">{description || 'Σύντομα διαθέσιμο'}</p>
        </div>
      </div>
    </div>
  );
}
