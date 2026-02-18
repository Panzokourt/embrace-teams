import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { LeaveBalance } from '@/hooks/useLeaveManagement';

interface LeaveBalanceCardProps {
  balances: LeaveBalance[];
}

export function LeaveBalanceCard({ balances }: LeaveBalanceCardProps) {
  if (balances.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Δεν υπάρχουν δεδομένα αδειών για φέτος
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {balances.map(b => {
        const total = b.entitled_days + b.carried_over;
        const remaining = total - b.used_days - b.pending_days;
        const pct = total > 0 ? ((b.used_days + b.pending_days) / total) * 100 : 0;

        return (
          <Card key={b.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: b.leave_type?.color || '#6B7280' }} />
                  <span className="font-medium text-sm">{b.leave_type?.name || 'Άδεια'}</span>
                </div>
                <span className="text-lg font-bold text-foreground">{remaining}</span>
              </div>
              <Progress value={Math.min(pct, 100)} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Χρήση: {b.used_days}{b.pending_days > 0 ? ` (+${b.pending_days} εκκρ.)` : ''}</span>
                <span>Σύνολο: {total}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
