import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Brief {
  id: string;
  title: string;
  status: string;
  brief_type: string;
  created_at: string;
}

interface Props {
  briefs: Brief[];
  clientId: string;
}

export function ClientBriefsCard({ briefs, clientId }: Props) {
  const visible = briefs.slice(0, 3);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Briefs
          </CardTitle>
          <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
            <Link to={`/blueprints?new=true&client=${clientId}`}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New Brief
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Δεν υπάρχουν briefs</p>
        ) : (
          visible.map(b => (
            <div key={b.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-secondary/50">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{b.title}</p>
                <p className="text-xs text-muted-foreground capitalize">{b.brief_type}</p>
              </div>
              <Badge
                variant={b.status === 'approved' ? 'success' : 'outline'}
                className="text-xs capitalize"
              >
                {b.status}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
