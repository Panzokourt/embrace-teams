import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { GovChecklist } from '@/hooks/useGovernance';

const TYPE_LABELS: Record<string, string> = {
  client_onboarding: 'Client Onboarding',
  user_offboarding: 'User Offboarding',
  quarterly_review: 'Quarterly Review',
};

export function ChecklistManager({ checklists }: { checklists: GovChecklist[] }) {
  if (!checklists.length) {
    return <p className="text-sm text-muted-foreground py-4">Δεν υπάρχουν checklists. Θα δημιουργηθούν αυτόματα.</p>;
  }

  return (
    <div className="space-y-4">
      {checklists.map(cl => (
        <Card key={cl.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{cl.title}</CardTitle>
              <Badge variant="outline">{TYPE_LABELS[cl.template_type] || cl.template_type}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(cl.items as any[]).map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <Checkbox disabled />
                  <span className="text-sm">{typeof item === 'string' ? item : item.label || item.text || JSON.stringify(item)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
