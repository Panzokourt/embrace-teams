import { TrendingUp, FolderKanban, CheckSquare, AlertCircle, Target, DollarSign } from 'lucide-react';

interface MissionCardData {
  id: string;
  label: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  health: 'green' | 'amber' | 'red' | 'neutral';
}

interface CCMissionCardsProps {
  pipelineValue: number;
  activeProjects: number;
  myTasks: number;
  overdueTasks: number;
  winRate: number;
  pendingInvoices: number;
  showFinancials: boolean;
}

const healthGlow: Record<string, string> = {
  green: 'border-success/40 shadow-[0_0_12px_hsl(var(--success)/0.15)]',
  amber: 'border-warning/40 shadow-[0_0_12px_hsl(var(--warning)/0.15)]',
  red: 'border-destructive/40 shadow-[0_0_12px_hsl(var(--destructive)/0.15)]',
  neutral: 'border-border/30',
};

const healthIcon: Record<string, string> = {
  green: 'text-success',
  amber: 'text-warning',
  red: 'text-destructive',
  neutral: 'text-muted-foreground',
};

export default function CCMissionCards({
  pipelineValue, activeProjects, myTasks, overdueTasks, winRate, pendingInvoices, showFinancials,
}: CCMissionCardsProps) {
  const cards: MissionCardData[] = [];

  if (showFinancials) {
    cards.push({
      id: 'pipeline',
      label: 'Pipeline',
      value: `€${pipelineValue.toLocaleString('el-GR')}`,
      subtitle: 'αξία pipeline',
      icon: TrendingUp,
      health: pipelineValue > 0 ? 'green' : 'neutral',
    });
  }

  cards.push({
    id: 'projects',
    label: 'Ενεργά Έργα',
    value: activeProjects.toString(),
    subtitle: 'projects',
    icon: FolderKanban,
    health: activeProjects > 0 ? 'green' : 'neutral',
  });

  cards.push({
    id: 'tasks',
    label: 'Τα Tasks μου',
    value: myTasks.toString(),
    subtitle: 'εκκρεμή',
    icon: CheckSquare,
    health: myTasks > 10 ? 'amber' : 'green',
  });

  cards.push({
    id: 'overdue',
    label: 'Εκπρόθεσμα',
    value: overdueTasks.toString(),
    subtitle: 'overdue',
    icon: AlertCircle,
    health: overdueTasks > 0 ? 'red' : 'green',
  });

  if (showFinancials) {
    cards.push({
      id: 'winrate',
      label: 'Win Rate',
      value: `${winRate}%`,
      subtitle: 'ποσοστό',
      icon: Target,
      health: winRate >= 60 ? 'green' : winRate >= 30 ? 'amber' : 'red',
    });
  }

  return (
    <div className="flex gap-3 overflow-x-auto" style={{ minWidth: 0 }}>
      {cards.map((card) => (
        <div
          key={card.id}
          className={`group relative rounded-2xl border bg-card p-4 transition-all duration-300
            hover:scale-[1.02] hover:shadow-md ${healthGlow[card.health]}`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                {card.label}
              </p>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.subtitle}</p>
            </div>
            <card.icon className={`h-6 w-6 ${healthIcon[card.health]} opacity-70 
              group-hover:opacity-100 transition-opacity`} />
          </div>

          {/* Health dot */}
          <div className={`absolute top-3 right-3 h-2 w-2 rounded-full
            ${card.health === 'green' ? 'bg-success' :
              card.health === 'amber' ? 'bg-warning' :
              card.health === 'red' ? 'bg-destructive animate-pulse' :
              'bg-muted-foreground/30'}`} />
        </div>
      ))}
    </div>
  );
}
