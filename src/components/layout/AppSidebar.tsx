import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  LayoutDashboard, LayoutList, FileText, FolderKanban, CheckSquare, Users,
  DollarSign, Settings, LogOut, Zap, ChevronLeft, ChevronRight, UserCog, Building2,
  Moon, Sun, CalendarDays, FileArchive, Timer, FileStack, BarChart3,
  Plus, Palette, Monitor, Globe, Calendar, MessageSquare, BookUser,
  Briefcase, Mail, Trophy, ShieldCheck, BookOpen,
} from 'lucide-react';
import { briefDefinitions, getBriefDefinition } from '@/components/blueprints/briefDefinitions';
import { BriefFormDialog } from '@/components/blueprints/BriefFormDialog';
import { PermissionType } from '@/contexts/AuthContext';
import olsenyLogo from '@/assets/olseny-logo.png';
import { ActiveTimerIndicator } from '@/components/time-tracking/ActiveTimerIndicator';
import { SidebarNavGroup, SidebarSubLink } from '@/components/layout/SidebarNavGroup';
import { SidebarProjectTree } from '@/components/layout/SidebarProjectTree';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: PermissionType;
  adminOnly?: boolean;
}

type CategoryId = 'overview' | 'work' | 'clients' | 'communication' | 'revenue' | 'operations' | 'intelligence' | 'governance' | 'settings';

interface Category {
  id: CategoryId;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  routePrefixes: string[];
}

const categories: Category[] = [
  { id: 'overview', icon: LayoutDashboard, label: 'Overview', routePrefixes: ['/my-work', '/'] },
  { id: 'work', icon: Briefcase, label: 'Work', routePrefixes: ['/work', '/projects', '/tasks', '/calendar', '/files', '/blueprints', '/campaigns', '/backlog'] },
  { id: 'clients', icon: Building2, label: 'Clients', routePrefixes: ['/clients', '/contacts'] },
  { id: 'communication', icon: MessageSquare, label: 'Communication', routePrefixes: ['/chat', '/inbox'] },
  { id: 'revenue', icon: DollarSign, label: 'Revenue', routePrefixes: ['/financials', '/pricing'] },
  { id: 'operations', icon: Users, label: 'Operations', routePrefixes: ['/hr', '/timesheets', '/knowledge', '/operations'] },
  { id: 'intelligence', icon: BarChart3, label: 'Intelligence', routePrefixes: ['/reports', '/leaderboard', '/secretary', '/intelligence'] },
  { id: 'governance', icon: ShieldCheck, label: 'Governance', routePrefixes: ['/governance'] },
  { id: 'settings', icon: Settings, label: 'Settings', routePrefixes: ['/settings'] },
];

