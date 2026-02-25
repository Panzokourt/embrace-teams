import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

const PLACEHOLDER = [
  { month: 'Ιαν', rate: 45 },
  { month: 'Φεβ', rate: 52 },
  { month: 'Μαρ', rate: 48 },
  { month: 'Απρ', rate: 60 },
  { month: 'Μαϊ', rate: 55 },
  { month: 'Ιουν', rate: 63 },
];

export default function WinRateTrendChart() {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6 animate-fade-in shadow-soft h-full">
      <h3 className="text-base font-semibold flex items-center gap-2 mb-4 text-foreground">
        <span className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
          <TrendingUp className="h-4 w-4 text-foreground" />
        </span>
        Win Rate Trend
      </h3>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={PLACEHOLDER}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
            <Tooltip formatter={(v: number) => [`${v}%`, 'Win Rate']} contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', fontSize: '12px' }} />
            <Line type="monotone" dataKey="rate" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
