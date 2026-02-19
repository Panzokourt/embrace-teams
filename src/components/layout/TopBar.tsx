import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Activity, FolderKanban, CheckSquare, FileText, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';

interface SearchResult {
  id: string;
  name: string;
  type: 'project' | 'task' | 'tender' | 'client';
}

const entityConfig = {
  project: { icon: FolderKanban, path: '/projects/', label: 'Projects', color: 'text-blue-500' },
  task: { icon: CheckSquare, path: '/tasks', label: 'Tasks', color: 'text-green-500' },
  tender: { icon: FileText, path: '/tenders/', label: 'Tenders', color: 'text-orange-500' },
  client: { icon: Users, path: '/clients/', label: 'Clients', color: 'text-purple-500' }
};

interface TopBarProps {
  onActivityToggle: () => void;
}

export default function TopBar({ onActivityToggle }: TopBarProps) {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const performSearch = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const searchTerm = `%${q}%`;
      const [projects, tasks, tenders, clients] = await Promise.all([
      supabase.from('projects').select('id, name').ilike('name', searchTerm).limit(5),
      supabase.from('tasks').select('id, title').ilike('title', searchTerm).limit(5),
      supabase.from('tenders').select('id, name').ilike('name', searchTerm).limit(5),
      supabase.from('clients').select('id, name').ilike('name', searchTerm).limit(5)]
      );

      const mapped: SearchResult[] = [
      ...(projects.data || []).map((p) => ({ id: p.id, name: p.name, type: 'project' as const })),
      ...(tasks.data || []).map((t) => ({ id: t.id, name: t.title, type: 'task' as const })),
      ...(tenders.data || []).map((t) => ({ id: t.id, name: t.name, type: 'tender' as const })),
      ...(clients.data || []).map((c) => ({ id: c.id, name: c.name, type: 'client' as const }))];

      setResults(mapped);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const onQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(value), 300);
  };

  const handleSelect = (result: SearchResult) => {
    const config = entityConfig[result.type];
    const path = result.type === 'task' ? config.path : `${config.path}${result.id}`;
    navigate(path);
    setSearchOpen(false);
    setQuery('');
    setResults([]);
  };

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  return (
    <div className="sticky top-0 z-20 h-14 gap-2 border-b bg-background/80 backdrop-blur-lg md:px-6 mx-0 flex items-center justify-center my-0 px-0 py-[10px]">
      {/* Search */}
      <div className="flex-1 max-w-xl">
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <button
              className="flex h-9 w-full items-center gap-2 rounded-lg border border-border/60 bg-secondary/30 px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary/50 focus:outline-none"
              onClick={() => setSearchOpen(true)}>

              <Search className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Αναζήτηση projects, tasks...</span>
              <span className="sm:hidden">Αναζήτηση...</span>
              <kbd className="ml-auto hidden rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground md:inline">
                ⌘K
              </kbd>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" sideOffset={8}>
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Αναζήτηση σε projects, tasks, tenders, clients..."
                value={query}
                onValueChange={onQueryChange} />

              <CommandList>
                {query.length >= 2 && !loading && results.length === 0 &&
                <CommandEmpty>Δεν βρέθηκαν αποτελέσματα.</CommandEmpty>
                }
                {loading &&
                <div className="py-4 text-center text-sm text-muted-foreground">Αναζήτηση...</div>
                }
                {Object.entries(grouped).map(([type, items]) => {
                  const config = entityConfig[type as keyof typeof entityConfig];
                  const Icon = config.icon;
                  return (
                    <CommandGroup key={type} heading={config.label}>
                      {items.map((item) =>
                      <CommandItem
                        key={item.id}
                        onSelect={() => handleSelect(item)}
                        className="cursor-pointer">

                          <Icon className={`mr-2 h-4 w-4 ${config.color}`} />
                          <span className="truncate">{item.name}</span>
                        </CommandItem>
                      )}
                    </CommandGroup>);

                })}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Action icons */}
      <div className="gap-1 px-0 flex items-center justify-end">
        <Button variant="ghost" size="icon" onClick={onActivityToggle}>
          <Activity className="h-5 w-5" />
        </Button>
        <NotificationBell />
      </div>
    </div>);

}