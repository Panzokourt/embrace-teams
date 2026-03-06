import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { el } from 'date-fns/locale';

interface ActivityEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_name: string | null;
  created_at: string;
  user_id: string;
  profiles?: { full_name: string | null; email: string } | null;
}

interface OrgActivityTabProps {
  companyId: string;
}

const ACTION_COLORS: Record<string, string> = {
  create: 'default',
  update: 'secondary',
  delete: 'destructive',
};

export function OrgActivityTab({ companyId }: OrgActivityTabProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('activity_log')
        .select('id, action, entity_type, entity_name, created_at, user_id, profiles:user_id(full_name, email)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50);
      setEntries((data as any[]) || []);
      setLoading(false);
    };
    fetch();
  }, [companyId]);

  return (
    <Card className="border-border/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Πρόσφατη δραστηριότητα
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-foreground" /></div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Δεν υπάρχει δραστηριότητα ακόμα.</p>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {entries.map((e) => (
              <div key={e.id} className="flex items-start gap-3 py-2 border-b border-border/30 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{(e.profiles as any)?.full_name || (e.profiles as any)?.email || 'Χρήστης'}</span>
                    {' — '}
                    <Badge variant={(ACTION_COLORS[e.action] as any) || 'secondary'} className="text-xs mr-1">{e.action}</Badge>
                    <span className="text-muted-foreground">{e.entity_type}</span>
                    {e.entity_name && <span className="text-foreground"> «{e.entity_name}»</span>}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: el })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
