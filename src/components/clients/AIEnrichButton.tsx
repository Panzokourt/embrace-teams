import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AIEnrichDialog, type EnrichSuggestion } from './AIEnrichDialog';

interface Props {
  clientId: string;
  website?: string | null;
  taxId?: string | null;
  clientName?: string;
  size?: 'sm' | 'icon';
  label?: string;
  onApplied?: () => void;
}

export function AIEnrichButton({ clientId, website, taxId, clientName, size = 'icon', label, onApplied }: Props) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<EnrichSuggestion[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | undefined>();

  const run = async () => {
    if (!website && !taxId && !clientName) {
      toast.error('Χρειάζεται website, ΑΦΜ ή όνομα για AI lookup');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-client', {
        body: { clientId, website, taxId, clientName },
      });
      if (error) throw error;
      const incomingSuggestions: EnrichSuggestion[] = data?.suggestions || [];
      const incomingLogo: string | undefined = data?.logoUrl;
      if (!incomingSuggestions.length && !incomingLogo) {
        toast.info('Δεν βρέθηκαν προτάσεις');
        return;
      }
      setSuggestions(incomingSuggestions);
      setLogoUrl(incomingLogo);
      setOpen(true);
    } catch (e: any) {
      const msg = e?.message || 'AI enrichment απέτυχε';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {size === 'icon' ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={run}
          disabled={loading}
          title="AI Enrich — αυτόματη συμπλήρωση"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-primary" />}
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={run} disabled={loading} className="gap-1">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {label || 'AI Enrich'}
        </Button>
      )}

      <AIEnrichDialog
        open={open}
        onOpenChange={setOpen}
        clientId={clientId}
        suggestions={suggestions}
        logoUrl={logoUrl}
        onApplied={onApplied}
      />
    </>
  );
}
