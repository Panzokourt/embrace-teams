import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, X, Clock } from 'lucide-react';
import type { GovReviewTask } from '@/hooks/useGovernance';

interface Props {
  tasks: GovReviewTask[];
  onComplete: (taskId: string) => void;
  onSkip: (taskId: string) => void;
}

export function AccessReviewQueue({ tasks, onComplete, onSkip }: Props) {
  const pending = tasks.filter(t => t.status === 'pending');

  if (!pending.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Δεν υπάρχουν εκκρεμή reviews.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Asset</TableHead>
          <TableHead>Τύπος</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ενέργειες</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pending.map(t => {
          const overdue = new Date(t.due_date) < new Date();
          return (
            <TableRow key={t.id}>
              <TableCell className="font-medium">{(t.asset as any)?.asset_name || '—'}</TableCell>
              <TableCell>{(t.asset as any)?.asset_type || '—'}</TableCell>
              <TableCell>
                <span className={overdue ? 'text-destructive font-semibold' : ''}>
                  {format(new Date(t.due_date), 'dd/MM/yyyy')}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={overdue ? 'destructive' : 'outline'}>
                  {overdue ? 'Overdue' : 'Pending'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex gap-1 justify-end">
                  <Button size="sm" variant="outline" onClick={() => onComplete(t.id)}>
                    <Check className="h-3 w-3 mr-1" /> Complete
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onSkip(t.id)}>
                    <X className="h-3 w-3 mr-1" /> Skip
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
