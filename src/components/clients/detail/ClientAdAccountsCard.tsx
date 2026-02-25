import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, BarChart3 } from 'lucide-react';

interface AdAccount {
  platform: string;
  account_name: string;
  url: string;
  ownership: 'agency' | 'client';
  has_risk?: boolean;
}

interface Props {
  accounts: AdAccount[];
}

const platformIcons: Record<string, string> = {
  'business manager': '🏢',
  'meta ad account': '📘',
  'google ads': '📊',
  'ga4': '📈',
  'gtm': '🏷️',
  'merchant center': '🛒',
  'search console': '🔍',
};

export function ClientAdAccountsCard({ accounts }: Props) {
  if (accounts.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" /> Ad & Tracking Accounts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {accounts.map((acc, i) => (
          <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl bg-secondary/50 group">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-base">{platformIcons[acc.platform.toLowerCase()] || '📊'}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate">{acc.account_name}</p>
                  {acc.has_risk && <span className="w-2 h-2 rounded-full bg-destructive shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground capitalize">{acc.platform}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={acc.ownership === 'agency'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 text-xs'
                  : 'bg-secondary text-muted-foreground text-xs'}
              >
                {acc.ownership === 'agency' ? 'Agency' : 'Client'}
              </Badge>
              {acc.url && (
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" asChild>
                  <a href={acc.url.startsWith('http') ? acc.url : `https://${acc.url}`} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
