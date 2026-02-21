import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Search, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface InboxEntityLinkerProps {
  threadId: string;
  messageId: string;
  onClose: () => void;
  onLinked: (link: any) => void;
}

interface SearchResult {
  id: string;
  name: string;
  sub?: string;
}

export function InboxEntityLinker({ threadId, messageId, onClose, onLinked }: InboxEntityLinkerProps) {
  const { user, companyRole } = useAuth();
  const companyId = companyRole?.company_id;
  const [tab, setTab] = useState<'client' | 'project' | 'task'>('client');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    if (!query || !companyId) { setResults([]); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      let data: SearchResult[] = [];
      if (tab === 'client') {
        const { data: clients } = await supabase
          .from('clients')
          .select('id, name, contact_email')
          .eq('company_id', companyId)
          .ilike('name', `%${query}%`)
          .limit(10);
        data = (clients || []).map(c => ({ id: c.id, name: c.name, sub: c.contact_email || undefined }));
      } else if (tab === 'project') {
        const { data: projects } = await supabase
          .from('projects')
          .select('id, name')
          .eq('company_id', companyId)
          .ilike('name', `%${query}%`)
          .limit(10);
        data = (projects || []).map(p => ({ id: p.id, name: p.name }));
      } else {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id, title')
          .ilike('title', `%${query}%`)
          .limit(10);
        data = (tasks || []).map(t => ({ id: t.id, name: t.title }));
      }
      setResults(data);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, tab, companyId]);

  const handleLink = async (entity: SearchResult) => {
    if (!user) return;
    setLinking(true);
    const { data, error } = await supabase
      .from('email_entity_links')
      .insert({
        email_message_id: messageId,
        thread_id: threadId,
        entity_type: tab,
        entity_id: entity.id,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        toast.info('Ήδη συνδεδεμένο');
      } else {
        toast.error('Σφάλμα σύνδεσης');
      }
    } else {
      toast.success(`Συνδέθηκε με ${entity.name}`);
      onLinked(data);
    }
    setLinking(false);
    onClose();
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Σύνδεση Email με...</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => { setTab(v as any); setQuery(''); setResults([]); }}>
          <TabsList className="w-full">
            <TabsTrigger value="client" className="flex-1">Πελάτης</TabsTrigger>
            <TabsTrigger value="project" className="flex-1">Έργο</TabsTrigger>
            <TabsTrigger value="task" className="flex-1">Task</TabsTrigger>
          </TabsList>
          <div className="mt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={`Αναζήτηση ${tab === 'client' ? 'πελάτη' : tab === 'project' ? 'έργου' : 'task'}...`}
                className="pl-9"
                autoFocus
              />
            </div>
          </div>
          <ScrollArea className="max-h-[250px] mt-2">
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-1">
                {results.map(r => (
                  <button
                    key={r.id}
                    onClick={() => handleLink(r)}
                    disabled={linking}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-sm"
                  >
                    <span className="font-medium">{r.name}</span>
                    {r.sub && <span className="text-xs text-muted-foreground ml-2">{r.sub}</span>}
                  </button>
                ))}
              </div>
            ) : query ? (
              <p className="text-center text-sm text-muted-foreground py-4">Δεν βρέθηκαν αποτελέσματα</p>
            ) : null}
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
