import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Repeat } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

interface TaskRecurrenceCardProps {
  taskId: string;
  isRecurring: boolean;
  recurrencePattern: string | null;
  recurrenceEndDate: string | null;
  onUpdate: () => void;
}

const PATTERNS = [
  { value: 'daily', label: 'Καθημερινά' },
  { value: 'weekly', label: 'Εβδομαδιαία' },
  { value: 'biweekly', label: 'Κάθε 2 εβδομάδες' },
  { value: 'monthly', label: 'Μηνιαία' },
  { value: 'quarterly', label: 'Τριμηνιαία' },
];

export function TaskRecurrenceCard({ taskId, isRecurring, recurrencePattern, recurrenceEndDate, onUpdate }: TaskRecurrenceCardProps) {
  const [saving, setSaving] = useState(false);

  const updateRecurrence = async (updates: Record<string, unknown>) => {
    setSaving(true);
    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId);
    setSaving(false);
    if (error) {
      toast.error('Σφάλμα αποθήκευσης');
      return;
    }
    onUpdate();
  };

  const handleToggle = (checked: boolean) => {
    updateRecurrence({
      is_recurring: checked,
      recurrence_pattern: checked ? (recurrencePattern || 'weekly') : null,
    });
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Repeat className="h-3.5 w-3.5" />
            Επανάληψη
          </h4>
          <Switch
            checked={isRecurring}
            onCheckedChange={handleToggle}
            disabled={saving}
          />
        </div>

        {isRecurring && (
          <div className="space-y-2.5 pt-1">
            <div className="space-y-1">
              <Label className="text-[11px]">Μοτίβο</Label>
              <Select
                value={recurrencePattern || 'weekly'}
                onValueChange={(v) => updateRecurrence({ recurrence_pattern: v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PATTERNS.map(p => (
                    <SelectItem key={p.value} value={p.value} className="text-xs">
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px]">Λήξη επανάληψης</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full h-8 text-xs justify-start gap-2 font-normal">
                    <CalendarIcon className="h-3 w-3" />
                    {recurrenceEndDate
                      ? format(new Date(recurrenceEndDate), 'd MMM yyyy', { locale: el })
                      : 'Χωρίς λήξη'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={recurrenceEndDate ? new Date(recurrenceEndDate) : undefined}
                    onSelect={(date) => {
                      updateRecurrence({ recurrence_end_date: date ? date.toISOString() : null });
                    }}
                    locale={el}
                  />
                  {recurrenceEndDate && (
                    <div className="p-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => updateRecurrence({ recurrence_end_date: null })}
                      >
                        Χωρίς λήξη
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
