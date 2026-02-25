import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users } from 'lucide-react';

interface ClientRev { name: string; revenue: number }

export default function TopClientsRevenue() {
  const [clients, setClients] = useState<ClientRev[]>([]);

  useEffect(() => {
    supabase
      .from('invoices')
      .select('amount, client:clients(name)')
      .then(({ data }) => {
        if (!data) return;
        const map = new Map<string, number>();
        data.forEach((inv: any) => {
          const name = inv.client?.name || 'Άγνωστος';
          map.set(name, (map.get(name) || 0) + Number(inv.amount || 0));
        });
        const sorted = [...map.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, revenue]) => ({ name, revenue }));
        setClients(sorted);
      });
  }, []);

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6 animate-fade-in shadow-soft h-full">
      <h3 className="text-base font-semibold flex items-center gap-2 mb-4 text-foreground">
        <span className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
          <Users className="h-4 w-4 text-foreground" />
        </span>
        Top Πελάτες
      </h3>
      <div className="space-y-3">
        {clients.length === 0 ? (
          <p className="text-sm text-muted-foreground/60 text-center py-6">Δεν υπάρχουν δεδομένα</p>
        ) : (
          clients.map((c, i) => (
            <div key={c.name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-medium text-muted-foreground w-4">{i + 1}.</span>
                <span className="text-sm font-medium truncate text-foreground/90">{c.name}</span>
              </div>
              <span className="text-sm font-semibold text-foreground shrink-0">€{c.revenue.toLocaleString()}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
