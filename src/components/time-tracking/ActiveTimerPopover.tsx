import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { CalendarClock, ExternalLink, Save, ListChecks } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import type { TimeEntry } from '@/hooks/useTimeTracking';

interface ActiveTimerPopoverProps {
  activeTimer: TimeEntry;
  elapsed: number;
  formatElapsed: (seconds: number) => string;
  onUpdated: () => void;
  children: React.ReactNode;
}

// Convert ISO string -> "yyyy-MM-ddTHH:mm" suitable for datetime-local input (in local TZ).
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ActiveTimerPopover({ activeTimer, elapsed, formatElapsed, onUpdated, children }: ActiveTimerPopoverProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [startInput, setStartInput] = useState(() => isoToLocalInput(activeTimer.start_time));
  const [saving, setSaving] = useState(false);

  // Re-sync when popover opens or the underlying timer changes
  useEffect(() => {
    setStartInput(isoToLocalInput(activeTimer.start_time));
  }, [activeTimer.start_time, open]);

  const startDate = new Date(activeTimer.start_time);

  const handleSave = async () => {
    if (!startInput) return;
    const newStart = new Date(startInput);
    if (isNaN(newStart.getTime())) {
      toast.error('Μη έγκυρη ημερομηνία');
      return;
    }
    if (newStart.getTime() > Date.now()) {
      toast.error('Η ώρα έναρξης δεν μπορεί να είναι στο μέλλον');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('time_entries')
      .update({ start_time: newStart.toISOString() })
      .eq('id', activeTimer.id);
    setSaving(false);
    if (error) {
      toast.error('Σφάλμα αποθήκευσης');
      return;
    }
    toast.success('Ώρα έναρξης ενημερώθηκε');
    onUpdated();
  };

  const handleGoToTimesheets = () => {
    setOpen(false);
    navigate('/timesheets');
  };

  const handleGoToTask = () => {
    if (activeTimer.task_id) {
      setOpen(false);
      navigate(`/tasks/${activeTimer.task_id}`);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className="w-80 p-0">
        <div className="p-4 space-y-3">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1.5">
              <CalendarClock className="h-3 w-3" />
              Ενεργός Timer
            </div>
            <div className="mt-1 font-mono text-2xl font-bold text-primary tabular-nums">
              {formatElapsed(elapsed)}
            </div>
            {activeTimer.task?.title && (
              <button
                onClick={handleGoToTask}
                className="mt-1 text-xs text-foreground/80 hover:text-primary hover:underline text-left truncate block max-w-full"
              >
                {activeTimer.task.title}
              </button>
            )}
            {activeTimer.project?.name && (
              <div className="text-[11px] text-muted-foreground truncate">
                {activeTimer.project.name}
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="timer-start" className="text-[11px]">Ώρα έναρξης</Label>
            <Input
              id="timer-start"
              type="datetime-local"
              value={startInput}
              onChange={(e) => setStartInput(e.target.value)}
              className="h-8 text-xs"
            />
            <div className="text-[10px] text-muted-foreground">
              Ξεκίνησε: {format(startDate, "EEEE d MMM yyyy 'στις' HH:mm:ss", { locale: el })}
            </div>
            <Button
              size="sm"
              className="w-full h-8 text-xs"
              onClick={handleSave}
              disabled={saving || isoToLocalInput(activeTimer.start_time) === startInput}
            >
              <Save className="h-3 w-3 mr-1.5" />
              {saving ? 'Αποθήκευση...' : 'Αποθήκευση ώρας έναρξης'}
            </Button>
          </div>

          <Separator />

          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs justify-between"
            onClick={handleGoToTimesheets}
          >
            <span className="flex items-center gap-1.5">
              <ListChecks className="h-3.5 w-3.5" />
              Οι Παρουσίες μου
            </span>
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
