import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, ShoppingCart, Zap, Globe, AlertTriangle, Sparkles } from 'lucide-react';

const categories = [
  { id: 'all', label: 'Όλα', icon: Brain },
  { id: 'strategic', label: 'Στρατηγικά', icon: TrendingUp },
  { id: 'sales', label: 'Πωλήσεις', icon: ShoppingCart },
  { id: 'productivity', label: 'Παραγωγικότητα', icon: Zap },
  { id: 'market', label: 'Αγορά', icon: Globe },
  { id: 'alert', label: 'Alerts', icon: AlertTriangle },
  { id: 'neuro', label: 'Neuro', icon: Sparkles },
] as const;

interface BrainCategoryFilterProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  counts?: Record<string, number>;
}

export function BrainCategoryFilter({ activeCategory, onCategoryChange, counts }: BrainCategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => {
        const isActive = activeCategory === cat.id;
        const count = cat.id === 'all' ? undefined : counts?.[cat.id];
        return (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border",
              isActive
                ? "bg-primary/15 border-primary/30 text-foreground"
                : "bg-card border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <cat.icon className="h-3.5 w-3.5" />
            {cat.label}
            {count !== undefined && count > 0 && (
              <Badge variant="secondary" className="ml-0.5 px-1.5 py-0 text-[10px] min-w-[18px] h-4">
                {count}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
