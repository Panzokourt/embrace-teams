import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
import { Target } from 'lucide-react';

interface SkillData {
  skill: string;
  count: number;
}

export function SkillRadar({ userId }: { userId: string }) {
  const [skills, setSkills] = useState<SkillData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('user_xp')
      .select('skill_tag')
      .eq('user_id', userId)
      .eq('reason', 'kudos_received')
      .not('skill_tag', 'is', null)
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        (data || []).forEach(row => {
          const tag = row.skill_tag as string;
          counts[tag] = (counts[tag] || 0) + 1;
        });
        setSkills(Object.entries(counts).map(([skill, count]) => ({ skill, count })));
        setLoading(false);
      });
  }, [userId]);

  if (loading || skills.length < 3) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Skill Profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <RadarChart data={skills}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis dataKey="skill" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
            <Radar
              dataKey="count"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
