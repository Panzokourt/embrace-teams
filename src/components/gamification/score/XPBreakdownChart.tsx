import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { PieChart as PieIcon } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const REASON_GROUPS: Record<string, string> = {
  task_completed: 'Tasks',
  task_completed_early: 'Tasks',
  task_completed_on_time: 'Tasks',
  task_completed_late: 'Tasks',
  kudos_received: 'Kudos',
  kudos_given: 'Kudos',
  time_logged: 'Time tracking',
  file_uploaded: 'Αρχεία',
  task_detailed: 'Λεπτομέρεια',
  daily_streak: 'Streak',
  comment_added: 'Συνεργασία',
  achievement_unlocked: 'Achievements',
};

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent-foreground))',
  '#f59e0b',
  '#10b981',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f43f5e',
];

interface Props {
  userId: string;
}

export function XPBreakdownChart({ userId }: Props) {
  const [data, setData] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: rows } = await supabase
        .from('user_xp')
        .select('points, reason')
        .eq('user_id', userId)
        .gt('points', 0);

      const totals = new Map<string, number>();
      (rows || []).forEach((r: any) => {
        const group = REASON_GROUPS[r.reason] || 'Άλλα';
        totals.set(group, (totals.get(group) || 0) + r.points);
      });
      setData(
        Array.from(totals.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
      );
      setLoading(false);
    };
    fetch();
  }, [userId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <PieIcon className="h-4 w-4 text-primary" />
          Από πού κερδίζεις XP
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[260px] animate-pulse bg-muted/30 rounded-lg" />
        ) : data.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">
            Δεν υπάρχουν δεδομένα ακόμα. Ολοκλήρωσε tasks για να ξεκινήσεις!
          </p>
        ) : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [`${value} XP`, '']}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
