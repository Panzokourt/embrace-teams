import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Coins, Clock, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { el } from 'date-fns/locale';

interface AICallLog {
  id: string;
  function_name: string;
  task_type: string | null;
  model_used: string;
  total_tokens: number | null;
  latency_ms: number | null;
  cost_estimate_usd: number | null;
  success: boolean;
  created_at: string;
}

export function AIUsageCard() {
  const { company } = useAuth();
  const [logs, setLogs] = useState<AICallLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company?.id) return;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    supabase
      .from('ai_call_logs')
      .select('id,function_name,task_type,model_used,total_tokens,latency_ms,cost_estimate_usd,success,created_at')
      .eq('company_id', company.id)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data }) => {
        setLogs((data as AICallLog[]) || []);
        setLoading(false);
      });
  }, [company?.id]);

  const stats = useMemo(() => {
    const total = logs.length;
    const tokens = logs.reduce((s, l) => s + (l.total_tokens || 0), 0);
    const cost = logs.reduce((s, l) => s + Number(l.cost_estimate_usd || 0), 0);
    const avgLat = total ? Math.round(logs.reduce((s, l) => s + (l.latency_ms || 0), 0) / total) : 0;
    const errors = logs.filter(l => !l.success).length;

    const byModel = new Map<string, { count: number; cost: number; tokens: number }>();
    logs.forEach(l => {
      const m = byModel.get(l.model_used) || { count: 0, cost: 0, tokens: 0 };
      m.count += 1;
      m.cost += Number(l.cost_estimate_usd || 0);
      m.tokens += l.total_tokens || 0;
      byModel.set(l.model_used, m);
    });

    const byFunction = new Map<string, number>();
    logs.forEach(l => byFunction.set(l.function_name, (byFunction.get(l.function_name) || 0) + 1));

    return {
      total, tokens, cost, avgLat, errors,
      byModel: [...byModel.entries()].sort((a, b) => b[1].cost - a[1].cost),
      byFunction: [...byFunction.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
    };
  }, [logs]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          <CardTitle>AI Usage</CardTitle>
        </div>
        <CardDescription>
          Στατιστικά χρήσης AI των τελευταίων 30 ημερών (model router & costs)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Δεν υπάρχουν δεδομένα χρήσης ακόμα.
          </p>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Κλήσεις</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Coins className="h-3 w-3" /> Κόστος</p>
                <p className="text-2xl font-bold">${stats.cost.toFixed(3)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Tokens</p>
                <p className="text-2xl font-bold">{stats.tokens.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Avg latency</p>
                <p className="text-2xl font-bold">{stats.avgLat}ms</p>
              </div>
            </div>

            {/* Per Model */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Ανά μοντέλο</p>
              <div className="space-y-1.5">
                {stats.byModel.map(([model, m]) => (
                  <div key={model} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <code className="text-xs truncate">{model}</code>
                      <Badge variant="outline" className="text-[10px]">{m.count}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                      <span>{m.tokens.toLocaleString()} tok</span>
                      <span className="font-medium text-foreground">${m.cost.toFixed(4)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top functions */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Top functions</p>
              <div className="grid sm:grid-cols-2 gap-1.5">
                {stats.byFunction.map(([fn, c]) => (
                  <div key={fn} className="flex items-center justify-between text-xs border rounded-md px-2.5 py-1.5">
                    <span className="truncate">{fn}</span>
                    <Badge variant="secondary" className="text-[10px]">{c}</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent errors */}
            {stats.errors > 0 && (
              <div className="text-xs text-destructive">
                {stats.errors} αποτυχημένες κλήσεις στις τελευταίες 30 ημέρες
              </div>
            )}

            {/* Most recent calls */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Τελευταίες κλήσεις</p>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {logs.slice(0, 15).map(l => (
                  <div key={l.id} className="flex items-center justify-between text-xs border rounded-md px-2.5 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`h-1.5 w-1.5 rounded-full ${l.success ? 'bg-success' : 'bg-destructive'}`} />
                      <span className="font-mono truncate">{l.function_name}</span>
                      {l.task_type && <Badge variant="outline" className="text-[10px]">{l.task_type}</Badge>}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                      <span>{l.latency_ms}ms</span>
                      <span>${Number(l.cost_estimate_usd || 0).toFixed(4)}</span>
                      <span>{formatDistanceToNow(new Date(l.created_at), { locale: el, addSuffix: true })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
