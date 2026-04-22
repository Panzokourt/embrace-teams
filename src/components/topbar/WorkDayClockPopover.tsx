import { useState, useEffect, type ReactNode } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Clock, Save, Square, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TodayLog {
  id: string;
  clock_in: string;
  clock_out: string | null;
  scheduled_minutes: number;
}

interface WorkSchedule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working_day: boolean;
}

interface Props {
  children: ReactNode;
  todayLog: TodayLog | null;
  todaySchedule: WorkSchedule | undefined;
  elapsedSeconds: number;
  scheduledMinutes: number;
  isOvertime: boolean;
  isNearEnd: boolean;
  isClockedIn: boolean;
  clockOut: () => void | Promise<void>;
  refresh: () => void | Promise<void>;
}

const DAY_NAMES = ['Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο', 'Κυριακή'];

function formatHMS(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// Convert ISO string → "YYYY-MM-DDTHH:mm" in local TZ for datetime-local input
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function minutesToHHMM(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export default function WorkDayClockPopover({
  children, todayLog, todaySchedule, elapsedSeconds, scheduledMinutes,
  isOvertime, isNearEnd, isClockedIn, clockOut, refresh,
}: Props) {
  const [open, setOpen] = useState(false);
  const [clockInInput, setClockInInput] = useState('');
  const [targetHours, setTargetHours] = useState<string>('');
  const [scope, setScope] = useState<'today' | 'permanent'>('today');
  const [savingClockIn, setSavingClockIn] = useState(false);
  const [savingTarget, setSavingTarget] = useState(false);

  useEffect(() => {
    if (open && todayLog) {
      setClockInInput(isoToLocalInput(todayLog.clock_in));
      setTargetHours(((scheduledMinutes || 480) / 60).toString());
    }
  }, [open, todayLog, scheduledMinutes]);

  if (!todayLog) return <>{children}</>;

  const elapsedMin = Math.floor(elapsedSeconds / 60);
  const pct = scheduledMinutes > 0 ? Math.min(100, Math.round((elapsedMin / scheduledMinutes) * 100)) : 0;
  const timerColor = isOvertime ? 'text-red-500' : isNearEnd ? 'text-orange-500' : 'text-emerald-500';
  const statusLabel = isOvertime ? 'Σε υπερωρία' : isNearEnd ? 'Κοντά στη λήξη' : 'Ενεργός';
  const dateStr = new Date(todayLog.clock_in).toLocaleDateString('el-GR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const todayDayIdx = todaySchedule?.day_of_week ?? 0;
  const todayDayName = DAY_NAMES[todayDayIdx] ?? 'σήμερα';

  const handleSaveClockIn = async () => {
    if (!clockInInput) return;
    const newDate = new Date(clockInInput);
    if (isNaN(newDate.getTime())) {
      toast.error('Μη έγκυρη ημερομηνία');
      return;
    }
    const now = Date.now();
    if (newDate.getTime() > now) {
      toast.error('Η ώρα έναρξης δεν μπορεί να είναι στο μέλλον');
      return;
    }
    if (newDate.getTime() < now - 24 * 60 * 60 * 1000) {
      toast.error('Η ώρα έναρξης δεν μπορεί να είναι παλαιότερη των 24 ωρών');
      return;
    }
    setSavingClockIn(true);
    const { error } = await supabase
      .from('work_day_logs')
      .update({ clock_in: newDate.toISOString() })
      .eq('id', todayLog.id);
    setSavingClockIn(false);
    if (error) {
      toast.error('Σφάλμα κατά την αποθήκευση');
      return;
    }
    toast.success('Η ώρα έναρξης ενημερώθηκε');
    await refresh();
  };

  const handleSaveTarget = async () => {
    const hours = parseFloat(targetHours);
    if (isNaN(hours) || hours < 0.5 || hours > 16) {
      toast.error('Οι ώρες πρέπει να είναι μεταξύ 0.5 και 16');
      return;
    }
    const newMinutes = Math.round(hours * 60);
    setSavingTarget(true);

    if (scope === 'today') {
      const { error } = await supabase
        .from('work_day_logs')
        .update({ scheduled_minutes: newMinutes })
        .eq('id', todayLog.id);
      setSavingTarget(false);
      if (error) {
        toast.error('Σφάλμα κατά την αποθήκευση');
        return;
      }
      toast.success('Ο στόχος ενημερώθηκε για σήμερα');
    } else {
      if (!todaySchedule) {
        setSavingTarget(false);
        toast.error('Δεν υπάρχει ωράριο για σήμερα');
        return;
      }
      const startMin = timeToMinutes(todaySchedule.start_time);
      const endMin = startMin + newMinutes;
      if (endMin >= 24 * 60) {
        setSavingTarget(false);
        toast.error('Ο στόχος ξεπερνά τα όρια της ημέρας');
        return;
      }
      const { error: schedErr } = await supabase
        .from('work_schedules')
        .update({ end_time: minutesToHHMM(endMin) })
        .eq('id', todaySchedule.id);
      // Also update today's log so it reflects immediately
      const { error: logErr } = await supabase
        .from('work_day_logs')
        .update({ scheduled_minutes: newMinutes })
        .eq('id', todayLog.id);
      setSavingTarget(false);
      if (schedErr || logErr) {
        toast.error('Σφάλμα κατά την αποθήκευση');
        return;
      }
      toast.success(`Ο στόχος ενημερώθηκε μόνιμα για ${todayDayName}`);
    }
    await refresh();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        {/* Header / Summary */}
        <div className="p-4 border-b border-border/40">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>{dateStr}</span>
            </div>
            <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted', timerColor)}>
              {statusLabel}
            </span>
          </div>
          <div className={cn('flex items-baseline gap-2 font-mono', timerColor)}>
            <Clock className="h-5 w-5" />
            <span className="text-3xl font-bold tracking-tight">{formatHMS(elapsedSeconds)}</span>
            {scheduledMinutes > 0 && (
              <span className="text-sm text-muted-foreground font-normal">
                / {Math.floor(scheduledMinutes / 60)}ω {scheduledMinutes % 60 ? `${scheduledMinutes % 60}λ` : ''}
              </span>
            )}
          </div>
          {scheduledMinutes > 0 && (
            <div className="mt-3 space-y-1">
              <Progress value={pct} className={cn('h-1.5', isOvertime && '[&>div]:bg-red-500', isNearEnd && !isOvertime && '[&>div]:bg-orange-500')} />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{elapsedMin} λεπτά</span>
                <span>{pct}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Edit clock-in */}
        <div className="p-4 border-b border-border/40 space-y-2">
          <Label htmlFor="clock-in-input" className="text-xs">Ώρα έναρξης ημέρας</Label>
          <div className="flex gap-2">
            <Input
              id="clock-in-input"
              type="datetime-local"
              value={clockInInput}
              onChange={(e) => setClockInInput(e.target.value)}
              className="h-8 text-xs flex-1"
            />
            <Button size="sm" className="h-8 text-xs gap-1" onClick={handleSaveClockIn} disabled={savingClockIn}>
              <Save className="h-3 w-3" />
              Αποθήκευση
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">Διόρθωσε αν ξέχασες να ξεκινήσεις την ημέρα στην ώρα σου.</p>
        </div>

        {/* Daily target */}
        <div className="p-4 border-b border-border/40 space-y-2">
          <Label htmlFor="target-input" className="text-xs">Ημερήσιος στόχος (ώρες)</Label>
          <div className="flex gap-2">
            <Input
              id="target-input"
              type="number"
              min={0.5}
              max={16}
              step={0.5}
              value={targetHours}
              onChange={(e) => setTargetHours(e.target.value)}
              className="h-8 text-xs flex-1"
            />
            <Button size="sm" className="h-8 text-xs gap-1" onClick={handleSaveTarget} disabled={savingTarget}>
              <Save className="h-3 w-3" />
              Αποθήκευση
            </Button>
          </div>
          <RadioGroup value={scope} onValueChange={(v) => setScope(v as 'today' | 'permanent')} className="gap-1.5 pt-1">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="today" id="scope-today" />
              <Label htmlFor="scope-today" className="text-xs font-normal cursor-pointer">Μόνο σήμερα</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="permanent" id="scope-perm" />
              <Label htmlFor="scope-perm" className="text-xs font-normal cursor-pointer">Μόνιμα για {todayDayName}</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Quick actions */}
        {isClockedIn && (
          <div className="p-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs gap-1.5"
              onClick={async () => { await clockOut(); setOpen(false); }}
            >
              <Square className="h-3 w-3" />
              Λήξη ημέρας
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
