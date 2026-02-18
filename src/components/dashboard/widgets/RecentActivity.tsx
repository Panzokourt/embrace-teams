import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { Activity } from 'lucide-react';

interface ActivityItem {
  id: string;
  action: string;
  entity_type: string;
  entity_name: string | null;
  created_at: string;
}

export default function RecentActivity() {
  const [items, setItems] = useState<ActivityItem[]>([]);

  useEffect(() => {
    supabase
      .from('activity_log')
      .select('id, action, entity_type, entity_name, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setItems(data);
      });
  }, []);

  const getActionLabel = (action: string) => {
    const map: Record<string, string> = {
      created: 'Δημιουργία',
      updated: 'Ενημέρωση',
      deleted: 'Διαγραφή',
      completed: 'Ολοκλήρωση',
      status_change: 'Αλλαγή κατάστασης',
    };
    return map[action] || action;
  };

  const getEntityLabel = (type: string) => {
    const map: Record<string, string> = {
      project: 'Έργο',
      task: 'Task',
      tender: 'Διαγωνισμός',
      invoice: 'Τιμολόγιο',
      client: 'Πελάτης',
      deliverable: 'Παραδοτέο',
    };
    return map[type] || type;
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6 animate-fade-in shadow-soft h-full">
      <h3 className="text-base font-semibold flex items-center gap-2 mb-4 text-foreground">
        <span className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Activity className="h-4 w-4 text-primary" />
        </span>
        Πρόσφατη Δραστηριότητα
      </h3>

      <div className="space-y-1 max-h-72 overflow-y-auto scrollbar-thin">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground/60 text-center py-8">
            Δεν υπάρχει πρόσφατη δραστηριότητα
          </p>
        ) : (
          items.map(item => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-secondary/50 transition-colors"
            >
              <div className="h-2 w-2 rounded-full bg-primary/50 mt-1.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground/90 truncate">
                  <span className="font-medium">{getActionLabel(item.action)}</span>
                  {' '}
                  <span className="text-muted-foreground">{getEntityLabel(item.entity_type)}</span>
                  {item.entity_name && (
                    <span className="text-foreground/70"> · {item.entity_name}</span>
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                  {format(new Date(item.created_at), 'd MMM, HH:mm', { locale: el })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
