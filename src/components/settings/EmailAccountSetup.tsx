import { useState, useEffect, useRef } from 'react';
import { useGmailAccount } from '@/hooks/useGmailAccount';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Loader2, Trash2, Plug, CheckCircle2, LogIn } from 'lucide-react';

export function EmailAccountSetup() {
  const { account, loading, startOAuth, disconnectAccount, testConnection, refetch } = useGmailAccount();
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const pollRef = useRef<{ interval: ReturnType<typeof setInterval>; timeout: ReturnType<typeof setTimeout> } | null>(null);

  // Listen for OAuth completion from popup
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'gmail-oauth-complete' && event.data?.success) {
        stopPolling();
        setConnecting(false);
        refetch();
      }
    };
    window.addEventListener('message', handler);
    return () => {
      window.removeEventListener('message', handler);
      stopPolling();
    };
  }, [refetch]);

  // Stop polling when account appears
  useEffect(() => {
    if (account && connecting) {
      stopPolling();
      setConnecting(false);
    }
  }, [account, connecting]);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current.interval);
      clearTimeout(pollRef.current.timeout);
      pollRef.current = null;
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    const url = await startOAuth();
    if (url) {
      window.open(url, '_blank');
      const interval = setInterval(async () => {
        await refetch();
      }, 4000);
      const timeout = setTimeout(() => {
        stopPolling();
        setConnecting(false);
      }, 120000);
      pollRef.current = { interval, timeout };
    } else {
      setConnecting(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    await testConnection();
    setTesting(false);
  };

  const handleDisconnect = async () => {
    if (confirm('Είστε σίγουροι ότι θέλετε να αποσυνδέσετε τον λογαριασμό Gmail;')) {
      await disconnectAccount();
    }
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          <CardTitle>Email / Inbox</CardTitle>
          {account && (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Συνδεδεμένο
            </Badge>
          )}
        </div>
        <CardDescription>
          Συνδέστε τον Gmail λογαριασμό σας για να βλέπετε και να στέλνετε emails μέσα από την εφαρμογή
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {account ? (
          <>
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="font-medium">{account.email_address}</span>
              </div>
              {account.display_name && (
                <p className="text-sm text-muted-foreground">{account.display_name}</p>
              )}
              {account.last_sync_at && (
                <p className="text-xs text-muted-foreground">
                  Τελευταίος συγχρονισμός: {new Date(account.last_sync_at).toLocaleString('el-GR')}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Button variant="outline" onClick={handleTest} disabled={testing}>
                {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plug className="h-4 w-4 mr-2" />}
                Δοκιμή Σύνδεσης
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDisconnect}>
                <Trash2 className="h-4 w-4 mr-2" />
                Αποσύνδεση
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground space-y-2">
              <p>Πατήστε το κουμπί παρακάτω για να συνδεθείτε με τον λογαριασμό Gmail σας μέσω OAuth2.</p>
              <p>Θα ζητηθεί πρόσβαση για ανάγνωση και αποστολή emails.</p>
            </div>

            <Button onClick={handleConnect} disabled={connecting} size="lg">
              {connecting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <LogIn className="h-4 w-4 mr-2" />
              )}
              Σύνδεση με Gmail
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
