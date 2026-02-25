import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import type { GovAuditEvent } from '@/hooks/useGovernance';

const EVENT_LABELS: Record<string, string> = {
  access_granted: 'Πρόσβαση Δόθηκε',
  access_revoked: 'Πρόσβαση Αφαιρέθηκε',
  role_changed: 'Αλλαγή Ρόλου',
  mfa_updated: 'MFA Ενημέρωση',
  owner_changed: 'Αλλαγή Ιδιοκτήτη',
  billing_changed: 'Αλλαγή Billing',
  asset_created: 'Asset Δημιουργήθηκε',
  asset_archived: 'Asset Αρχειοθετήθηκε',
  security_updated: 'Security Update',
};

export function AuditTimeline({ events }: { events: GovAuditEvent[] }) {
  if (!events.length) {
    return <p className="text-sm text-muted-foreground py-4">Δεν υπάρχουν events.</p>;
  }

  return (
    <div className="space-y-3">
      {events.map(e => (
        <div key={e.id} className="flex gap-3 items-start border-l-2 border-border pl-4 py-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">{EVENT_LABELS[e.event_type] || e.event_type}</Badge>
              <span className="text-xs text-muted-foreground">
                {format(new Date(e.created_at), 'dd MMM yyyy, HH:mm', { locale: el })}
              </span>
            </div>
            <p className="text-sm mt-1">
              <span className="font-medium">{e.actor_name}</span>
              {e.notes && <span className="text-muted-foreground"> — {e.notes}</span>}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
