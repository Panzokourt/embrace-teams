import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target } from 'lucide-react';

interface Strategy {
  goals?: string[];
  pillars?: string[];
  positioning?: string;
}

interface Props {
  strategy: Strategy;
}

export function ClientStrategyCard({ strategy }: Props) {
  const hasContent = (strategy.goals?.length || 0) > 0 || (strategy.pillars?.length || 0) > 0 || strategy.positioning;
  if (!hasContent) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" /> Strategy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {strategy.goals && strategy.goals.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Goals</p>
            <ul className="space-y-1.5">
              {strategy.goals.map((g, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 mt-1.5 shrink-0" />
                  {g}
                </li>
              ))}
            </ul>
          </div>
        )}
        {strategy.pillars && strategy.pillars.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Pillars</p>
            <div className="flex flex-wrap gap-1.5">
              {strategy.pillars.map((p, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{p}</Badge>
              ))}
            </div>
          </div>
        )}
        {strategy.positioning && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Positioning</p>
            <p className="text-sm text-muted-foreground">{strategy.positioning}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
