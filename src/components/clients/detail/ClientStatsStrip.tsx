import { cn } from '@/lib/utils';
import {
  TrendingUp, DollarSign, Percent, Receipt, Wallet, AlertCircle,
  AlertTriangle, CalendarClock, CircleDot, LucideIcon,
} from 'lucide-react';

type Variant = 'default' | 'primary' | 'success' | 'warning' | 'destructive';

const iconStyles: Record<Variant, string> = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
};

interface StatProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  variant?: Variant;
}

function Stat({ icon: Icon, value, label, variant = 'default' }: StatProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-3 transition-all hover:shadow-soft hover:-translate-y-0.5">
      <div className="flex items-center gap-2.5">
        <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0', iconStyles[variant])}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-base font-bold tracking-tight text-foreground leading-tight truncate">{value}</p>
          <p className="text-[10px] text-muted-foreground leading-tight truncate">{label}</p>
        </div>
      </div>
    </div>
  );
}

interface Props {
  revenueThisYear: number;
  monthlyRevenue: number;
  marginPercent: number;
  invoiced: number;
  collected: number;
  outstanding: number;
  overdueTasks: number;
  dueThisWeek: number;
  openTasks: number;
}

const fmt = (n: number) => `€${Math.round(n).toLocaleString('el-GR')}`;

export function ClientStatsStrip(p: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-9 gap-3">
      <Stat icon={TrendingUp} value={fmt(p.revenueThisYear)} label="Έσοδα Έτους" variant="primary" />
      <Stat icon={DollarSign} value={fmt(p.monthlyRevenue)} label="Μηνιαία" variant="primary" />
      <Stat icon={Percent} value={`${p.marginPercent}%`} label="Margin" variant={p.marginPercent >= 0 ? 'success' : 'destructive'} />
      <Stat icon={Receipt} value={fmt(p.invoiced)} label="Τιμολογημένα" />
      <Stat icon={Wallet} value={fmt(p.collected)} label="Εισπραγμένα" variant="success" />
      <Stat icon={AlertCircle} value={fmt(p.outstanding)} label="Ανεξόφλητα" variant={p.outstanding > 0 ? 'warning' : 'default'} />
      <Stat icon={AlertTriangle} value={p.overdueTasks} label="Overdue Tasks" variant={p.overdueTasks > 0 ? 'destructive' : 'default'} />
      <Stat icon={CalendarClock} value={p.dueThisWeek} label="This Week" variant={p.dueThisWeek > 0 ? 'warning' : 'default'} />
      <Stat icon={CircleDot} value={p.openTasks} label="Open Tasks" />
    </div>
  );
}
