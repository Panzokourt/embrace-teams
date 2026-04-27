import { ReactNode, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface SettingsSection {
  id: string;
  label: string;
  icon: LucideIcon;
  group: string;
  description?: string;
  visible?: boolean;
  render: () => ReactNode;
}

interface SettingsLayoutProps {
  sections: SettingsSection[];
  defaultSectionId: string;
}

export function SettingsLayout({ sections, defaultSectionId }: SettingsLayoutProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const visibleSections = useMemo(
    () => sections.filter(s => s.visible !== false),
    [sections]
  );

  const activeId = searchParams.get('section') || defaultSectionId;
  const active = visibleSections.find(s => s.id === activeId) || visibleSections[0];

  const grouped = useMemo(() => {
    const map = new Map<string, SettingsSection[]>();
    visibleSections.forEach(s => {
      if (!map.has(s.group)) map.set(s.group, []);
      map.get(s.group)!.push(s);
    });
    return Array.from(map.entries());
  }, [visibleSections]);

  const setActive = (id: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('section', id);
      return next;
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
      {/* Mobile: dropdown selector */}
      <div className="lg:hidden">
        <Select value={active?.id} onValueChange={setActive}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {grouped.map(([group, items]) => (
              <div key={group}>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {group}
                </div>
                {items.map(item => (
                  <SelectItem key={item.id} value={item.id}>
                    <div className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop: left nav */}
      <aside className="hidden lg:block w-60 shrink-0">
        <nav className="sticky top-4 space-y-6 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
          {grouped.map(([group, items]) => (
            <div key={group}>
              <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group}
              </h3>
              <ul className="space-y-0.5">
                {items.map(item => {
                  const isActive = item.id === active?.id;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => setActive(item.id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left',
                          isActive
                            ? 'bg-accent text-accent-foreground font-medium'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <item.icon className={cn('h-4 w-4 shrink-0', isActive && 'text-primary')} />
                        <span className="truncate">{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Right content */}
      <main className="flex-1 min-w-0 max-w-3xl">
        {active && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <active.icon className="h-5 w-5 text-primary" />
                {active.label}
              </h2>
              {active.description && (
                <p className="text-sm text-muted-foreground mt-1">{active.description}</p>
              )}
            </div>
            <div className="space-y-6">{active.render()}</div>
          </div>
        )}
      </main>
    </div>
  );
}
