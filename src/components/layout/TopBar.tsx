import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FolderKanban, CheckSquare, FileText, Users, PanelRightOpen, PanelRightClose, BookUser, Zap, Menu, Timer, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import WorkDayClock from '@/components/topbar/WorkDayClock';
import { useFocusMode } from '@/contexts/FocusContext';
import { useAuth } from '@/contexts/AuthContext';
import { XPBadge } from '@/components/gamification/XPBadge';
import { useLayout } from '@/contexts/LayoutContext';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface SearchResult {
  id: string;
  name: string;
  type: 'project' | 'task' | 'tender' | 'client' | 'contact';
}

const entityConfig = {
  project: { icon: FolderKanban, path: '/projects/', label: 'Projects', color: 'text-blue-500' },
  task: { icon: CheckSquare, path: '/tasks', label: 'Tasks', color: 'text-green-500' },
  tender: { icon: FileText, path: '/tenders/', label: 'Tenders', color: 'text-orange-500' },
  client: { icon: Users, path: '/clients/', label: 'Clients', color: 'text-purple-500' },
  contact: { icon: BookUser, path: '/contacts/', label: 'Contacts', color: 'text-teal-500' },
};

interface TopBarProps {
  onPanelToggle: () => void;
  rightPanelOpen?: boolean;
  onMobileMenuToggle?: () => void;
  showHamburger?: boolean;
}

export default function TopBar({ onPanelToggle, rightPanelOpen, onMobileMenuToggle, showHamburger }: TopBarProps) {
  const navigate = useNavigate();
  const { enterFocus } = useFocusMode();
  const { user } = useAuth();
  const { layoutState } = useLayout();
  const { activeTimer, elapsed, formatElapsed, stopTimer } = useTimeTracking();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const isNarrow = layoutState === 'narrow' || layoutState === 'mobile';
  const isMobile = layoutState === 'mobile';

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
    if (!q || q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const searchTerm = `%${q}%`;
      const [projects, tasks, tenders, clients, contactsRes] = await Promise.all([
        supabase.from('projects').select('id, name').ilike('name', searchTerm).limit(5),
        supabase.from('tasks').select('id, title').ilike('title', searchTerm).limit(5),
        supabase.from('tenders').select('id, name').ilike('name', searchTerm).limit(5),
        supabase.from('clients').select('id, name').ilike('name', searchTerm).limit(5),
        supabase.from('contacts').select('id, name').ilike('name', searchTerm).limit(5)
      ]);
      const mapped: SearchResult[] = [
        ...(projects.data || []).map((p) => ({ id: p.id, name: p.name, type: 'project' as const })),
        ...(tasks.data || []).map((t) => ({ id: t.id, name: t.title, type: 'task' as const })),
        ...(tenders.data || []).map((t) => ({ id: t.id, name: t.name, type: 'tender' as const })),
        ...(clients.data || []).map((c) => ({ id: c.id, name: c.name, type: 'client' as const })),
        ...(contactsRes.data || []).map((c) => ({ id: c.id, name: c.name, type: 'contact' as const }))
      ];
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
    <div className="sticky top-0 z-20 h-12 border-b border-border/40 bg-card/80 backdrop-blur-lg px-3 md:px-4 flex items-center gap-3 shrink-0">
      {/* Hamburger for mobile */}
      {showHamburger && (
        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={onMobileMenuToggle}>
          <Menu className="h-4 w-4" />
        </Button>
      )}

      {/* Work Day Clock — hidden on mobile */}
      {!isMobile && <WorkDayClock compact={isNarrow} />}

      {/* Active Timer Indicator */}
      {activeTimer?.is_running && (
        <>
          <div className="w-px h-5 bg-border/50 shrink-0" />
          <div className="flex items-center gap-1.5 shrink-0">
            <Timer className="h-3.5 w-3.5 text-primary animate-pulse shrink-0" />
            <button
              onClick={() => activeTimer.task_id && navigate(`/tasks/${activeTimer.task_id}`)}
              className="text-xs font-mono font-semibold text-primary hover:underline cursor-pointer"
            >
              {formatElapsed(elapsed)}
            </button>
            {!isNarrow && (
              <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                {(activeTimer as any)?.task?.title || ''}
              </span>
            )}
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:bg-destructive/10"
                  onClick={(e) => { e.stopPropagation(); stopTimer(); }}
                >
                  <Square className="h-3 w-3 fill-current" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Σταμάτημα Timer</TooltipContent>
            </Tooltip>
          </div>
        </>
      )}

      {!isMobile && <div className="w-px h-5 bg-border/50 shrink-0" />}

      {/* Search */}
      <div className="flex-1 min-w-0 max-w-xl">
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <button
              className="flex h-8 w-full items-center gap-2 rounded-lg border border-border/60 px-2.5 text-xs transition-colors focus:outline-none bg-muted text-muted-foreground hover:bg-muted/80 min-w-0"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              {!isMobile && (
                <span className="truncate text-xs">{isNarrow ? 'Αναζήτηση...' : 'Αναζήτηση projects, tasks...'}</span>
              )}
              {!isNarrow && (
                <kbd className="ml-auto hidden rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground md:inline shrink-0">
                  ⌘K
                </kbd>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[300px] p-0" align="start" sideOffset={8}>
            <Command shouldFilter={false}>
              <CommandInput placeholder="Αναζήτηση σε projects, tasks, tenders, clients..." value={query} onValueChange={onQueryChange} />
              <CommandList>
                {query.length >= 2 && !loading && results.length === 0 && <CommandEmpty>Δεν βρέθηκαν αποτελέσματα.</CommandEmpty>}
                {loading && <div className="py-4 text-center text-sm text-muted-foreground">Αναζήτηση...</div>}
                {Object.entries(grouped).map(([type, items]) => {
                  const config = entityConfig[type as keyof typeof entityConfig];
                  const Icon = config.icon;
                  return (
                    <CommandGroup key={type} heading={config.label}>
                      {items.map((item) => (
                        <CommandItem key={item.id} onSelect={() => handleSelect(item)} className="cursor-pointer">
                          <Icon className={`mr-2 h-4 w-4 ${config.color}`} />
                          <span className="truncate">{item.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  );
                })}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* XP Badge — hide on mobile */}
        {!isMobile && <XPBadge userId={user?.id} size="sm" showXP={!isNarrow} />}

        {/* Work Mode */}
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => enterFocus()}
              className={cn(
                "gap-1.5 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 hover:from-violet-600/30 hover:to-fuchsia-600/30 text-violet-400 hover:text-violet-300 border border-violet-500/20 h-8 px-2.5",
                isNarrow && "px-2"
              )}
            >
              <Zap className="h-3.5 w-3.5 shrink-0" />
              {!isNarrow && <span className="text-xs font-semibold">Work Mode</span>}
            </Button>
          </TooltipTrigger>
          {isNarrow && <TooltipContent>Work Mode</TooltipContent>}
        </Tooltip>

        {/* Panel toggle */}
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onPanelToggle}
              className={cn("h-8 w-8 shrink-0", rightPanelOpen && "bg-secondary")}
            >
              {rightPanelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Panel (⌘J)</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
