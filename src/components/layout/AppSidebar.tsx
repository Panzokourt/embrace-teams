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
  TooltipContent } from
'@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
'@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger } from
'@/components/ui/popover';
import {
  LayoutDashboard, LayoutList, FileText, FolderKanban, CheckSquare, Users,
  DollarSign, Settings, LogOut, Zap, ChevronLeft, ChevronRight, UserCog, Building2,
  Moon, Sun, CalendarDays, FileArchive, Timer, FileStack, BarChart3,
  Plus, Palette, Monitor, Globe, Calendar, MessageSquare, BookUser,
  Briefcase, Mail, Trophy, ShieldCheck, BookOpen, GitBranch, MonitorPlay } from
'lucide-react';
import { briefDefinitions, getBriefDefinition } from '@/components/blueprints/briefDefinitions';
import { BriefFormDialog } from '@/components/blueprints/BriefFormDialog';
import { PermissionType } from '@/contexts/AuthContext';
import olsenyLogo from '@/assets/olseny-logo.png';
import { ActiveTimerIndicator } from '@/components/time-tracking/ActiveTimerIndicator';
import { SidebarNavGroup, SidebarSubLink } from '@/components/layout/SidebarNavGroup';
import { SidebarProjectTree } from '@/components/layout/SidebarProjectTree';
import CompanySwitcher from './CompanySwitcher';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{className?: string;}>;
  permission?: PermissionType;
  adminOnly?: boolean;
}

type CategoryId = 'work' | 'clients' | 'communication' | 'revenue' | 'operations' | 'intelligence' | 'governance' | 'settings';
type CategoryIdOrNull = CategoryId | null;

interface Category {
  id: CategoryId;
  icon: React.ComponentType<{className?: string;}>;
  label: string;
  routePrefixes: string[];
}

const categories: Category[] = [
{ id: 'work', icon: Briefcase, label: 'Work', routePrefixes: ['/work', '/projects', '/tasks', '/calendar', '/files', '/workflows', '/media-planning'] },
{ id: 'clients', icon: Building2, label: 'Clients', routePrefixes: ['/clients', '/contacts'] },
{ id: 'communication', icon: MessageSquare, label: 'Communication', routePrefixes: ['/chat', '/inbox'] },
{ id: 'revenue', icon: DollarSign, label: 'Revenue', routePrefixes: ['/financials', '/pricing'] },
{ id: 'operations', icon: Users, label: 'Operations', routePrefixes: ['/hr', '/timesheets', '/knowledge', '/operations'] },
{ id: 'intelligence', icon: BarChart3, label: 'Intelligence', routePrefixes: ['/reports', '/brain'] },
{ id: 'governance', icon: ShieldCheck, label: 'Governance', routePrefixes: ['/governance'] },
{ id: 'settings', icon: Settings, label: 'Settings', routePrefixes: ['/settings'] }];


const categoryNavItems: Record<CategoryId, NavItem[]> = {


  work: [],
  clients: [
  { title: 'All Clients', href: '/clients', icon: Building2, permission: 'clients.view' },
  { title: 'Contacts', href: '/contacts', icon: BookUser }],

  communication: [
  { title: 'Chat', href: '/chat', icon: MessageSquare },
  { title: 'Inbox', href: '/inbox', icon: Mail }],

  revenue: [
  { title: 'Dashboard', href: '/financials?tab=dashboard', icon: LayoutDashboard, permission: 'financials.view' },
  { title: 'Υπηρεσίες & Τιμολόγηση', href: '/pricing', icon: FileText, permission: 'financials.view' },
  { title: 'Contracts', href: '/financials?tab=contracts', icon: FileText, permission: 'financials.view' },
  { title: 'Invoices', href: '/financials?tab=invoices', icon: FileText, permission: 'financials.view' },
  { title: 'Expenses', href: '/financials?tab=expenses', icon: DollarSign, permission: 'financials.view' },
  { title: 'Profitability', href: '/financials?tab=reports', icon: BarChart3, permission: 'financials.view' }],

  operations: [
  { title: 'Team & HR', href: '/hr', icon: UserCog },
  { title: 'Timesheets', href: '/timesheets', icon: Timer },
  { title: 'Knowledge Base', href: '/knowledge', icon: BookOpen }],

  intelligence: [
  { title: 'Reports Hub', href: '/reports', icon: BarChart3, permission: 'financials.view' },
  { title: 'Brain', href: '/brain', icon: Zap }],

  governance: [
  { title: 'Dashboard', href: '/governance', icon: ShieldCheck },
  { title: 'Digital Assets', href: '/governance/assets', icon: Globe },
  { title: 'Access Control', href: '/governance/access', icon: UserCog },
  { title: 'Vault', href: '/governance/vault', icon: FileArchive },
  { title: 'Compliance', href: '/governance/compliance', icon: FileText }],

  settings: [
  { title: 'General', href: '/settings', icon: Settings, permission: 'settings.company' },
  { title: 'Organization', href: '/settings/organization', icon: Building2, permission: 'settings.company' }]

};

