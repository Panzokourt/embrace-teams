import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, ExternalLink, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface WebsiteItem {
  url: string;
  label?: string;
}

interface Props {
  primaryWebsite: string | null;
  additionalWebsites: WebsiteItem[];
}

function WebsiteRow({ url, label }: { url: string; label?: string }) {
  const copy = () => {
    navigator.clipboard.writeText(url);
    toast.success('Link copied');
  };

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-secondary/50 group">
      <div className="flex items-center gap-2 min-w-0">
        <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm truncate">{label || url}</span>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copy}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
          <a href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </div>
  );
}

export function ClientWebsitesCard({ primaryWebsite, additionalWebsites }: Props) {
  if (!primaryWebsite && additionalWebsites.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="h-4 w-4" /> Websites
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {primaryWebsite && <WebsiteRow url={primaryWebsite} label="Primary Website" />}
        {additionalWebsites.map((w, i) => (
          <WebsiteRow key={i} url={w.url} label={w.label} />
        ))}
      </CardContent>
    </Card>
  );
}
