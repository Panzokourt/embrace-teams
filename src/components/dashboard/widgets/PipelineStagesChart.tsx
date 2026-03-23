import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity } from 'lucide-react';
import { chartTooltipStyle, WIDGET_CARD_CLASS, WIDGET_ICON_CLASS, WIDGET_TITLE_CLASS } from '../chartStyles';

interface StageData { stage: string; count: number; value: number }

const STAGE_LABELS: Record<string, string> = {
  identification: 'Εντοπισμός',
  preparation: 'Προετοιμασία',
  submitted: 'Υποβολή',
  evaluation: 'Αξιολόγηση',
  won: 'Κερδήθηκε',
  lost: 'Απορρίφθηκε',
};

export default function PipelineStagesChart() {
  const [data, setData] = useState<StageData[]>([]);

  useEffect(() => {
    supabase.from('tenders').select('stage, budget').then(({ data: tenders }) => {
      if (!tenders) return;
      const map = new Map<string, StageData>();
      tenders.forEach(t => {
        const s = t.stage || 'identification';
        const existing = map.get(s) || { stage: STAGE_LABELS[s] || s, count: 0, value: 0 };
        existing.count++;
        existing.value += Number(t.budget) || 0;
        map.set(s, existing);
      });
      const order = ['identification', 'preparation', 'submitted', 'evaluation', 'won', 'lost'];
      setData(order.map(k => map.get(k) || { stage: STAGE_LABELS[k], count: 0, value: 0 }));
    });
  }, []);

  return (
    <div className={WIDGET_CARD_CLASS}>
      <h3 className={WIDGET_TITLE_CLASS}>
        <span className={WIDGET_ICON_CLASS}><Activity className="h-4 w-4 text-primary" /></span>
        Pipeline Stages
      </h3>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [v, 'Τεμ.']} contentStyle={chartTooltipStyle} />
            <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
