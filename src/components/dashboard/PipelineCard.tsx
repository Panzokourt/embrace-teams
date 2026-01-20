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
    <div className="rounded-xl border border-border bg-card p-6 animate-fade-in">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="text-xl">⚡</span> Pipeline Διαγωνισμών
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className={cn(
              "rounded-lg p-3 border",
              stage.color
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              {stage.icon}
              <span className="text-sm font-medium">{stage.name}</span>
              <span className="ml-auto text-lg font-bold">{stage.items.length}</span>
            </div>
            
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {stage.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-background/50 rounded p-2 text-xs"
                >
                  <p className="font-medium truncate">{item.name}</p>
                  <p className="text-muted-foreground truncate">{item.client}</p>
                  <p className="text-primary font-medium">€{item.budget.toLocaleString()}</p>
                </div>
              ))}
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
      color: 'bg-muted/50 border-muted-foreground/20',
      items: [],
    },
    {
      id: 'preparation',
      name: 'Προετοιμασία',
      icon: <Edit3 className="h-4 w-4" />,
      color: 'bg-primary/10 border-primary/20',
      items: [],
    },
    {
      id: 'submitted',
      name: 'Υποβλήθηκε',
      icon: <Send className="h-4 w-4" />,
      color: 'bg-accent/10 border-accent/20',
      items: [],
    },
    {
      id: 'evaluation',
      name: 'Αξιολόγηση',
      icon: <Clock className="h-4 w-4" />,
      color: 'bg-warning/10 border-warning/20',
      items: [],
    },
    {
      id: 'won',
      name: 'Κερδήθηκε',
      icon: <Trophy className="h-4 w-4" />,
      color: 'bg-success/10 border-success/20',
      items: [],
    },
    {
      id: 'lost',
      name: 'Απορρίφθηκε',
      icon: <X className="h-4 w-4" />,
      color: 'bg-destructive/10 border-destructive/20',
      items: [],
    },
  ];
}
