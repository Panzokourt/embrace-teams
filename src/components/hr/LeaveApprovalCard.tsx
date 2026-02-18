import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { Check, X, Clock, Loader2 } from 'lucide-react';
import type { LeaveRequest } from '@/hooks/useLeaveManagement';

interface LeaveApprovalCardProps {
  requests: LeaveRequest[];
  leaveTypes: { id: string; name: string; color: string }[];
  onApprove: (id: string, notes?: string) => Promise<void>;
  onReject: (id: string, notes?: string) => Promise<void>;
}

export function LeaveApprovalCard({ requests, leaveTypes, onApprove, onReject }: LeaveApprovalCardProps) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  const getInitials = (name: string | null) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setProcessing(id);
    if (action === 'approve') await onApprove(id, notes[id]);
    else await onReject(id, notes[id]);
    setProcessing(null);
  };

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Clock className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-muted-foreground text-sm">Δεν υπάρχουν εκκρεμείς αιτήσεις</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-warning" />
          Εκκρεμείς Εγκρίσεις ({requests.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {requests.map(r => {
          const lt = leaveTypes.find(t => t.id === r.leave_type_id);
          return (
            <div key={r.id} className="p-4 rounded-xl border border-border/50 bg-secondary/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={r.user?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {getInitials(r.user?.full_name || null)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{r.user?.full_name || r.user?.email}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: lt?.color }} />
                      {lt?.name} • {r.days_count} ημέρ{r.days_count === 1 ? 'α' : 'ες'}
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {format(new Date(r.start_date), 'd MMM', { locale: el })}
                  {r.start_date !== r.end_date && ` - ${format(new Date(r.end_date), 'd MMM', { locale: el })}`}
                </Badge>
              </div>
              {r.reason && (
                <p className="text-sm text-muted-foreground">{r.reason}</p>
              )}
              <Textarea
                placeholder="Σχόλια (προαιρετικά)..."
                value={notes[r.id] || ''}
                onChange={e => setNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                rows={2}
                className="text-sm"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10"
                  disabled={processing === r.id}
                  onClick={() => handleAction(r.id, 'reject')}
                >
                  {processing === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-1" />}
                  Απόρριψη
                </Button>
                <Button
                  size="sm"
                  disabled={processing === r.id}
                  onClick={() => handleAction(r.id, 'approve')}
                >
                  {processing === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                  Έγκριση
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
