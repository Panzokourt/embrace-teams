import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock } from 'lucide-react';
import { chartTooltipStyle, WIDGET_CARD_CLASS, WIDGET_ICON_CLASS, WIDGET_TITLE_CLASS } from '../chartStyles';

interface WeekData { week: string; hours: number }

export default function HoursLoggedChart() {
  const [data, setData] = useState<WeekData[]>([]);

  useEffect(() => {
    const weeks: WeekData[] = Array.from({ length: 8 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (7 - i) * 7);
      return { week: `W${d.getDate()}/${d.getMonth() + 1}`, hours: 0 };
    });

    supabase
      .from('time_entries')
      .select('duration_minutes, start_time')
      .eq('is_running', false)
      .gte('start_time', new Date(Date.now() - 56 * 86400000).toISOString())
      .then(({ data: entries }) => {
        if (!entries) { setData(weeks); return; }
        entries.forEach(e => {
          const d = new Date(e.start_time);
          const weekIdx = Math.floor((Date.now() - d.getTime()) / (7 * 86400000));
          const idx = 7 - weekIdx;
          if (idx >= 0 && idx < 8) weeks[idx].hours += Math.round((e.duration_minutes || 0) / 60);
        });
        setData(weeks);
      });
  }, []);

  return (
    <div className={WIDGET_CARD_CLASS}>
      <h3 className={WIDGET_TITLE_CLASS}>
        <span className={WIDGET_ICON_CLASS}><Clock className="h-4 w-4 text-primary" /></span>
        Ώρες Εργασίας (Trend)
      </h3>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={chartTooltipStyle} />
            <Area type="monotone" dataKey="hours" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1)/0.15)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
