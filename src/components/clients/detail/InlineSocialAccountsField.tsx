import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink, Plus, Trash2, Pencil, Check, X, Loader2 } from 'lucide-react';
import { useClientUpdate } from '@/hooks/useClientUpdate';
import { toast } from 'sonner';

export interface SocialAccount {
  platform: string;
  account_name: string;
  url: string;
}

interface Props {
  clientId: string;
  accounts: SocialAccount[];
  canEdit?: boolean;
  onClientUpdated?: (updated: any) => void;
}

const PLATFORMS = [
  { value: 'facebook', label: 'Facebook', icon: '📘' },
  { value: 'instagram', label: 'Instagram', icon: '📸' },
  { value: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { value: 'youtube', label: 'YouTube', icon: '▶️' },
  { value: 'tiktok', label: 'TikTok', icon: '🎵' },
  { value: 'x', label: 'X / Twitter', icon: '✖️' },
  { value: 'twitter', label: 'Twitter', icon: '🐦' },
  { value: 'threads', label: 'Threads', icon: '🧵' },
  { value: 'newsletter', label: 'Newsletter', icon: '📧' },
];

const platformIcon = (p: string) => PLATFORMS.find(pl => pl.value === p.toLowerCase())?.icon || '🌐';
const platformLabel = (p: string) => PLATFORMS.find(pl => pl.value === p.toLowerCase())?.label || p;

const normalizeUrl = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  return `https://${trimmed.replace(/^\/+/, '')}`;
};

const openExternalUrl = (raw: string) => {
  const normalized = normalizeUrl(raw);
  if (!normalized) return;

  const popup = window.open(normalized, '_blank', 'noopener,noreferrer');
  if (popup) {
    popup.opener = null;
    return;
  }

  const tempLink = document.createElement('a');
  tempLink.href = normalized;
  tempLink.target = '_blank';
  tempLink.rel = 'noopener noreferrer';
  document.body.appendChild(tempLink);
  tempLink.click();
  tempLink.remove();
};

interface RowFormProps {
  initial?: SocialAccount;
  onSubmit: (acc: SocialAccount) => void;
  onCancel: () => void;
  saving?: boolean;
}

function RowForm({ initial, onSubmit, onCancel, saving }: RowFormProps) {
  const [platform, setPlatform] = useState(initial?.platform || 'facebook');
  const [accountName, setAccountName] = useState(initial?.account_name || '');
  const [url, setUrl] = useState(initial?.url || '');

  const submit = () => {
    if (!accountName.trim() && !url.trim()) {
      toast.error('Συμπλήρωσε όνομα ή URL');
      return;
    }
    onSubmit({ platform, account_name: accountName.trim(), url: url.trim() });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 p-2 rounded-xl bg-secondary/40 border border-border">
      <Select value={platform} onValueChange={setPlatform}>
        <SelectTrigger className="h-8 w-full sm:w-[130px] text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PLATFORMS.map(p => (
            <SelectItem key={p.value} value={p.value}>
              <span className="flex items-center gap-2">
                <span>{p.icon}</span>{p.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        placeholder="Όνομα / handle"
        value={accountName}
        onChange={(e) => setAccountName(e.target.value)}
        className="h-8 text-sm flex-1 min-w-0"
        autoFocus
      />
      <Input
        placeholder="URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="h-8 text-sm flex-1 min-w-0"
      />
      <div className="flex gap-1 shrink-0">
        <Button size="icon" variant="default" className="h-8 w-8" onClick={submit} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onCancel} disabled={saving}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function InlineSocialAccountsField({ clientId, accounts, canEdit = true, onClientUpdated }: Props) {
  const [adding, setAdding] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);

  const update = useClientUpdate(clientId, { onPatched: onClientUpdated });

  const persist = async (next: SocialAccount[]) => {
    await update.mutateAsync({ social_accounts: next });
  };

  const handleAdd = async (acc: SocialAccount) => {
    await persist([...(accounts || []), acc]);
    setAdding(false);
  };

  const handleEdit = async (idx: number, acc: SocialAccount) => {
    const next = [...accounts];
    next[idx] = acc;
    await persist(next);
    setEditIdx(null);
  };

  const handleDelete = async (idx: number) => {
    const next = accounts.filter((_, i) => i !== idx);
    await persist(next);
  };

  return (
    <div className="space-y-1.5">
      {accounts.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground italic px-1">Δεν έχουν προστεθεί λογαριασμοί ακόμα.</p>
      )}

      {accounts.map((acc, i) => (
        editIdx === i ? (
          <RowForm
            key={i}
            initial={acc}
            onSubmit={(a) => handleEdit(i, a)}
            onCancel={() => setEditIdx(null)}
            saving={update.isPending}
          />
        ) : (
          <div
            key={i}
            className="flex items-center justify-between gap-2 py-2 px-3 rounded-xl bg-secondary/50 group"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="text-base shrink-0">{platformIcon(acc.platform)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground capitalize">{platformLabel(acc.platform)}</p>
                <p className="text-sm font-medium break-all">{acc.account_name || acc.url || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              {acc.url && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => openExternalUrl(acc.url)}
                  type="button"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              )}
              {canEdit && (
                <>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditIdx(i)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(i)}
                    disabled={update.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        )
      ))}

      {adding && (
        <RowForm
          onSubmit={handleAdd}
          onCancel={() => setAdding(false)}
          saving={update.isPending}
        />
      )}

      {canEdit && !adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full border-2 border-dashed border-border rounded-xl py-2.5 flex items-center justify-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors text-sm mt-1"
        >
          <Plus className="h-4 w-4" />
          Προσθήκη λογαριασμού
        </button>
      )}
    </div>
  );
}