function detectCategory(pathname: string): CategoryIdOrNull {
  if (pathname === '/' || pathname === '/my-work') return null;
  if (pathname.startsWith('/work') || pathname.startsWith('/projects') || pathname.startsWith('/tasks') || pathname.startsWith('/calendar') || pathname.startsWith('/files') || pathname.startsWith('/blueprints') || pathname.startsWith('/workflows') || pathname.startsWith('/media-planning')) return 'work';
  if (pathname.startsWith('/clients') || pathname.startsWith('/contacts')) return 'clients';
  if (pathname.startsWith('/chat') || pathname.startsWith('/inbox')) return 'communication';
  if (pathname.startsWith('/financials') || pathname.startsWith('/pricing')) return 'revenue';
  if (pathname.startsWith('/hr') || pathname.startsWith('/timesheets') || pathname.startsWith('/knowledge') || pathname.startsWith('/operations')) return 'operations';
  if (pathname.startsWith('/reports') || pathname.startsWith('/brain')) return 'intelligence';
  if (pathname.startsWith('/governance')) return 'governance';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/dashboards')) return 'work';
  return null;
}

const briefIcons: Record<string, React.ComponentType<{className?: string;}>> = {
  Palette, Monitor, FileText, Globe, Calendar, MessageSquare
};

