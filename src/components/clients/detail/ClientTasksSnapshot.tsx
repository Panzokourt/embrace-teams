import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListTodo, AlertTriangle, CalendarClock, CircleDot } from 'lucide-react';

interface Props {
  overdue: number;
  dueThisWeek: number;
  open: number;
}

export function ClientTasksSnapshot({ overdue, dueThisWeek, open }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ListTodo className="h-4 w-4" /> Tasks Snapshot
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-xl bg-destructive/5">
            <AlertTriangle className="h-5 w-5 text-destructive mx-auto mb-1" />
            <p className="text-xl font-bold">{overdue}</p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-warning/5">
            <CalendarClock className="h-5 w-5 text-warning mx-auto mb-1" />
            <p className="text-xl font-bold">{dueThisWeek}</p>
            <p className="text-xs text-muted-foreground">This Week</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-secondary">
            <CircleDot className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
            <p className="text-xl font-bold">{open}</p>
            <p className="text-xs text-muted-foreground">Open</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
