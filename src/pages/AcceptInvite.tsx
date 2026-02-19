import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import olsenyLogo from '@/assets/olseny-logo.png';

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, refreshUserData } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'login-required'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setStatus('login-required');
      return;
    }
    if (token) {
      acceptInvite();
    }
  }, [user, authLoading, token]);

  const acceptInvite = async () => {
    try {
      const { data, error } = await supabase.rpc('accept_invitation', { _token: token });
      if (error) throw error;
      const result = data as any;
      if (!result.success) {
        setErrorMsg(result.error);
        setStatus('error');
        return;
      }
      setStatus('success');
      toast.success('Πρόσκληση αποδεκτή!');
      await refreshUserData();
    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <img src={olsenyLogo} alt="Olseny" className="h-10 w-10 rounded-lg" />
          <span className="text-2xl font-bold text-foreground">OLSENY</span>
        </div>

        <Card className="border-border/40">
          <CardContent className="text-center py-12">
            {status === 'loading' && (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Αποδοχή πρόσκλησης...</p>
              </>
            )}
            {status === 'success' && (
              <>
                <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">Επιτυχία!</h2>
                <p className="text-muted-foreground mb-6">Η πρόσκληση έγινε αποδεκτή</p>
                <Button onClick={() => navigate('/', { replace: true })}>Μετάβαση στο workspace</Button>
              </>
            )}
            {status === 'error' && (
              <>
                <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">Σφάλμα</h2>
                <p className="text-muted-foreground mb-6">{errorMsg}</p>
                <Button variant="outline" onClick={() => navigate('/auth')}>Επιστροφή</Button>
              </>
            )}
            {status === 'login-required' && (
              <>
                <h2 className="text-xl font-semibold text-foreground mb-2">Συνδεθείτε πρώτα</h2>
                <p className="text-muted-foreground mb-6">Πρέπει να συνδεθείτε για να αποδεχθείτε την πρόσκληση</p>
                <Button onClick={() => navigate('/auth')}>Σύνδεση</Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