export default function AppSidebar({
  collapsed,
  onToggleCollapse,
  forceCollapsed,
  isMobileSheet





}: {collapsed: boolean;onToggleCollapse: () => void;forceCollapsed?: boolean;isMobileSheet?: boolean;}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, roles, signOut, isAdmin, isManager, isClient, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [quickOpen, setQuickOpen] = useState(false);
  const [selectedBriefType, setSelectedBriefType] = useState<string | null>(null);

  // Flyout state for collapsed/rail mode
  const [flyoutCategory, setFlyoutCategory] = useState<CategoryId | null>(null);
  const flyoutTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const detectedCategory = useMemo(() => detectCategory(location.pathname), [location.pathname]);
  const [activeCategory, setActiveCategory] = useState<CategoryIdOrNull>(detectedCategory);

  useEffect(() => {
    const detected = detectCategory(location.pathname);
    setActiveCategory(detected);
    // Auto-collapse sidebar when navigating to My Work (no sub-menu)
    if (detected === null && !collapsed && !forceCollapsed && !isMobileSheet) {
      onToggleCollapse();
    }
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

  const handleCategoryClick = useCallback((catId: CategoryId) => {
    if (isEffectivelyCollapsed && !isMobileSheet) {
      setFlyoutCategory((prev) => prev === catId ? null : catId);
      setActiveCategory(catId);
    } else {
      setActiveCategory(catId);
    }
  }, [isEffectivelyCollapsed, isMobileSheet]);

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

  const handleNavClick = useCallback(() => {
    setFlyoutCategory(null);
  }, []);

  useEffect(() => {
    if (!flyoutCategory) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFlyoutCategory(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [flyoutCategory]);

  // ─── Dark Floated Icon Rail ───
  const IconRail = ({ isMobile = false }: {isMobile?: boolean;}) =>
  <div
    className={cn(
      "flex flex-col items-center py-3 gap-1 shrink-0 w-12 shadow-none",
      isMobile ?
      "bg-card border-r border-border/30" :
      "my-2 ml-2 rounded-2xl bg-[#1A1A1A] shadow-lg"
    )}
    style={!isMobile ? { height: 'calc(100% - 16px)' } : undefined}
    onMouseEnter={handleFlyoutEnter}
    onMouseLeave={handleFlyoutLeave}>
    
      {/* Logo */}
      <div className="mb-2 flex flex-col items-center gap-1">
        <img src={olsenyLogo} alt="Olseny" className="h-9 w-9 rounded-md" />
        {isEffectivelyCollapsed && !isMobile &&
      <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <button
            onClick={onToggleCollapse}
            className="flex items-center justify-center w-7 h-7 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-all duration-200">
            
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>Expand sidebar</TooltipContent>
          </Tooltip>
      }
      </div>

      {/* My Work standalone button */}
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button
            onClick={() => { navigate('/'); handleNavClick(); setFlyoutCategory(null); setActiveCategory(null); }}
            className={cn(
              "relative flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 mb-1",
              isMobile
                ? (location.pathname === '/' || location.pathname === '/my-work') ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                : (location.pathname === '/' || location.pathname === '/my-work') ? "bg-white/15 text-white" : "text-white/50 hover:text-white hover:bg-white/10"
            )}>
            {(location.pathname === '/' || location.pathname === '/my-work') && !isMobile && (
              <span className="absolute left-0.5 top-1/2 -translate-y-1/2 w-[3px] h-3 rounded-full bg-primary" />
            )}
            <LayoutList className="h-[18px] w-[18px]" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>My Work</TooltipContent>
      </Tooltip>

      <div className="w-6 h-px bg-white/10 mb-1" />

      {/* Category icons */}
      <div className="flex-1 flex flex-col items-center gap-0.5">
        {categories.map((cat) => {
        const isActive = (isEffectivelyCollapsed ? flyoutCategory === cat.id : activeCategory === cat.id) ||
        !flyoutCategory && activeCategory === cat.id;
        return (
          <Tooltip key={cat.id} delayDuration={isEffectivelyCollapsed ? 600 : 300}>
              <TooltipTrigger asChild>
                <button
                onClick={() => handleCategoryClick(cat.id)}
                className={cn(
                  "relative flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200",
                  isMobile ?
                  isActive ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/60" :
                  isActive ? "bg-white/15 text-white" : "text-white/50 hover:text-white hover:bg-white/10"
                )}>
                
                  {isActive && !isMobile &&
                <span className="absolute left-0.5 top-1/2 -translate-y-1/2 w-[3px] h-3 rounded-full bg-primary" />
                }
                  {isActive && isMobile &&
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full bg-primary" />
                }
                  <cat.icon className="h-[18px] w-[18px]" />
                </button>
              </TooltipTrigger>
              {!flyoutCategory && isEffectivelyCollapsed &&
            <TooltipContent side="right" sideOffset={8}>
                  {cat.label}
                </TooltipContent>
            }
            </Tooltip>);

      })}
      </div>

      {/* Bottom actions */}
      <div className="flex flex-col items-center gap-1 mt-auto">
        {/* Company Switcher — icon only in rail */}
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <div>
              <CompanySwitcher compact iconOnly={isMobile ? false : true} />
            </div>
          </TooltipTrigger>
          {!isMobile &&
        <TooltipContent side="right" sideOffset={8}>Εταιρεία</TooltipContent>
        }
        </Tooltip>
        {/* Secretary AI */}
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <button
            onClick={() => {navigate('/secretary');handleNavClick();}}
            className={cn("flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 border border-primary text-primary-foreground bg-secondary-foreground",

            isMobile ?
            "text-muted-foreground hover:text-foreground hover:bg-muted/60" :
            "text-white/50 hover:text-white hover:bg-white/10"
            )}>
            
              <Zap className="h-[18px] w-[18px] text-primary" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>AI Secretary</TooltipContent>
        </Tooltip>

        {/* Quick Actions */}
        <Popover open={quickOpen} onOpenChange={setQuickOpen}>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button
                className={cn("flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 border border-primary",

                isMobile ?
                "text-muted-foreground hover:text-foreground hover:bg-muted/60" :
                "text-white/50 hover:text-white hover:bg-white/10",
                quickOpen && "[&>svg]:rotate-45"
                )}>
                
                  <Plus className="h-[18px] w-[18px] transition-transform duration-200 text-primary" />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            {!quickOpen &&
          <TooltipContent side="right" sideOffset={8}>Quick Actions</TooltipContent>
          }
          </Tooltip>
          <PopoverContent side="right" align="end" className="w-56 p-2" sideOffset={8}>
            <div className="space-y-1">
              <button onClick={() => {navigate('/projects?new=true');setQuickOpen(false);handleNavClick();}} className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors text-left">
                <FolderKanban className="h-4 w-4 text-muted-foreground shrink-0" /> Νέο Έργο
              </button>
              <button onClick={() => {navigate('/tasks?new=true');setQuickOpen(false);handleNavClick();}} className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors text-left">
                <CheckSquare className="h-4 w-4 text-muted-foreground shrink-0" /> Νέο Task
              </button>
              <div className="h-px bg-border my-1" />
              {briefDefinitions.map((def) => {
              const Icon = briefIcons[def.icon] || FileText;
              return (
                <button key={def.type} onClick={() => {setSelectedBriefType(def.type);setQuickOpen(false);handleNavClick();}} className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors text-left">
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" /> {def.label}
                  </button>);

            })}
            </div>
          </PopoverContent>
        </Popover>

        {/* Theme toggle */}
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <button
            onClick={toggleTheme}
            className={cn("flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 text-primary border border-primary bg-black",

            isMobile ?
            "text-muted-foreground hover:text-foreground hover:bg-muted/60" :
            "text-white/50 hover:text-white hover:bg-white/10"
            )}>
            
              {resolvedTheme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </TooltipContent>
        </Tooltip>

        {/* User Avatar with dropdown */}
        <DropdownMenu>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center justify-center rounded-lg p-1">
                  <Avatar className={cn("h-7 w-7", isMobile ? "ring-2 ring-border/50" : "ring-2 ring-white/20")}>
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className={cn(
                    "text-[10px] font-medium",
                    isMobile ? "bg-primary/10 text-primary" : "bg-white/15 text-white"
                  )}>
                      {getInitials(profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {profile?.full_name || 'User'}
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" side="right" className="w-56 rounded-xl border-border/50 shadow-soft-lg">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium truncate">{profile?.full_name || 'User'}</span>
                <span className="text-xs text-muted-foreground truncate">{profile?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg mx-1 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" /> Αποσύνδεση
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>;


  // ─── Category Nav Panel Content (no Secretary, no Quick Actions, no UserMenu) ───
  const CategoryPanelContent = ({ isMobile = false, onItemClick }: {isMobile?: boolean;onItemClick?: () => void;}) =>
  <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Header */}
      <div className="p-3 flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest truncate">
          {categories.find((c) => c.id === (flyoutCategory || activeCategory))?.label}
        </span>
        {!isMobile && !isEffectivelyCollapsed &&
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all duration-200"
        onClick={onToggleCollapse}>
        
            <ChevronLeft className="h-4 w-4" />
          </Button>
      }
      </div>

      <ActiveTimerIndicator collapsed={false} />

      {/* Nav items */}
      <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto scrollbar-thin">
        {isClient && !isAdmin && !isManager ?
      <>
            <SidebarLink to="/" icon={<LayoutDashboard className="h-[18px] w-[18px]" />} label="Τα Έργα μου" active={location.pathname === '/'} collapsed={false} onClick={() => {onItemClick?.();}} />
            <SidebarLink to="/tasks" icon={<CheckSquare className="h-[18px] w-[18px]" />} label="Παραδοτέα" active={location.pathname === '/tasks'} collapsed={false} onClick={() => {onItemClick?.();}} />
          </> :

      <>
            {(flyoutCategory || activeCategory) === 'work' ?
        <>
                
                <SidebarNavGroup id="work" icon={<Briefcase className="h-[18px] w-[18px]" />} label="Projects" collapsed={false} isActive={location.pathname === '/work' || location.pathname.startsWith('/projects/') || location.pathname.startsWith('/tasks/')} defaultOpen>
                  <SidebarSubLink to="/work?tab=projects" icon={<FolderKanban className="h-4 w-4" />} label="Projects" active={location.pathname === '/work' && (!location.search || location.search.includes('tab=projects'))} onClick={() => {navigate('/work?tab=projects');onItemClick?.();}} />
                  <SidebarProjectTree collapsed={false} />
                  <SidebarSubLink to="/work?tab=tasks" icon={<CheckSquare className="h-4 w-4" />} label="Tasks" active={location.pathname === '/work' && location.search.includes('tab=tasks')} onClick={() => {navigate('/work?tab=tasks');onItemClick?.();}} />
                </SidebarNavGroup>
                <SidebarLink to="/campaigns" icon={<FileText className="h-[18px] w-[18px]" />} label="Campaigns" active={location.pathname === '/campaigns'} collapsed={false} onClick={() => {onItemClick?.();}} />
                <SidebarLink to="/calendar" icon={<CalendarDays className="h-[18px] w-[18px]" />} label="Calendar" active={location.pathname === '/calendar'} collapsed={false} onClick={() => {onItemClick?.();}} />
                <SidebarLink to="/backlog" icon={<FileStack className="h-[18px] w-[18px]" />} label="Backlog" active={location.pathname === '/backlog'} collapsed={false} onClick={() => {onItemClick?.();}} />
                <SidebarLink to="/blueprints" icon={<FileStack className="h-[18px] w-[18px]" />} label="Templates" active={location.pathname === '/blueprints'} collapsed={false} onClick={() => {onItemClick?.();}} />
                <SidebarLink to="/files" icon={<FileArchive className="h-[18px] w-[18px]" />} label="Files" active={location.pathname === '/files'} collapsed={false} onClick={() => {onItemClick?.();}} />
                <SidebarLink to="/workflows" icon={<GitBranch className="h-[18px] w-[18px]" />} label="Workflows" active={location.pathname === '/workflows'} collapsed={false} onClick={() => {onItemClick?.();}} />
                <SidebarLink to="/media-planning" icon={<MonitorPlay className="h-[18px] w-[18px]" />} label="Media Planning" active={location.pathname.startsWith('/media-planning')} collapsed={false} onClick={() => {onItemClick?.();}} />
              </> :

        (flyoutCategory || activeCategory) ? categoryNavItems[(flyoutCategory || activeCategory) as CategoryId]?.filter(canAccess).map((item) => {
          const isActiveItem = item.href.includes('?') ?
          location.pathname + location.search === item.href :
          location.pathname === item.href;
          return (
            <SidebarLink key={item.href} to={item.href} icon={<item.icon className="h-[18px] w-[18px]" />} label={item.title} active={isActiveItem} collapsed={false} onClick={() => {onItemClick?.();}} />);

        }) : null
        }
          </>
      }
      </nav>
    </div>;


  // Mobile sheet rendering
  if (isMobileSheet) {
    return (
      <>
        <div className="h-full flex flex-row">
          <IconRail isMobile />
          <CategoryPanelContent isMobile />
        </div>
        {selectedDef &&
        <BriefFormDialog open={true} onOpenChange={() => setSelectedBriefType(null)} definition={selectedDef} />
        }
      </>);

  }

  return (
    <>
      <div
        ref={containerRef}
        className="h-screen bg-card border-r border-border/40 flex overflow-visible"
        tabIndex={-1}>
        
        {/* Dark floated icon rail */}
        <IconRail />

        {/* Expanded panel — only when sidebar is expanded */}
        {!isEffectivelyCollapsed && activeCategory && <CategoryPanelContent />}
      </div>

      {/* Ephemeral flyout panel — fixed positioning outside overflow */}
      {isEffectivelyCollapsed && flyoutCategory &&
      <div
        className="fixed top-0 bottom-0 w-56 bg-card border-r border-border/40 shadow-2xl z-[60] animate-slide-in-left"
        style={{ left: 48 }}
        onMouseEnter={handleFlyoutEnter}
        onMouseLeave={handleFlyoutLeave}>
        
          <CategoryPanelContent onItemClick={handleNavClick} />
        </div>
      }

      {selectedDef &&
      <BriefFormDialog open={true} onOpenChange={() => setSelectedBriefType(null)} definition={selectedDef} />
      }
    </>);

}

function SidebarLink({
  to, icon, label, active, collapsed, onClick, delay = 0



}: {to: string;icon: React.ReactNode;label: string;active: boolean;collapsed: boolean;onClick?: () => void;delay?: number;}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ease-apple relative min-w-0",
        active ? "bg-accent text-foreground font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted",
        collapsed && "justify-center px-2"
      )}
      style={{ animationDelay: `${delay}ms` }}>
      
      {active && !collapsed &&
      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-foreground" />
      }
      <span className={cn("transition-transform duration-200 shrink-0", active && "scale-105 text-foreground", !active && "group-hover:scale-105")}>
        {icon}
      </span>
      {!collapsed &&
      <span className={cn("text-sm font-medium transition-colors truncate min-w-0", active && "font-semibold")}>
          {label}
        </span>
      }
    </NavLink>);

}