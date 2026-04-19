import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Hash, Mail, Phone, MapPin, Tag, Building2 } from 'lucide-react';
import { InlineEditField } from '../InlineEditField';
import { InlineTagsField } from '../InlineTagsField';
import { AIEnrichButton } from '../AIEnrichButton';
import { useClientUpdate } from '@/hooks/useClientUpdate';

interface Props {
  client: {
    id: string;
    name: string;
    tax_id: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    secondary_phone: string | null;
    address: string | null;
    website: string | null;
    tags: string[] | null;
  };
  canEdit: boolean;
  onRefresh?: () => void;
}

export function ClientBusinessInfoCard({ client, canEdit, onRefresh }: Props) {
  const update = useClientUpdate(client.id);
  const save = (field: string) => async (value: string | null) => {
    await update.mutateAsync({ [field]: value });
  };
  const saveTags = async (tags: string[]) => {
    await update.mutateAsync({ tags });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" /> Στοιχεία Επιχείρησης
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <Row icon={Hash} label="ΑΦΜ">
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <InlineEditField
              value={client.tax_id}
              onSave={save('tax_id')}
              placeholder="π.χ. 123456789"
              canEdit={canEdit}
              className="flex-1"
            />
            {canEdit && (
              <AIEnrichButton
                clientId={client.id}
                taxId={client.tax_id}
                website={client.website}
                clientName={client.name}
                onApplied={onRefresh}
              />
            )}
          </div>
        </Row>

        <Row icon={Mail} label="Email">
          <InlineEditField
            value={client.contact_email}
            onSave={save('contact_email')}
            type="email"
            placeholder="info@example.com"
            canEdit={canEdit}
          />
        </Row>

        <Row icon={Phone} label="Τηλέφωνο">
          <InlineEditField
            value={client.contact_phone}
            onSave={save('contact_phone')}
            type="tel"
            placeholder="+30 …"
            canEdit={canEdit}
          />
        </Row>

        <Row icon={Phone} label="Δεύτ. Τηλ.">
          <InlineEditField
            value={client.secondary_phone}
            onSave={save('secondary_phone')}
            type="tel"
            placeholder="—"
            canEdit={canEdit}
          />
        </Row>

        <Row icon={MapPin} label="Διεύθυνση">
          <InlineEditField
            value={client.address}
            onSave={save('address')}
            placeholder="Οδός, Πόλη, ΤΚ"
            canEdit={canEdit}
          />
        </Row>

        <Row icon={Tag} label="Tags" align="start">
          <InlineTagsField tags={client.tags || []} onSave={saveTags} canEdit={canEdit} />
        </Row>
      </CardContent>
    </Card>
  );
}

function Row({
  icon: Icon, label, children, align = 'center',
}: { icon: any; label: string; children: React.ReactNode; align?: 'center' | 'start' }) {
  return (
    <div className={`flex gap-3 ${align === 'start' ? 'items-start' : 'items-center'}`}>
      <div className="flex items-center gap-2 w-28 shrink-0 text-muted-foreground text-xs">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
