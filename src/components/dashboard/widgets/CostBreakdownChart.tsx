import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';

const PLACEHOLDER = [
  { name: 'Μισθοί', value: 45000 },
  { name: 'Εργαλεία', value: 12000 },
  { name: 'Media', value: 28000 },
  { name: 'Λοιπά', value: 8000 },
];

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
];

export default function CostBreakdownChart() {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6 animate-fade-in shadow-soft h-full">
      <h3 className="text-base font-semibold flex items-center gap-2 mb-4 text-foreground">
        <span className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
          <PieIcon className="h-4 w-4 text-foreground" />
        </span>
        Ανάλυση Κόστους
      </h3>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={PLACEHOLDER} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
              {PLACEHOLDER.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => `€${v.toLocaleString()}`} contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', fontSize: '12px' }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