const categoryNavItems: Record<CategoryId, NavItem[]> = {
  overview: [
    { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  ],
  work: [],
  clients: [
    { title: 'All Clients', href: '/clients', icon: Building2, permission: 'clients.view' },
    { title: 'Contacts', href: '/contacts', icon: BookUser },
  ],
  communication: [
    { title: 'Chat', href: '/chat', icon: MessageSquare },
    { title: 'Inbox', href: '/inbox', icon: Mail },
  ],
  revenue: [
    { title: 'Dashboard', href: '/financials?tab=dashboard', icon: LayoutDashboard, permission: 'financials.view' },
    { title: 'Services', href: '/financials?tab=services', icon: FileText, permission: 'financials.view' },
    { title: 'Contracts', href: '/financials?tab=contracts', icon: FileText, permission: 'financials.view' },
    { title: 'Pricing', href: '/pricing', icon: DollarSign },
    { title: 'Invoices', href: '/financials?tab=invoices', icon: FileText, permission: 'financials.view' },
    { title: 'Expenses', href: '/financials?tab=expenses', icon: DollarSign, permission: 'financials.view' },
    { title: 'Profitability', href: '/financials?tab=reports', icon: BarChart3, permission: 'financials.view' },
  ],
  operations: [
    { title: 'Team & HR', href: '/hr', icon: UserCog },
    { title: 'Timesheets', href: '/timesheets', icon: Timer },
    { title: 'Capacity', href: '/operations/capacity', icon: Users },
    { title: 'Resource Planning', href: '/operations/resource-planning', icon: CalendarDays },
    { title: 'Knowledge Base', href: '/knowledge', icon: BookOpen },
    { title: 'Playbook', href: '/knowledge/playbook', icon: FileText },
    { title: 'Templates & SOPs', href: '/knowledge/templates', icon: FileStack },
    { title: 'Review Queue', href: '/knowledge/reviews', icon: CheckSquare },
  ],
  intelligence: [
    { title: 'Reports Hub', href: '/reports', icon: BarChart3, permission: 'financials.view' },
    { title: 'Performance', href: '/intelligence/performance', icon: BarChart3 },
    { title: 'Cross-client Insights', href: '/intelligence/insights', icon: BarChart3 },
    { title: 'Benchmarks', href: '/intelligence/benchmarks', icon: BarChart3 },
    { title: 'Forecasting', href: '/intelligence/forecasting', icon: BarChart3 },
    { title: 'Media Planning', href: '/intelligence/media-planning', icon: BarChart3 },
    { title: 'AI Insights', href: '/intelligence/ai-insights', icon: Zap },
    { title: 'Leaderboard', href: '/leaderboard', icon: Trophy },
    { title: 'Secretary AI', href: '/secretary', icon: Zap },
  ],
  governance: [
    { title: 'Dashboard', href: '/governance', icon: ShieldCheck },
    { title: 'Digital Assets', href: '/governance/assets', icon: Globe },
    { title: 'Access Control', href: '/governance/access', icon: UserCog },
    { title: 'Vault', href: '/governance/vault', icon: FileArchive },
    { title: 'Compliance', href: '/governance/compliance', icon: FileText },
    { title: 'Integrations', href: '/governance/integrations', icon: Globe },
    { title: 'Audit Log', href: '/governance/audit-log', icon: FileText },
    { title: 'Ownership Map', href: '/governance/ownership-map', icon: Globe },
  ],
  settings: [
    { title: 'General', href: '/settings', icon: Settings, permission: 'settings.company' },
    { title: 'Organization', href: '/settings/organization', icon: Building2, permission: 'settings.company' },
    { title: 'Roles & Permissions', href: '/settings/roles', icon: UserCog, permission: 'settings.company' },
    { title: 'Billing', href: '/settings/billing', icon: DollarSign, permission: 'settings.company' },
    { title: 'API Keys', href: '/settings/api-keys', icon: Settings, permission: 'settings.company' },
    { title: 'Webhooks', href: '/settings/webhooks', icon: Settings, permission: 'settings.company' },
    { title: 'Branding', href: '/settings/branding', icon: Settings, permission: 'settings.company' },
    { title: 'Feature Flags', href: '/settings/feature-flags', icon: Settings, permission: 'settings.company' },
  ],
};

function detectCategory(pathname: string): CategoryId {
  if (pathname.startsWith('/work') || pathname.startsWith('/projects') || pathname.startsWith('/tasks') || pathname.startsWith('/calendar') || pathname.startsWith('/files') || pathname.startsWith('/blueprints') || pathname.startsWith('/campaigns') || pathname.startsWith('/backlog')) return 'work';
  if (pathname.startsWith('/clients') || pathname.startsWith('/contacts')) return 'clients';
  if (pathname.startsWith('/chat') || pathname.startsWith('/inbox')) return 'communication';
  if (pathname.startsWith('/financials') || pathname.startsWith('/pricing')) return 'revenue';
  if (pathname.startsWith('/hr') || pathname.startsWith('/timesheets') || pathname.startsWith('/knowledge') || pathname.startsWith('/operations')) return 'operations';
  if (pathname.startsWith('/reports') || pathname.startsWith('/leaderboard') || pathname.startsWith('/secretary') || pathname.startsWith('/intelligence')) return 'intelligence';
  if (pathname.startsWith('/governance')) return 'governance';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname === '/my-work' || pathname === '/') return 'overview';
  return 'overview';
}

const briefIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Palette, Monitor, FileText, Globe, Calendar, MessageSquare,
};

