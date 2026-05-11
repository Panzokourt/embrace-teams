import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Shield, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const SCOPE_LABELS: Record<string, string> = {
  'tasks:read': 'Διάβασμα tasks',
  'tasks:write': 'Δημιουργία/τροποποίηση tasks',
  'projects:read': 'Διάβασμα projects',
  'clients:read': 'Διάβασμα πελατών',
  'time:read': 'Διάβασμα time tracking',
  'time:write': 'Καταγραφή χρόνου',
  'kb:read': 'Αναζήτηση στο Knowledge Base',
};

export default function McpConsent() {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const clientId = params.get('client_id') ?? '';
  const redirectUri = params.get('redirect_uri') ?? '';
  const codeChallenge = params.get('code_challenge') ?? '';
  const state = params.get('state') ?? '';
  const requested = (params.get('scope') ?? 'tasks:read tasks:write projects:read clients:read time:read time:write kb:read').split(/\s+/).filter(Boolean);

  const [clientName, setClientName] = useState<string>('');
  const [granted, setGranted] = useState<Set<string>>(new Set(requested));

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('mcp_oauth_clients')
        .select('client_name').eq('client_id', clientId).maybeSingle();
      setClientName(data?.client_name ?? clientId);
    })();
  }, [clientId]);

  useEffect(() => {
    if (!loading && !user) {
      const ret = encodeURIComponent(window.location.pathname + window.location.search);
      navigate(`/auth?redirect=${ret}`, { replace: true });
    }
  }, [loading, user, navigate]);

  if (loading || !user) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /></div>;
  }

  const toggle = (s: string) => {
    setGranted(prev => {
      const n = new Set(prev);
      n.has(s) ? n.delete(s) : n.add(s);
      return n;
    });
  };

  const approve = async () => {
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mcp-oauth-authorize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          client_id: clientId,
          redirect_uri: redirectUri,
          code_challenge: codeChallenge,
          scopes: Array.from(granted),
          state,
        }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error_description || json.error || 'Authorization failed');
      window.location.href = json.redirect_url;
    } catch (e: any) {
      toast.error(e?.message ?? 'Σφάλμα');
      setSubmitting(false);
    }
  };

  const deny = () => {
    const u = new URL(redirectUri);
    u.searchParams.set('error', 'access_denied');
    if (state) u.searchParams.set('state', state);
    window.location.href = u.toString();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="max-w-md w-full p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Εξουσιοδότηση πρόσβασης</h1>
            <p className="text-sm text-muted-foreground">Η εφαρμογή <span className="font-medium text-foreground">{clientName}</span> ζητά πρόσβαση στον χώρο εργασίας σας</p>
          </div>
        </div>

        <div className="rounded-lg border p-3 space-y-2.5">
          <p className="text-xs uppercase text-muted-foreground flex items-center gap-1.5"><Shield className="h-3 w-3" /> Δικαιώματα</p>
          {requested.map(s => (
            <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={granted.has(s)} onCheckedChange={() => toggle(s)} />
              <span>{SCOPE_LABELS[s] ?? s}</span>
            </label>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Μπορείς να ανακαλέσεις την πρόσβαση οποιαδήποτε στιγμή από Ρυθμίσεις → Συνδεδεμένες εφαρμογές.
        </p>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={deny} disabled={submitting}>Άρνηση</Button>
          <Button className="flex-1" onClick={approve} disabled={submitting || granted.size === 0}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Εξουσιοδότηση'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
