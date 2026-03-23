import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users } from 'lucide-react';
import { WIDGET_CARD_CLASS, WIDGET_ICON_CLASS, WIDGET_TITLE_CLASS } from '../chartStyles';

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
    <div className={WIDGET_CARD_CLASS}>
      <h3 className={WIDGET_TITLE_CLASS}>
        <span className={WIDGET_ICON_CLASS}><Users className="h-4 w-4 text-primary" /></span>
        Top Πελάτες
      </h3>
      <div className="space-y-3">
        {clients.length === 0 ? (
          <p className="text-sm text-muted-foreground/60 text-center py-6">Δεν υπάρχουν δεδομένα</p>
        ) : (
          clients.map((c, i) => (
            <div key={c.name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-medium text-muted-foreground w-4 tabular-nums">{i + 1}.</span>
                <span className="text-sm font-medium truncate text-foreground/90">{c.name}</span>
              </div>
              <span className="text-sm font-semibold text-foreground shrink-0 tabular-nums">€{c.revenue.toLocaleString()}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
