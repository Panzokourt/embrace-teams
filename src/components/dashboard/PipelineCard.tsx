import { cn } from '@/lib/utils';
import { Search, Edit3, Send, Clock, Trophy, X } from 'lucide-react';

interface TenderItem {
  id: string;
  name: string;
  client: string;
  budget: number;
}

interface PipelineStage {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  items: TenderItem[];
}

interface PipelineCardProps {
  stages: PipelineStage[];
}

export default function PipelineCard({ stages }: PipelineCardProps) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6 animate-fade-in shadow-soft">
      <h3 className="text-base font-semibold mb-5 flex items-center gap-2 text-foreground">
        <span className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          ⚡
        </span>
        Pipeline Διαγωνισμών
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stages.map((stage, index) => (
          <div
            key={stage.id}
            className={cn(
              "rounded-xl p-3 border transition-all duration-300 ease-apple",
              "hover:shadow-soft hover:-translate-y-0.5",
              stage.color
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="opacity-60">{stage.icon}</span>
              <span className="text-xs font-medium text-foreground/80 truncate">
                {stage.name}
              </span>
              <span className="ml-auto text-lg font-semibold text-foreground">
                {stage.items.length}
              </span>
            </div>
            
            <div className="space-y-2 max-h-28 overflow-y-auto scrollbar-thin">
              {stage.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-background/60 backdrop-blur-sm rounded-lg p-2.5 text-xs 
                             border border-border/30 transition-all duration-200 
                             hover:bg-background hover:border-border/50 cursor-pointer"
                >
                  <p className="font-medium truncate text-foreground/90">{item.name}</p>
                  <p className="text-muted-foreground truncate text-[11px] mt-0.5">{item.client}</p>
                  <p className="text-primary font-semibold mt-1">€{item.budget.toLocaleString()}</p>
                </div>
              ))}
              {stage.items.length === 0 && (
                <p className="text-[11px] text-muted-foreground/50 text-center py-2">
                  Κενό
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function getDefaultPipelineStages(): PipelineStage[] {
  return [
    {
      id: 'identification',
      name: 'Εντοπισμός',
      icon: <Search className="h-4 w-4" />,
      color: 'bg-secondary/30 border-border/30',
      items: [],
    },
    {
      id: 'preparation',
      name: 'Προετοιμασία',
      icon: <Edit3 className="h-4 w-4" />,
      color: 'bg-primary/[0.06] border-primary/15',
      items: [],
    },
    {
      id: 'submitted',
      name: 'Υποβλήθηκε',
      icon: <Send className="h-4 w-4" />,
      color: 'bg-accent/[0.06] border-accent/15',
      items: [],
    },
    {
      id: 'evaluation',
      name: 'Αξιολόγηση',
      icon: <Clock className="h-4 w-4" />,
      color: 'bg-warning/[0.06] border-warning/15',
      items: [],
    },
    {
      id: 'won',
      name: 'Κερδήθηκε',
      icon: <Trophy className="h-4 w-4" />,
      color: 'bg-success/[0.06] border-success/15',
      items: [],
    },
    {
      id: 'lost',
      name: 'Απορρίφθηκε',
      icon: <X className="h-4 w-4" />,
      color: 'bg-destructive/[0.06] border-destructive/15',
      items: [],
    },
  ];
}
