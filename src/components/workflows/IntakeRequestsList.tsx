import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { IntakeRequest, IntakeWorkflow } from '@/hooks/useIntakeWorkflows';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-500/15 text-blue-400',
  approved: 'bg-emerald-500/15 text-emerald-400',
  rejected: 'bg-red-500/15 text-red-400',
};

interface IntakeRequestsListProps {
  requests: IntakeRequest[];
  workflows: IntakeWorkflow[];
  onSelect?: (request: IntakeRequest) => void;
}

export function IntakeRequestsList({ requests, workflows, onSelect }: IntakeRequestsListProps) {
  const workflowMap = Object.fromEntries(workflows.map(w => [w.id, w.name]));

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No intake requests yet.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Workflow</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map(req => (
          <TableRow
            key={req.id}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onSelect?.(req)}
          >
            <TableCell className="font-medium">{req.title}</TableCell>
            <TableCell className="text-muted-foreground">{workflowMap[req.workflow_id] || '—'}</TableCell>
            <TableCell>
              <Badge variant="outline" className={statusColors[req.status] || ''}>
                {req.status}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">
              {format(new Date(req.created_at), 'dd MMM yyyy')}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
