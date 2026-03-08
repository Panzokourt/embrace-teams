import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { X, Calendar } from 'lucide-react';
import type { LeaveRequest } from '@/hooks/useLeaveManagement';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';

const PAGE_SIZE = 15;

const statusLabels: Record<string, string> = {
  pending: 'Εκκρεμεί',
  approved: 'Εγκρίθηκε',
  rejected: 'Απορρίφθηκε',
  cancelled: 'Ακυρώθηκε',
};

const statusVariants: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  approved: 'bg-success/10 text-success border-success/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
  cancelled: 'bg-muted text-muted-foreground',
};

interface LeaveRequestsListProps {
  requests: LeaveRequest[];
  onCancel?: (id: string) => void;
  showUser?: boolean;
}

export function LeaveRequestsList({ requests, onCancel, showUser }: LeaveRequestsListProps) {
  const pagination = usePagination(PAGE_SIZE);

  if (pagination.totalCount !== requests.length) {
    pagination.setTotalCount(requests.length);
  }

  const pagedRequests = requests.slice(pagination.from, pagination.to + 1);

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">Δεν υπάρχουν αιτήσεις αδειών</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          Αιτήσεις Αδειών
          <span className="text-sm font-normal text-muted-foreground">({requests.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {showUser && <TableHead>Χρήστης</TableHead>}
              <TableHead>Τύπος</TableHead>
              <TableHead>Περίοδος</TableHead>
              <TableHead>Ημέρες</TableHead>
              <TableHead>Κατάσταση</TableHead>
              <TableHead>Αιτιολογία</TableHead>
              {onCancel && <TableHead className="w-12"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedRequests.map(r => (
              <TableRow key={r.id}>
                {showUser && (
                  <TableCell className="font-medium">
                    {r.user?.full_name || r.user?.email || '-'}
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.leave_type?.color || '#6B7280' }} />
                    <span className="text-sm">{r.leave_type?.name || '-'}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {format(new Date(r.start_date), 'd MMM', { locale: el })}
                  {r.start_date !== r.end_date && ` - ${format(new Date(r.end_date), 'd MMM', { locale: el })}`}
                </TableCell>
                <TableCell className="font-mono text-sm">{r.days_count}{r.half_day ? ' (½)' : ''}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusVariants[r.status]}>
                    {statusLabels[r.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                  {r.reason || '-'}
                </TableCell>
                {onCancel && (
                  <TableCell>
                    {r.status === 'pending' && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onCancel(r.id)}>
                        <X className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="px-4">
          <PaginationControls pagination={pagination} />
        </div>
      </CardContent>
    </Card>
  );
}
