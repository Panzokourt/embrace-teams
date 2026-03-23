import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { chartTooltipStyle, WIDGET_CARD_CLASS, WIDGET_ICON_CLASS, WIDGET_TITLE_CLASS } from '../chartStyles';

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
    <div className={WIDGET_CARD_CLASS}>
      <h3 className={WIDGET_TITLE_CLASS}>
        <span className={WIDGET_ICON_CLASS}><TrendingUp className="h-4 w-4 text-primary" /></span>
        Win Rate Trend
      </h3>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={PLACEHOLDER}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
            <Tooltip formatter={(v: number) => [`${v}%`, 'Win Rate']} contentStyle={chartTooltipStyle} />
            <Line type="monotone" dataKey="rate" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