export default function AppSidebar({
  collapsed,
  onToggleCollapse,
  forceCollapsed,
  isMobileSheet,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  forceCollapsed?: boolean;
  isMobileSheet?: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, roles, signOut, isAdmin, isManager, isClient, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [selectedBriefType, setSelectedBriefType] = useState<string | null>(null);

  // Flyout state for collapsed/rail mode
  const [flyoutCategory, setFlyoutCategory] = useState<CategoryId | null>(null);
  const flyoutTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const detectedCategory = useMemo(() => detectCategory(location.pathname), [location.pathname]);
  const [activeCategory, setActiveCategory] = useState<CategoryId>(detectedCategory);

  useMemo(() => {
    setActiveCategory(detectCategory(location.pathname));
  }, [location.pathname]);

  const selectedDef = selectedBriefType ? getBriefDefinition(selectedBriefType) : null;
  const isEffectivelyCollapsed = collapsed || forceCollapsed;

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const canAccess = (item: NavItem) => {
    if (isSuperAdmin || isCompanyAdmin) return true;
    if (item.adminOnly) return isAdmin || isManager;
    if (item.permission) return hasPermission(item.permission);
    return true;
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  // ClickUp-like: In collapsed mode, clicking opens ephemeral flyout (not permanent expand)
  const handleCategoryClick = useCallback((catId: CategoryId) => {
    if (isEffectivelyCollapsed && !isMobileSheet) {
      // Open flyout without changing collapsed state
      setFlyoutCategory(prev => prev === catId ? null : catId);
      setActiveCategory(catId);
    } else {
      setActiveCategory(catId);
    }
  }, [isEffectivelyCollapsed, isMobileSheet]);

  // Flyout mouse management
  const handleFlyoutEnter = useCallback(() => {
    if (flyoutTimeoutRef.current) {
      clearTimeout(flyoutTimeoutRef.current);
      flyoutTimeoutRef.current = undefined;
    }
  }, []);

  const handleFlyoutLeave = useCallback(() => {
    flyoutTimeoutRef.current = setTimeout(() => {
      setFlyoutCategory(null);
    }, 200);
  }, []);

  // Close flyout on Escape
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && flyoutCategory) {
      setFlyoutCategory(null);
    }
  }, [flyoutCategory]);

  // Close flyout on navigation
  const handleNavClick = useCallback(() => {
    setFlyoutCategory(null);
  }, []);

  // Close flyout on outside click (Escape key handled via onKeyDown on container)
  useEffect(() => {
    if (!flyoutCategory) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFlyoutCategory(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [flyoutCategory]);

  // ─── Icon Rail ───
  const IconRail = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div
      className="flex flex-col items-center py-3 gap-1 border-r border-border/30 bg-card/80 shrink-0 w-12"
      onMouseEnter={handleFlyoutEnter}
      onMouseLeave={handleFlyoutLeave}
    >
      {/* Logo + expand button */}
      <div className="mb-2 flex flex-col items-center gap-1">
        <img src={olsenyLogo} alt="Olseny" className="h-7 w-7 rounded-md" />
        {isEffectivelyCollapsed && !isMobile && (
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleCollapse}
                className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-200"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>Expand sidebar</TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center gap-0.5">
        {categories.map((cat) => {
          const isActive = (isEffectivelyCollapsed ? flyoutCategory === cat.id : activeCategory === cat.id) ||
            (!flyoutCategory && activeCategory === cat.id);
          return (
            <Tooltip key={cat.id} delayDuration={isEffectivelyCollapsed ? 600 : 300}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleCategoryClick(cat.id)}
                  className={cn(
                    "relative flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full bg-primary" />
                  )}
                  <cat.icon className="h-[18px] w-[18px]" />
                </button>
              </TooltipTrigger>
              {/* Only show tooltip when NOT showing flyout */}
              {!flyoutCategory && isEffectivelyCollapsed && (
                <TooltipContent side="right" sideOffset={8}>
                  {cat.label}
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-1 mt-auto">
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-200"
            >
              {resolvedTheme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </TooltipContent>
        </Tooltip>

        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <button className="flex items-center justify-center rounded-lg p-1">
              <Avatar className="h-7 w-7 ring-2 ring-border/50">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-medium">
                  {getInitials(profile?.full_name)}
                </AvatarFallback>
              </Avatar>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {profile?.full_name || 'User'}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );

  // ─── Category Nav Panel Content ───
  const CategoryPanelContent = ({ isMobile = false, onItemClick }: { isMobile?: boolean; onItemClick?: () => void }) => (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Header */}
      <div className="p-3 flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest truncate">
          {categories.find(c => c.id === (flyoutCategory || activeCategory))?.label}
        </span>
        {!isMobile && !isEffectivelyCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all duration-200"
            onClick={onToggleCollapse}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ActiveTimerIndicator collapsed={false} />

      {/* Nav items */}
      <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto scrollbar-thin">
        {isClient && !isAdmin && !isManager ? (
          <>
            <SidebarLink to="/" icon={<LayoutDashboard className="h-[18px] w-[18px]" />} label="Τα Έργα μου" active={location.pathname === '/'} collapsed={false} onClick={() => { isMobile && setMobileOpen(false); onItemClick?.(); }} />
            <SidebarLink to="/tasks" icon={<CheckSquare className="h-[18px] w-[18px]" />} label="Παραδοτέα" active={location.pathname === '/tasks'} collapsed={false} onClick={() => { isMobile && setMobileOpen(false); onItemClick?.(); }} />
          </>
        ) : (
          <>
            {(flyoutCategory || activeCategory) === 'work' ? (
              <>
                <SidebarLink to="/my-work" icon={<LayoutList className="h-[18px] w-[18px]" />} label="My Work" active={location.pathname === '/my-work'} collapsed={false} onClick={() => { isMobile && setMobileOpen(false); onItemClick?.(); }} />
                <SidebarNavGroup id="work" icon={<Briefcase className="h-[18px] w-[18px]" />} label="Projects" collapsed={false} isActive={location.pathname === '/work' || location.pathname.startsWith('/projects/') || location.pathname.startsWith('/tasks/')} defaultOpen>
                  <SidebarSubLink to="/work?tab=projects" icon={<FolderKanban className="h-4 w-4" />} label="Projects" active={location.pathname === '/work' && (!location.search || location.search.includes('tab=projects'))} onClick={() => { navigate('/work?tab=projects'); isMobile && setMobileOpen(false); onItemClick?.(); }} />
                  <SidebarProjectTree collapsed={false} />
                  <SidebarSubLink to="/work?tab=tasks" icon={<CheckSquare className="h-4 w-4" />} label="Tasks" active={location.pathname === '/work' && location.search.includes('tab=tasks')} onClick={() => { navigate('/work?tab=tasks'); isMobile && setMobileOpen(false); onItemClick?.(); }} />
                </SidebarNavGroup>
                <SidebarLink to="/campaigns" icon={<FileText className="h-[18px] w-[18px]" />} label="Campaigns" active={location.pathname === '/campaigns'} collapsed={false} onClick={() => { isMobile && setMobileOpen(false); onItemClick?.(); }} />
                <SidebarLink to="/calendar" icon={<CalendarDays className="h-[18px] w-[18px]" />} label="Calendar" active={location.pathname === '/calendar'} collapsed={false} onClick={() => { isMobile && setMobileOpen(false); onItemClick?.(); }} />
                <SidebarLink to="/backlog" icon={<FileStack className="h-[18px] w-[18px]" />} label="Backlog" active={location.pathname === '/backlog'} collapsed={false} onClick={() => { isMobile && setMobileOpen(false); onItemClick?.(); }} />
                <SidebarLink to="/blueprints" icon={<FileStack className="h-[18px] w-[18px]" />} label="Templates" active={location.pathname === '/blueprints'} collapsed={false} onClick={() => { isMobile && setMobileOpen(false); onItemClick?.(); }} />
                <SidebarLink to="/files" icon={<FileArchive className="h-[18px] w-[18px]" />} label="Files" active={location.pathname === '/files'} collapsed={false} onClick={() => { isMobile && setMobileOpen(false); onItemClick?.(); }} />
              </>
            ) : (
              categoryNavItems[flyoutCategory || activeCategory]?.filter(canAccess).map((item) => {
                const isActiveItem = item.href.includes('?')
                  ? location.pathname + location.search === item.href
                  : location.pathname === item.href;
                return (
                  <SidebarLink key={item.href} to={item.href} icon={<item.icon className="h-[18px] w-[18px]" />} label={item.title} active={isActiveItem} collapsed={false} onClick={() => { isMobile && setMobileOpen(false); onItemClick?.(); }} />
                );
              })
            )}
          </>
        )}
      </nav>

      {/* Secretary AI */}
      <div className="px-2 py-1 shrink-0">
        <NavLink
          to="/secretary"
          onClick={() => { isMobile && setMobileOpen(false); onItemClick?.(); }}
          className={cn(
            "flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all duration-200 ease-apple",
            "bg-primary text-primary-foreground hover:brightness-95 shadow-soft w-full"
          )}
        >
          <Zap className="h-[18px] w-[18px]" />
          <span className="text-sm font-semibold truncate">AI Secretary</span>
        </NavLink>
      </div>

      {/* Quick Actions */}
      <div className="px-2 py-1 shrink-0">
        <Popover open={quickOpen} onOpenChange={setQuickOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="default"
              className={cn(
                "h-10 transition-all duration-200 bg-primary text-primary-foreground hover:bg-primary/90 w-full justify-start gap-3 px-3",
                quickOpen && "[&>svg:first-child]:rotate-45"
              )}
            >
              <Plus className="h-[18px] w-[18px] transition-transform duration-200 shrink-0" />
              <span className="text-sm font-medium truncate">Νέο...</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent side="right" align="end" className="w-56 p-2" sideOffset={8}>
            <div className="space-y-1">
              <button onClick={() => { navigate('/projects?new=true'); setQuickOpen(false); onItemClick?.(); }} className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors text-left">
                <FolderKanban className="h-4 w-4 text-muted-foreground shrink-0" /> Νέο Έργο
              </button>
              <button onClick={() => { navigate('/tasks?new=true'); setQuickOpen(false); onItemClick?.(); }} className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors text-left">
                <CheckSquare className="h-4 w-4 text-muted-foreground shrink-0" /> Νέο Task
              </button>
              <div className="h-px bg-border my-1" />
              {briefDefinitions.map(def => {
                const Icon = briefIcons[def.icon] || FileText;
                return (
                  <button key={def.type} onClick={() => { setSelectedBriefType(def.type); setQuickOpen(false); onItemClick?.(); }} className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors text-left">
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" /> {def.label}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* User Menu */}
      <UserMenu profile={profile} collapsed={false} signOut={() => { signOut(); isMobile && setMobileOpen(false); onItemClick?.(); }} getInitials={getInitials} />
    </div>
  );

  // Mobile sheet rendering
  if (isMobileSheet) {
    return (
      <>
        <div className="h-full flex flex-row">
          <IconRail isMobile />
          <CategoryPanelContent isMobile />
        </div>
        {selectedDef && (
          <BriefFormDialog open={true} onOpenChange={() => setSelectedBriefType(null)} definition={selectedDef} />
        )}
      </>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className="h-screen bg-card border-r border-border/40 flex overflow-hidden"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* Icon rail always visible */}
        <IconRail />

        {/* Expanded panel (persistent) — only when sidebar is expanded */}
        {!isEffectivelyCollapsed && <CategoryPanelContent />}
      </div>

      {/* Ephemeral flyout panel — rendered OUTSIDE the overflow-hidden container via portal-like fixed positioning */}
      {isEffectivelyCollapsed && flyoutCategory && (
        <div
          className="fixed top-0 bottom-0 w-56 bg-card border-r border-border/40 shadow-2xl z-[60] animate-slide-in-left"
          style={{ left: 48 }}
          onMouseEnter={handleFlyoutEnter}
          onMouseLeave={handleFlyoutLeave}
        >
          <CategoryPanelContent onItemClick={handleNavClick} />
        </div>
      )}

      {selectedDef && (
        <BriefFormDialog open={true} onOpenChange={() => setSelectedBriefType(null)} definition={selectedDef} />
      )}
    </>
  );
}

function SidebarLink({
  to, icon, label, active, collapsed, onClick, delay = 0,
}: {
  to: string; icon: React.ReactNode; label: string; active: boolean;
  collapsed: boolean; onClick?: () => void; delay?: number;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ease-apple relative min-w-0",
        active ? "bg-accent text-foreground font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted",
        collapsed && "justify-center px-2"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {active && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-foreground" />
      )}
      <span className={cn("transition-transform duration-200 shrink-0", active && "scale-105 text-foreground", !active && "group-hover:scale-105")}>
        {icon}
      </span>
      {!collapsed && (
        <span className={cn("text-sm font-medium transition-colors truncate min-w-0", active && "font-semibold")}>
          {label}
        </span>
      )}
    </NavLink>
  );
}

function UserMenu({
  profile, collapsed, signOut, getInitials,
}: {
  profile: any; collapsed: boolean; signOut: () => void; getInitials: (name: string | null) => string;
}) {
  return (
    <div className="p-2 border-t border-border/40 shrink-0">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 h-12 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-200 min-w-0",
              collapsed && "justify-center px-2"
            )}
          >
            <Avatar className="h-8 w-8 ring-2 ring-border/50 shrink-0">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                {getInitials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{profile?.full_name || 'User'}</p>
                <p className="text-xs text-muted-foreground/70 truncate">{profile?.email}</p>
              </div>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-xl border-border/50 shadow-soft-lg">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium truncate">{profile?.full_name || 'User'}</span>
              <span className="text-xs text-muted-foreground truncate">{profile?.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-border/50" />
          <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg mx-1 cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" /> Αποσύνδεση
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
