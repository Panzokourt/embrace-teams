import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, ExternalLink, Copy, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { InlineEditField } from '../InlineEditField';
import { AIEnrichButton } from '../AIEnrichButton';
import { useClientUpdate } from '@/hooks/useClientUpdate';

interface WebsiteItem {
  url: string;
  label?: string;
}

interface Props {
  clientId: string;
  clientName: string;
  taxId?: string | null;
  primaryWebsite: string | null;
  additionalWebsites: WebsiteItem[];
  canEdit: boolean;
  onRefresh?: () => void;
}

export function ClientWebsitesCard({
  clientId, clientName, taxId, primaryWebsite, additionalWebsites, canEdit, onRefresh,
}: Props) {
  const update = useClientUpdate(clientId);
  const [adding, setAdding] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const savePrimary = async (v: string | null) => { await update.mutateAsync({ website: v }); };

  const addAdditional = async () => {
    if (!newUrl.trim()) { setAdding(false); return; }
    const next = [...additionalWebsites, { url: newUrl.trim(), label: newLabel.trim() || undefined }];
    await update.mutateAsync({ additional_websites: next });
    setNewUrl(''); setNewLabel(''); setAdding(false);
  };

  const removeAdditional = async (i: number) => {
    const next = additionalWebsites.filter((_, idx) => idx !== i);
    await update.mutateAsync({ additional_websites: next });
  };

  const updateAdditional = async (i: number, field: 'url' | 'label', value: string | null) => {
    const next = additionalWebsites.map((w, idx) =>
      idx === i ? { ...w, [field]: value || undefined } : w
    );
    await update.mutateAsync({ additional_websites: next });
  };

  const copy = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copied');
  };

  const isEmpty = !primaryWebsite && additionalWebsites.length === 0 && !adding;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="h-4 w-4" /> Websites
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Primary website row — always visible if canEdit */}
        {(primaryWebsite || canEdit) && (
          <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-xl bg-secondary/50 group">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground w-16 shrink-0">Primary</span>
              <InlineEditField
                value={primaryWebsite}
                onSave={savePrimary}
                type="url"
                canEdit={canEdit}
                placeholder="example.com"
                className="flex-1 min-w-0"
              />
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {canEdit && (
                <AIEnrichButton
                  clientId={clientId}
                  website={primaryWebsite}
                  taxId={taxId}
                  clientName={clientName}
                  onApplied={onRefresh}
                />
              )}
              {primaryWebsite && (
                <>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copy(primaryWebsite)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                    <a href={primaryWebsite.startsWith('http') ? primaryWebsite : `https://${primaryWebsite}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Additional websites */}
        {additionalWebsites.map((w, i) => (
          <div key={i} className="flex items-center justify-between gap-2 py-2 px-3 rounded-xl bg-secondary/50 group">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
              <InlineEditField
                value={w.label || ''}
                onSave={(v) => updateAdditional(i, 'label', v)}
                canEdit={canEdit}
                placeholder="Label"
                className="w-24 shrink-0"
                displayClassName="text-xs text-muted-foreground"
              />
              <InlineEditField
                value={w.url}
                onSave={(v) => updateAdditional(i, 'url', v)}
                type="url"
                canEdit={canEdit}
                className="flex-1 min-w-0"
              />
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copy(w.url)}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                <a href={w.url.startsWith('http') ? w.url : `https://${w.url}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
              {canEdit && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeAdditional(i)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}

        {/* Add additional row */}
        {adding ? (
          <div className="flex items-center gap-2 py-2 px-3 rounded-xl border border-dashed">
            <Input
              autoFocus
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Label"
              className="h-8 w-24 text-xs"
            />
            <Input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="example.com"
              className="h-8 text-sm flex-1"
              onKeyDown={(e) => { if (e.key === 'Enter') addAdditional(); if (e.key === 'Escape') setAdding(false); }}
            />
            <Button size="sm" onClick={addAdditional}>OK</Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewUrl(''); setNewLabel(''); }}>×</Button>
          </div>
        ) : (
          canEdit && !isEmpty && (
            <button
              onClick={() => setAdding(true)}
              className="w-full py-2 text-sm text-muted-foreground hover:text-foreground rounded-xl border border-dashed hover:border-primary/40 transition-colors inline-flex items-center justify-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Επιπλέον website
            </button>
          )
        )}

        {isEmpty && !canEdit && (
          <p className="text-sm text-muted-foreground text-center py-4">Καμία ιστοσελίδα</p>
        )}
      </CardContent>
    </Card>
  );
}
