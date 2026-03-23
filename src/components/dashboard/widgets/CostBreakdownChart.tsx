import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import { chartTooltipStyle, CHART_COLORS, WIDGET_CARD_CLASS, WIDGET_ICON_CLASS, WIDGET_TITLE_CLASS } from '../chartStyles';

const PLACEHOLDER = [
  { name: 'Μισθοί', value: 45000 },
  { name: 'Εργαλεία', value: 12000 },
  { name: 'Media', value: 28000 },
  { name: 'Λοιπά', value: 8000 },
];

export default function CostBreakdownChart() {
  return (
    <div className={WIDGET_CARD_CLASS}>
      <h3 className={WIDGET_TITLE_CLASS}>
        <span className={WIDGET_ICON_CLASS}><PieIcon className="h-4 w-4 text-primary" /></span>
        Ανάλυση Κόστους
      </h3>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={PLACEHOLDER} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
              {PLACEHOLDER.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => `€${v.toLocaleString()}`} contentStyle={chartTooltipStyle} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
