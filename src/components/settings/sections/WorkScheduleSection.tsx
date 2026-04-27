import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

const DAY_LABELS = ['Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο', 'Κυριακή'];
const DEFAULT_SCHEDULE = DAY_LABELS.map((_, i) => ({
  day_of_week: i, start_time: '09:00', end_time: '17:00', is_working_day: i < 5,
}));

export function WorkScheduleSection() {
  const { user, company } = useAuth();
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('work_schedules').select('*').eq('user_id', user.id).then(({ data }) => {
      if (data && data.length > 0) {
        const merged = DEFAULT_SCHEDULE.map(def => {
          const found = data.find((d: any) => d.day_of_week === def.day_of_week);
          return found ? {
            day_of_week: found.day_of_week,
            start_time: (found as any).start_time?.substring(0, 5) || def.start_time,
            end_time: (found as any).end_time?.substring(0, 5) || def.end_time,
            is_working_day: (found as any).is_working_day ?? def.is_working_day,
          } : def;
        });
        setSchedule(merged);
      }
      setLoaded(true);
    });
  }, [user]);

  const updateDay = (idx: number, field: string, value: any) => {
    setSchedule(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const totalWeeklyHours = schedule.reduce((acc, s) => {
    if (!s.is_working_day) return acc;
    const [sh, sm] = s.start_time.split(':').map(Number);
    const [eh, em] = s.end_time.split(':').map(Number);
    return acc + (eh * 60 + em - sh * 60 - sm) / 60;
  }, 0);

  const handleSave = async () => {
    if (!user || !company) return;
    setSaving(true);
    try {
      for (const s of schedule) {
        await supabase.from('work_schedules').upsert({
          user_id: user.id, company_id: company.id, day_of_week: s.day_of_week,
          start_time: s.start_time, end_time: s.end_time, is_working_day: s.is_working_day,
        }, { onConflict: 'user_id,day_of_week' });
      }
      toast.success('Το ωράριο αποθηκεύτηκε!');
    } catch {
      toast.error('Σφάλμα κατά την αποθήκευση');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-3">
          {schedule.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-32">
                <Checkbox checked={s.is_working_day} onCheckedChange={(v) => updateDay(i, 'is_working_day', !!v)} />
                <span className={cn('text-sm', !s.is_working_day && 'text-muted-foreground line-through')}>
                  {DAY_LABELS[i]}
                </span>
              </div>
              <Input type="time" value={s.start_time} onChange={(e) => updateDay(i, 'start_time', e.target.value)}
                disabled={!s.is_working_day} className="w-28 h-8 text-xs" />
              <span className="text-muted-foreground text-xs">—</span>
              <Input type="time" value={s.end_time} onChange={(e) => updateDay(i, 'end_time', e.target.value)}
                disabled={!s.is_working_day} className="w-28 h-8 text-xs" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted-foreground">
            Σύνολο: <strong>{totalWeeklyHours.toFixed(1)}</strong> ώρες/εβδομάδα
          </span>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Αποθήκευση
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
