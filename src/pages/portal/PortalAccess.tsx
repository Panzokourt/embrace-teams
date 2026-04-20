import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

type Stage = 'loading' | 'pin' | 'signing-in' | 'error';

export default function PortalAccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const errorParam = params.get('error');

  const [stage, setStage] = useState<Stage>(errorParam ? 'error' : 'loading');
  const [errorMsg, setErrorMsg] = useState<string>(
    errorParam === 'no_access' ? 'Δεν έχετε πρόσβαση σε αυτό το portal.' : ''
  );
  const [pin, setPin] = useState('');
  const [clientName, setClientName] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const exchange = async (pinValue?: string) => {
    if (!token) {
      setStage('error');
      setErrorMsg('Λείπει το token πρόσβασης.');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('portal-token-exchange', {
        body: { token, pin: pinValue || undefined },
      });

      if (error) throw error;

      if (data?.requires_pin) {
        setClientName(data.client_name || '');
        setStage('pin');
        setSubmitting(false);
        return;
      }

      if (data?.error) {
        const map: Record<string, string> = {
          invalid_token: 'Μη έγκυρος σύνδεσμος.',
          expired: 'Ο σύνδεσμος έχει λήξει. Ζητήστε νέα πρόσκληση.',
          revoked: 'Ο σύνδεσμος δεν είναι πλέον ενεργός.',
          wrong_pin: 'Λάθος PIN. Δοκιμάστε ξανά.',
          locked: 'Πάρα πολλές αποτυχημένες προσπάθειες. Δοκιμάστε ξανά αργότερα.',
        };
        if (data.error === 'wrong_pin') {
          toast.error(map.wrong_pin);
          setPin('');
          setSubmitting(false);
          return;
        }
        setStage('error');
        setErrorMsg(map[data.error] || 'Δεν ήταν δυνατή η είσοδος.');
        setSubmitting(false);
        return;
      }

      if (data?.access_token && data?.refresh_token) {
        setStage('signing-in');
        const { error: sessionErr } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        if (sessionErr) throw sessionErr;
        navigate('/portal', { replace: true });
        return;
      }

      throw new Error('Απρόσμενη απάντηση από τον διακομιστή.');
    } catch (e: any) {
      console.error(e);
      setStage('error');
      setErrorMsg(e?.message || 'Σφάλμα κατά την είσοδο.');
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (token && !errorParam) exchange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Olseny Client Portal</h1>
            <p className="text-xs text-muted-foreground">Ασφαλής πρόσβαση πελάτη</p>
          </div>
        </div>

        {stage === 'loading' && (
          <div className="flex flex-col items-center py-8 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Επαλήθευση πρόσβασης...</p>
          </div>
        )}

        {stage === 'signing-in' && (
          <div className="flex flex-col items-center py-8 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm">Σύνδεση στο portal...</p>
          </div>
        )}

        {stage === 'pin' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (pin.length === 6) exchange(pin);
            }}
            className="space-y-4"
          >
            <div>
              <h2 className="text-sm font-medium mb-1">
                {clientName ? `Καλωσήρθατε στο portal — ${clientName}` : 'Εισάγετε τον κωδικό σας'}
              </h2>
              <p className="text-xs text-muted-foreground">
                Πληκτρολογήστε τον 6-ψήφιο κωδικό που λάβατε στο email.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">PIN</Label>
              <Input
                id="pin"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                className="text-center text-2xl tracking-[0.5em] font-mono"
                autoFocus
              />
            </div>
            <Button type="submit" disabled={pin.length !== 6 || submitting} className="w-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Είσοδος'}
            </Button>
          </form>
        )}

        {stage === 'error' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Δεν ήταν δυνατή η είσοδος</p>
                <p className="text-xs text-muted-foreground">{errorMsg}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Επικοινωνήστε με την ομάδα που σας προσκάλεσε για νέα πρόσβαση.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
