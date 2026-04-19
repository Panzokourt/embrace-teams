import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Loader2, ExternalLink } from 'lucide-react';

export interface EnrichSuggestion {
  field: string;             // e.g. 'tax_id', 'address', 'social_accounts'
  label: string;             // human-readable label
  value: any;                // suggested value
  currentValue?: any;        // current DB value
  confidence?: 'low' | 'medium' | 'high';
  source?: string;           // 'firecrawl' | 'perplexity'
  sourceUrl?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string;
  suggestions: EnrichSuggestion[];
  logoUrl?: string;
  onApplied?: () => void;
}

const confidenceColor: Record<string, string> = {
  high: 'bg-success/10 text-success border-success/20',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200',
  low: 'bg-muted text-muted-foreground border-border',
};

function renderValue(v: any) {
  if (v === null || v === undefined || v === '') return <span className="text-muted-foreground italic">—</span>;
  if (typeof v === 'string') {
    return <span className="break-words whitespace-pre-wrap block">{v}</span>;
  }
  if (Array.isArray(v)) {
    // Render arrays of strings as chips
    if (v.every(x => typeof x === 'string')) {
      return (
        <div className="flex flex-wrap gap-1">
          {v.map((s, i) => (
            <span key={i} className="text-xs bg-muted px-1.5 py-0.5 rounded-md">{s}</span>
          ))}
        </div>
      );
    }
    // Render arrays of objects (e.g. social_accounts) as a compact list
    return (
      <div className="space-y-1 max-h-40 overflow-auto pr-1">
        {v.map((item, i) => (
          <div key={i} className="text-xs bg-muted/60 rounded-md px-2 py-1">
            {typeof item === 'object' && item !== null ? (
              <div className="space-y-0.5">
                {Object.entries(item).map(([k, val]) => (
                  <div key={k} className="flex gap-1.5">
                    <span className="text-muted-foreground shrink-0">{k}:</span>
                    <span className="break-all">{String(val)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="break-all">{String(item)}</span>
            )}
          </div>
        ))}
      </div>
    );
  }
  return (
    <code className="text-xs bg-muted px-1.5 py-0.5 rounded block max-h-40 overflow-auto whitespace-pre-wrap break-words">
      {JSON.stringify(v, null, 2)}
    </code>
  );
}

export function AIEnrichDialog({ open, onOpenChange, clientId, suggestions, logoUrl, onApplied }: Props) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [applyLogo, setApplyLogo] = useState(true);
  const [saving, setSaving] = useState(false);
  // Per-field merge mode for arrays (tags, social_accounts) — default merge
  const [mergeMode, setMergeMode] = useState<Record<string, 'merge' | 'replace'>>({});

  useEffect(() => {
    if (open) {
      const init: Record<string, boolean> = {};
      const initMerge: Record<string, 'merge' | 'replace'> = {};
      suggestions.forEach(s => {
        init[s.field] = (s.confidence || 'medium') !== 'low';
        if (Array.isArray(s.value) && Array.isArray(s.currentValue) && s.currentValue.length > 0) {
          initMerge[s.field] = 'merge';
        }
      });
      setSelected(init);
      setMergeMode(initMerge);
      setApplyLogo(!!logoUrl);
    }
  }, [open, suggestions, logoUrl]);

  const toggle = (field: string) => setSelected(p => ({ ...p, [field]: !p[field] }));
  const checkedCount = Object.values(selected).filter(Boolean).length + (applyLogo && logoUrl ? 1 : 0);

  const apply = async () => {
    setSaving(true);
    try {
      const updates: Record<string, any> = {};
      suggestions.forEach(s => {
        if (!selected[s.field]) return;
        let value = s.value;
        // Merge arrays (tags, social_accounts) when current already has values & user picked merge
        if (
          mergeMode[s.field] === 'merge' &&
          Array.isArray(value) &&
          Array.isArray(s.currentValue) &&
          s.currentValue.length > 0
        ) {
          if (s.field === 'tags' || (value.every((x: any) => typeof x === 'string'))) {
            // Union for string arrays — case-insensitive dedupe
            const seen = new Set<string>();
            const merged: string[] = [];
            [...s.currentValue, ...value].forEach((t: any) => {
              const k = String(t).trim().toLowerCase();
              if (k && !seen.has(k)) {
                seen.add(k);
                merged.push(String(t).trim());
              }
            });
            value = merged;
          } else if (s.field === 'social_accounts') {
            // Dedupe by platform+url
            const seen = new Set<string>();
            const merged: any[] = [];
            [...s.currentValue, ...value].forEach((a: any) => {
              const k = `${(a?.platform || '').toLowerCase()}::${(a?.url || a?.account_name || '').toLowerCase()}`;
              if (!seen.has(k)) {
                seen.add(k);
                merged.push(a);
              }
            });
            value = merged;
          }
        }
        updates[s.field] = value;
      });
      if (applyLogo && logoUrl) updates.logo_url = logoUrl;

      if (Object.keys(updates).length === 0) {
        toast.info('Δεν επιλέχθηκε καμία πρόταση');
        return;
      }

      const { error } = await supabase.from('clients').update(updates).eq('id', clientId);
      if (error) throw error;
      toast.success(`Εφαρμόστηκαν ${Object.keys(updates).length} προτάσεις`);
      onApplied?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'Σφάλμα εφαρμογής');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> AI Προτάσεις Στοιχείων
          </DialogTitle>
          <DialogDescription>
            Επίλεξε ποιες προτάσεις θέλεις να εφαρμοστούν στην καρτέλα του πελάτη.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-3">
          <div className="space-y-2">
            {logoUrl && (
              <label className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card cursor-pointer hover:bg-secondary/40 transition-colors">
                <Checkbox checked={applyLogo} onCheckedChange={() => setApplyLogo(v => !v)} className="mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-medium">Λογότυπο</span>
                    <Badge variant="outline" className="text-xs">auto-detected</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <img src={logoUrl} alt="logo" className="h-12 w-12 object-contain rounded-md bg-secondary" />
                    <span className="text-xs text-muted-foreground truncate">{logoUrl}</span>
                  </div>
                </div>
              </label>
            )}

            {suggestions.length === 0 && !logoUrl && (
              <p className="text-center py-8 text-muted-foreground">Δεν βρέθηκαν προτάσεις</p>
            )}

            {suggestions.map(s => (
              <label
                key={s.field}
                className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card cursor-pointer hover:bg-secondary/40 transition-colors"
              >
                <Checkbox
                  checked={!!selected[s.field]}
                  onCheckedChange={() => toggle(s.field)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-medium">{s.label}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {s.confidence && (
                        <Badge className={`text-xs border ${confidenceColor[s.confidence]}`}>
                          {s.confidence}
                        </Badge>
                      )}
                      {s.source && (
                        <Badge variant="outline" className="text-xs">{s.source}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    {s.currentValue !== undefined && s.currentValue !== null && s.currentValue !== '' && (
                      <div className="flex gap-2">
                        <span className="text-xs text-muted-foreground w-12 shrink-0 mt-0.5">Τώρα:</span>
                        <div className="text-muted-foreground min-w-0 flex-1">{renderValue(s.currentValue)}</div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <span className="text-xs text-muted-foreground w-12 shrink-0 mt-0.5">Νέο:</span>
                      <div className="text-foreground min-w-0 flex-1">{renderValue(s.value)}</div>
                    </div>
                  </div>
                  {Array.isArray(s.value) && Array.isArray(s.currentValue) && s.currentValue.length > 0 && (
                    <div
                      className="flex items-center gap-2 mt-2 text-xs"
                      onClick={(e) => e.preventDefault()}
                    >
                      <span className="text-muted-foreground">Εφαρμογή:</span>
                      <button
                        type="button"
                        onClick={() => setMergeMode(p => ({ ...p, [s.field]: 'merge' }))}
                        className={`px-2 py-0.5 rounded-md border ${
                          (mergeMode[s.field] || 'merge') === 'merge'
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card border-border hover:bg-secondary'
                        }`}
                      >
                        Συγχώνευση
                      </button>
                      <button
                        type="button"
                        onClick={() => setMergeMode(p => ({ ...p, [s.field]: 'replace' }))}
                        className={`px-2 py-0.5 rounded-md border ${
                          mergeMode[s.field] === 'replace'
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card border-border hover:bg-secondary'
                        }`}
                      >
                        Αντικατάσταση
                      </button>
                    </div>
                  )}
                  {s.sourceUrl && (
                    <a
                      href={s.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                    >
                      <ExternalLink className="h-3 w-3" /> Πηγή
                    </a>
                  )}
                </div>
              </label>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Ακύρωση</Button>
          <Button onClick={apply} disabled={saving || checkedCount === 0}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Εφαρμογή ({checkedCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
