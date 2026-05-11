import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plug, Trash2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface TokenRow {
  id: string;
  client_id: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  access_token_expires_at: string;
}
interface ClientRow { client_id: string; client_name: string }
interface AuditRow { id: string; tool_name: string; status: string; created_at: string; client_id: string | null }

export function McpIntegrationSection() {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [clients, setClients] = useState<Record<string, string>>({});
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const SERVER_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mcp-server`;

  const load = async () => {
    setLoading(true);
    const [{ data: t }, { data: c }, { data: a }] = await Promise.all([
      supabase.from('mcp_oauth_tokens').select('id,client_id,scopes,created_at,last_used_at,access_token_expires_at').is('revoked_at', null).order('created_at', { ascending: false }),
      supabase.from('mcp_oauth_clients').select('client_id,client_name'),
      supabase.from('mcp_audit_log').select('id,tool_name,status,created_at,client_id').order('created_at', { ascending: false }).limit(20),
    ]);
    setTokens((t as TokenRow[]) ?? []);
    setClients(Object.fromEntries(((c as ClientRow[]) ?? []).map(x => [x.client_id, x.client_name])));
    setAudit((a as AuditRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const revoke = async (id: string) => {
    const { error } = await supabase.from('mcp_oauth_tokens').update({ revoked_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Η πρόσβαση ανακλήθηκε');
    load();
  };

  const copy = () => {
    navigator.clipboard.writeText(SERVER_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Plug className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">MCP Server URL</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Χρησιμοποιήστε αυτό το URL στο Claude Desktop, Cursor ή οποιοδήποτε MCP client. Η σύνδεση γίνεται αυτόματα μέσω OAuth.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-md break-all">{SERVER_URL}</code>
          <Button size="sm" variant="outline" onClick={copy}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Οδηγίες για Claude Desktop</summary>
          <pre className="mt-2 bg-muted p-3 rounded-md overflow-x-auto">{`// claude_desktop_config.json
{
  "mcpServers": {
    "olseny": {
      "url": "${SERVER_URL}"
    }
  }
}`}</pre>
        </details>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-3">Συνδεδεμένες εφαρμογές</h3>
        {tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Καμία ενεργή σύνδεση.</p>
        ) : (
          <div className="space-y-2">
            {tokens.map(t => (
              <div key={t.id} className="flex items-center justify-between gap-3 border rounded-md p-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{clients[t.client_id] ?? t.client_id}</p>
                  <p className="text-xs text-muted-foreground">
                    Συνδέθηκε {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                    {t.last_used_at && ` · Τελευταία χρήση ${formatDistanceToNow(new Date(t.last_used_at), { addSuffix: true })}`}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {t.scopes.map(s => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => revoke(t.id)} className="text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-3">Πρόσφατη δραστηριότητα</h3>
        {audit.length === 0 ? (
          <p className="text-sm text-muted-foreground">Καμία δραστηριότητα.</p>
        ) : (
          <div className="space-y-1.5 text-sm">
            {audit.map(a => (
              <div key={a.id} className="flex items-center justify-between text-xs border-b last:border-0 py-1.5">
                <span className="font-mono">{a.tool_name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={a.status === 'success' ? 'secondary' : 'destructive'} className="text-[10px]">{a.status}</Badge>
                  <span className="text-muted-foreground">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
