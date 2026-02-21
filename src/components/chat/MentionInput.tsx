import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { User, FolderKanban, CheckSquare, Mail } from 'lucide-react';

interface MentionSuggestion {
  id: string;
  type: 'user' | 'project' | 'task' | 'email';
  label: string;
  sub?: string;
}

interface MentionInputProps {
  query: string;
  position: { top: number; left: number };
  onSelect: (suggestion: MentionSuggestion) => void;
  onClose: () => void;
}

export default function MentionInput({ query, position, onSelect, onClose }: MentionInputProps) {
  const { companyRole } = useAuth();
  const companyId = companyRole?.company_id;
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!companyId || !query) { setSuggestions([]); return; }

    const fetchSuggestions = async () => {
      const results: MentionSuggestion[] = [];
      const q = query.toLowerCase();

      // Fetch users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(5);

      (profiles || []).forEach(p => {
        results.push({ id: p.id, type: 'user', label: p.full_name || p.email, sub: p.email });
      });

      // Fetch projects
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', companyId)
        .ilike('name', `%${q}%`)
        .limit(5);

      (projects || []).forEach(p => {
        results.push({ id: p.id, type: 'project', label: p.name });
      });

      // Fetch tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title')
        .ilike('title', `%${q}%`)
        .limit(5);

      (tasks || []).forEach(t => {
        results.push({ id: t.id, type: 'task', label: t.title });
      });

      // Fetch email threads
      const { data: emails } = await supabase
        .from('email_messages')
        .select('id, thread_id, subject, from_name, from_address')
        .ilike('subject', `%${q}%`)
        .order('sent_at', { ascending: false })
        .limit(5);

      const seenThreads = new Set<string>();
      (emails || []).forEach((e: any) => {
        const tid = e.thread_id || e.id;
        if (seenThreads.has(tid)) return;
        seenThreads.add(tid);
        results.push({ id: tid, type: 'email', label: e.subject || '(χωρίς θέμα)', sub: e.from_name || e.from_address || undefined });
      });

      setSuggestions(results);
      setSelectedIndex(0);
    };

    const timer = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(timer);
  }, [query, companyId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && suggestions.length > 0) {
        e.preventDefault();
        onSelect(suggestions[selectedIndex]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [suggestions, selectedIndex, onSelect, onClose]);

  if (suggestions.length === 0) return null;

  const typeIcon = (type: string) => {
    switch (type) {
      case 'user': return <User className="h-3.5 w-3.5 text-muted-foreground" />;
      case 'project': return <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />;
      case 'task': return <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />;
      case 'email': return <Mail className="h-3.5 w-3.5 text-muted-foreground" />;
      default: return null;
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute z-50 bg-popover border border-border/60 rounded-lg shadow-lg py-1 w-64 max-h-48 overflow-y-auto"
      style={{ bottom: position.top, left: position.left }}
    >
      {suggestions.map((s, i) => (
        <button
          key={`${s.type}-${s.id}`}
          className={cn(
            "flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left transition-colors",
            i === selectedIndex ? "bg-primary/10 text-primary" : "hover:bg-muted/40"
          )}
          onClick={() => onSelect(s)}
          onMouseEnter={() => setSelectedIndex(i)}
        >
          {typeIcon(s.type)}
          <div className="flex-1 min-w-0">
            <span className="truncate block font-medium">{s.label}</span>
            {s.sub && <span className="truncate block text-muted-foreground/60 text-[10px]">{s.sub}</span>}
          </div>
          <span className="text-[10px] text-muted-foreground/40 uppercase">{s.type}</span>
        </button>
      ))}
    </div>
  );
}

export type { MentionSuggestion };
