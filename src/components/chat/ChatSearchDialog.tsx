import { useState } from 'react';
import { Search, MessageSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

interface SearchResult {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  created_at: string;
  channel_name: string;
  sender_name: string;
}

interface ChatSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (channelId: string, messageId: string) => void;
}

export default function ChatSearchDialog({ open, onOpenChange, onNavigate }: ChatSearchDialogProps) {
  const { companyRole } = useAuth();
  const companyId = companyRole?.company_id;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim() || !companyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('search_chat_messages', {
        _query: query.trim(),
        _company_id: companyId,
        _limit: 30,
      });
      if (error) throw error;
      setResults((data || []) as SearchResult[]);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Αναζήτηση μηνυμάτων</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Αναζήτηση σε όλα τα μηνύματα..."
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-80 overflow-y-auto space-y-1 mt-2">
          {loading && <p className="text-xs text-muted-foreground text-center py-4">Αναζήτηση...</p>}
          {!loading && results.length === 0 && query && (
            <p className="text-xs text-muted-foreground text-center py-4">Δεν βρέθηκαν αποτελέσματα</p>
          )}
          {results.map(r => (
            <button
              key={r.id}
              className="w-full text-left rounded-lg px-3 py-2 hover:bg-muted/30 transition-colors"
              onClick={() => { onNavigate(r.channel_id, r.id); onOpenChange(false); }}
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                <span className="font-medium">{r.channel_name}</span>
                <span>·</span>
                <span>{r.sender_name}</span>
                <span>·</span>
                <span>{format(new Date(r.created_at), 'dd MMM HH:mm', { locale: el })}</span>
              </div>
              <p className="text-sm mt-0.5 line-clamp-2">{r.content}</p>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
