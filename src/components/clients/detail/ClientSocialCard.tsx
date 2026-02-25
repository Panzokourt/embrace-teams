import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SocialAccount {
  platform: string;
  account_name: string;
  url: string;
}

interface Props {
  accounts: SocialAccount[];
}

const platformIcons: Record<string, string> = {
  facebook: '📘',
  instagram: '📸',
  linkedin: '💼',
  tiktok: '🎵',
  youtube: '▶️',
  newsletter: '📧',
  twitter: '🐦',
  x: '✖️',
};

export function ClientSocialCard({ accounts }: Props) {
  if (accounts.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Share2 className="h-4 w-4" /> Social & Channels
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {accounts.map((acc, i) => (
          <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl bg-secondary/50 group">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-base">{platformIcons[acc.platform.toLowerCase()] || '🌐'}</span>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground capitalize">{acc.platform}</p>
                <p className="text-sm font-medium truncate">{acc.account_name}</p>
              </div>
            </div>
            {acc.url && (
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" asChild>
                <a href={acc.url.startsWith('http') ? acc.url : `https://${acc.url}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
