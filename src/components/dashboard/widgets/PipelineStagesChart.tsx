import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity } from 'lucide-react';

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
    <div className="rounded-2xl border border-border/50 bg-card p-6 animate-fade-in shadow-soft h-full">
      <h3 className="text-base font-semibold flex items-center gap-2 mb-4 text-foreground">
        <span className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
          <Activity className="h-4 w-4 text-foreground" />
        </span>
        Pipeline Stages
      </h3>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [v, 'Τεμ.']} contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', fontSize: '12px' }} />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
