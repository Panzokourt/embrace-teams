import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { differenceInBusinessDays, parseISO } from 'date-fns';
import type { LeaveType } from '@/hooks/useLeaveManagement';

interface LeaveRequestFormProps {
  leaveTypes: LeaveType[];
  onSubmit: (data: {
    leave_type_id: string;
    start_date: string;
    end_date: string;
    days_count: number;
    half_day: boolean;
    reason?: string;
  }) => Promise<void>;
}

export function LeaveRequestForm({ leaveTypes, onSubmit }: LeaveRequestFormProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [halfDay, setHalfDay] = useState(false);
  const [reason, setReason] = useState('');

  const daysCount = startDate && endDate
    ? halfDay ? 0.5 : Math.max(1, differenceInBusinessDays(parseISO(endDate), parseISO(startDate)) + 1)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveTypeId || !startDate || !endDate) return;
    setSaving(true);
    await onSubmit({
      leave_type_id: leaveTypeId,
      start_date: startDate,
      end_date: endDate,
      days_count: daysCount,
      half_day: halfDay,
      reason: reason || undefined,
    });
    setSaving(false);
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setLeaveTypeId('');
    setStartDate('');
    setEndDate('');
    setHalfDay(false);
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Νέα Αίτηση
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Αίτηση Άδειας</DialogTitle>
          <DialogDescription>Υποβάλετε αίτηση για άδεια ή απουσία</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Τύπος Άδειας *</Label>
            <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
              <SelectTrigger><SelectValue placeholder="Επιλέξτε τύπο" /></SelectTrigger>
              <SelectContent>
                {leaveTypes.map(lt => (
                  <SelectItem key={lt.id} value={lt.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: lt.color }} />
                      {lt.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Από *</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Έως *</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} required />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="halfDay" checked={halfDay} onCheckedChange={(c) => setHalfDay(!!c)} />
            <Label htmlFor="halfDay" className="text-sm">Μισή ημέρα</Label>
          </div>

          {daysCount > 0 && (
            <div className="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">
              Σύνολο: <span className="font-semibold text-foreground">{daysCount}</span> εργάσιμ{daysCount === 1 ? 'η' : 'ες'} ημέρ{daysCount === 1 ? 'α' : 'ες'}
            </div>
          )}

          <div className="space-y-2">
            <Label>Αιτιολογία</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Προαιρετική αιτιολογία..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Ακύρωση</Button>
            <Button type="submit" disabled={saving || !leaveTypeId || !startDate || !endDate}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Υποβολή
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
