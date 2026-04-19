import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Share2 } from 'lucide-react';
import { InlineSocialAccountsField, type SocialAccount } from './InlineSocialAccountsField';

interface Props {
  clientId: string;
  accounts: SocialAccount[];
  canEdit?: boolean;
  onClientUpdated?: (updated: any) => void;
}

export function ClientSocialCard({ clientId, accounts, canEdit = true, onClientUpdated }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Share2 className="h-4 w-4" /> Social & Channels
        </CardTitle>
      </CardHeader>
      <CardContent>
        <InlineSocialAccountsField
          clientId={clientId}
          accounts={accounts}
          canEdit={canEdit}
          onClientUpdated={onClientUpdated}
        />
      </CardContent>
    </Card>
  );
}
