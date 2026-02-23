import { useState, useMemo, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
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
  DropdownMenuTrigger } from
'@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  LayoutDashboard,
  LayoutList,
  FileText,
  FolderKanban,
  CheckSquare,
  Users,
  DollarSign,
  Settings,
  LogOut,
  Zap,
  ChevronLeft,
  UserCog,
  Building2,
  Menu,
  Moon,
  Sun,
  CalendarDays,
  FileArchive,
  Timer,
  FileStack,
  BarChart3,
  Plus,
  Palette,
  Monitor,
  Globe,
  Calendar,
  MessageSquare,
  BookUser,
  Briefcase,
  Mail,
  Trophy,
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
  icon: React.ComponentType<{className?: string;}>;
  permission?: PermissionType;
  adminOnly?: boolean;
}

// ─── Category definitions for the icon rail ───
type CategoryId = 'home' | 'work' | 'comms' | 'files' | 'time' | 'people' | 'finance' | 'admin';

interface Category {
  id: CategoryId;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  routePrefixes: string[];
}

const categories: Category[] = [
  { id: 'home', icon: LayoutDashboard, label: 'Αρχική', routePrefixes: ['/my-work', '/'] },
  { id: 'work', icon: Briefcase, label: 'Εργασίες', routePrefixes: ['/work', '/projects', '/tasks'] },
  { id: 'comms', icon: MessageSquare, label: 'Επικοινωνία', routePrefixes: ['/inbox', '/chat'] },
  { id: 'files', icon: FileArchive, label: 'Αρχείο', routePrefixes: ['/files'] },
  { id: 'time', icon: Timer, label: 'Χρόνος', routePrefixes: ['/timesheets'] },
  { id: 'people', icon: Users, label: 'Ομάδα', routePrefixes: ['/contacts', '/hr', '/leaderboard'] },
  { id: 'finance', icon: DollarSign, label: 'Οικονομικά', routePrefixes: ['/financials', '/reports'] },
  { id: 'admin', icon: Settings, label: 'Διαχείριση', routePrefixes: ['/clients', '/blueprints', '/settings'] },
];

// Map each nav item to its category
const categoryNavItems: Record<CategoryId, NavItem[]> = {
  home: [
    { title: 'My Work', href: '/my-work', icon: LayoutList },
    { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  ],
  work: [], // handled separately with SidebarNavGroup
  comms: [
    { title: 'Inbox', href: '/inbox', icon: Mail },
    { title: 'Chat', href: '/chat', icon: MessageSquare },
  ],
  files: [
    { title: 'Αρχείο', href: '/files', icon: FileArchive, permission: 'files.view' },
  ],
  time: [
    { title: 'Timesheets', href: '/timesheets', icon: Timer },
  ],
  people: [
    { title: 'Ευρετήριο', href: '/contacts', icon: BookUser },
    { title: 'HR', href: '/hr', icon: UserCog },
    { title: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  ],
  finance: [
    { title: 'Λογιστήριο', href: '/financials', icon: DollarSign, permission: 'financials.view' },
    { title: 'Αναφορές', href: '/reports', icon: BarChart3, permission: 'financials.view' },
  ],
  admin: [
    { title: 'Πελάτες', href: '/clients', icon: Building2, permission: 'clients.view' },
    { title: 'Προσχέδια', href: '/blueprints', icon: FileStack, permission: 'settings.company' },
    { title: 'Ρυθμίσεις', href: '/settings', icon: Settings, permission: 'settings.company' },
  ],
};

const briefIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Palette, Monitor, FileText, Globe, Calendar, MessageSquare,
};

function detectCategory(pathname: string): CategoryId {
  // Check more specific routes first (longer prefixes)
  if (pathname.startsWith('/work') || pathname.startsWith('/projects') || pathname.startsWith('/tasks')) return 'work';
  if (pathname.startsWith('/inbox') || pathname.startsWith('/chat')) return 'comms';
  if (pathname.startsWith('/files')) return 'files';
  if (pathname.startsWith('/timesheets')) return 'time';
  if (pathname.startsWith('/contacts') || pathname.startsWith('/hr') || pathname.startsWith('/leaderboard')) return 'people';
  if (pathname.startsWith('/financials') || pathname.startsWith('/reports')) return 'finance';
  if (pathname.startsWith('/clients') || pathname.startsWith('/blueprints') || pathname.startsWith('/settings')) return 'admin';
  if (pathname === '/my-work' || pathname === '/') return 'home';
  return 'home';
}

export default function AppSidebar({ collapsed, onToggleCollapse }: { collapsed: boolean; onToggleCollapse: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, roles, signOut, isAdmin, isManager, isClient, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [selectedBriefType, setSelectedBriefType] = useState<string | null>(null);

  const detectedCategory = useMemo(() => detectCategory(location.pathname), [location.pathname]);
  const [activeCategory, setActiveCategory] = useState<CategoryId>(detectedCategory);

  // Sync active category when route changes
  useMemo(() => {
    setActiveCategory(detectCategory(location.pathname));
  }, [location.pathname]);

  const selectedDef = selectedBriefType ? getBriefDefinition(selectedBriefType) : null;

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
    setActiveCategory(catId);
    if (collapsed) {
      onToggleCollapse(); // expand sidebar
    }
  }, [collapsed, onToggleCollapse]);

  // ─── Icon Rail ───
  const IconRail = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={cn(
      "flex flex-col items-center py-3 gap-1 border-r border-border/30 bg-card/80 shrink-0",
      isMobile ? "w-12" : "w-12"
    )}>
      {/* Logo at top */}
      <div className="mb-3">
        <img src={olsenyLogo} alt="Olseny" className="h-7 w-7 rounded-md" />
      </div>

      {/* Category icons */}
      <div className="flex-1 flex flex-col items-center gap-0.5">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <Tooltip key={cat.id} delayDuration={300}>
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
              <TooltipContent side="right" sideOffset={8}>
                {cat.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Bottom items: theme + user avatar */}
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

  // ─── Category Nav Panel (right side) ───
  const CategoryPanel = ({ isMobile = false }: { isMobile?: boolean }) => {
    const showExpanded = !collapsed || isMobile;

    return (
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header with collapse button */}
        <div className="p-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest truncate">
            {categories.find(c => c.id === activeCategory)?.label}
          </span>
          {!isMobile && (
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

        {/* Active Timer Indicator */}
        <ActiveTimerIndicator collapsed={false} />

        {/* Nav items for active category */}
        <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
          {isClient && !isAdmin && !isManager ? (
            // Client navigation (simplified)
            <>
              <SidebarLink
                to="/"
                icon={<LayoutDashboard className="h-[18px] w-[18px]" />}
                label="Τα Έργα μου"
                active={location.pathname === '/'}
                collapsed={false}
                onClick={() => isMobile && setMobileOpen(false)}
              />
              <SidebarLink
                to="/tasks"
                icon={<CheckSquare className="h-[18px] w-[18px]" />}
                label="Παραδοτέα"
                active={location.pathname === '/tasks'}
                collapsed={false}
                onClick={() => isMobile && setMobileOpen(false)}
              />
            </>
          ) : (
            <>
              {/* Work category has special expandable group */}
              {activeCategory === 'work' ? (
                <>
                  <SidebarNavGroup
                    id="work"
                    icon={<Briefcase className="h-[18px] w-[18px]" />}
                    label="Εργασίες"
                    collapsed={false}
                    isActive={location.pathname === '/work' || location.pathname.startsWith('/projects/') || location.pathname.startsWith('/tasks/')}
                    defaultOpen
                  >
                    <SidebarSubLink
                      to="/work?tab=projects"
                      icon={<FolderKanban className="h-4 w-4" />}
                      label="Έργα"
                      active={location.pathname === '/work' && (!location.search || location.search.includes('tab=projects'))}
                      onClick={() => { navigate('/work?tab=projects'); isMobile && setMobileOpen(false); }}
                    />
                    <SidebarProjectTree collapsed={false} />
                    <SidebarSubLink
                      to="/work?tab=tasks"
                      icon={<CheckSquare className="h-4 w-4" />}
                      label="Tasks"
                      active={location.pathname === '/work' && location.search.includes('tab=tasks')}
                      onClick={() => { navigate('/work?tab=tasks'); isMobile && setMobileOpen(false); }}
                    />
                    <SidebarSubLink
                      to="/work?tab=calendar"
                      icon={<CalendarDays className="h-4 w-4" />}
                      label="Ημερολόγιο"
                      active={location.pathname === '/work' && location.search.includes('tab=calendar')}
                      onClick={() => { navigate('/work?tab=calendar'); isMobile && setMobileOpen(false); }}
                    />
                  </SidebarNavGroup>
                </>
              ) : (
                // Regular nav items for the active category
                categoryNavItems[activeCategory]?.filter(canAccess).map((item) => (
                  <SidebarLink
                    key={item.href}
                    to={item.href}
                    icon={<item.icon className="h-[18px] w-[18px]" />}
                    label={item.title}
                    active={location.pathname === item.href}
                    collapsed={false}
                    onClick={() => isMobile && setMobileOpen(false)}
                  />
                ))
              )}
            </>
          )}
        </nav>

        {/* Secretary AI */}
        <div className="px-2 py-1">
          <NavLink
            to="/secretary"
            onClick={() => isMobile && setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all duration-200 ease-apple",
              "bg-primary text-primary-foreground hover:brightness-95 shadow-soft w-full"
            )}
          >
            <Zap className="h-[18px] w-[18px]" />
            <span className="text-sm font-semibold">AI Secretary</span>
          </NavLink>
        </div>

        {/* Quick Actions */}
        <div className="px-2 py-1">
          <Popover open={quickOpen} onOpenChange={setQuickOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="default"
                className={cn(
                  "h-10 transition-all duration-200 bg-primary text-primary-foreground hover:bg-primary/90 w-full justify-start gap-3 px-3",
                  quickOpen && "[&>svg:first-child]:rotate-45"
                )}
              >
                <Plus className="h-[18px] w-[18px] transition-transform duration-200" />
                <span className="text-sm font-medium">Νέο...</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent side="right" align="end" className="w-56 p-2" sideOffset={8}>
              <div className="space-y-1">
                <button
                  onClick={() => { navigate('/projects?new=true'); setQuickOpen(false); }}
                  className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors text-left"
                >
                  <FolderKanban className="h-4 w-4 text-muted-foreground" />
                  Νέο Έργο
                </button>
                <button
                  onClick={() => { navigate('/tasks?new=true'); setQuickOpen(false); }}
                  className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors text-left"
                >
                  <CheckSquare className="h-4 w-4 text-muted-foreground" />
                  Νέο Task
                </button>
                <div className="h-px bg-border my-1" />
                {briefDefinitions.map(def => {
                  const Icon = briefIcons[def.icon] || FileText;
                  return (
                    <button
                      key={def.type}
                      onClick={() => { setSelectedBriefType(def.type); setQuickOpen(false); }}
                      className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors text-left"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {def.label}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* User Menu */}
        <UserMenu
          profile={profile}
          collapsed={false}
          signOut={() => {
            signOut();
            isMobile && setMobileOpen(false);
          }}
          getInitials={getInitials}
        />
      </div>
    );
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="bg-card border-border/50 shadow-soft h-10 w-10">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-80 bg-card border-border/50">
            <div className="h-full flex flex-row">
              <IconRail isMobile />
              <CategoryPanel isMobile />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="h-screen bg-card border-r border-border/40 hidden md:flex overflow-hidden">
        {/* Always show icon rail */}
        <IconRail />
        {/* Show category panel only when not collapsed */}
        {!collapsed && <CategoryPanel />}
      </div>

      {selectedDef && (
        <BriefFormDialog
          open={true}
          onOpenChange={() => setSelectedBriefType(null)}
          definition={selectedDef}
        />
      )}
    </>
  );
}

function SidebarLink({
  to,
  icon,
  label,
  active,
  collapsed,
  onClick,
  delay = 0,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
  delay?: number;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ease-apple relative",
        active
          ? "bg-accent text-foreground font-semibold"
          : "text-muted-foreground hover:text-foreground hover:bg-muted",
        collapsed && "justify-center px-2"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {active && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-foreground" />
      )}
      <span className={cn(
        "transition-transform duration-200",
        active && "scale-105 text-foreground",
        !active && "group-hover:scale-105"
      )}>
        {icon}
      </span>
      {!collapsed && (
        <span className={cn(
          "text-sm font-medium transition-colors",
          active && "font-semibold"
        )}>
          {label}
        </span>
      )}
    </NavLink>
  );
}

function UserMenu({
  profile,
  collapsed,
  signOut,
  getInitials,
}: {
  profile: any;
  collapsed: boolean;
  signOut: () => void;
  getInitials: (name: string | null) => string;
}) {
  return (
    <div className="p-2 border-t border-border/40">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 h-12 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-200",
              collapsed && "justify-center px-2"
            )}
          >
            <Avatar className="h-8 w-8 ring-2 ring-border/50">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                {getInitials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground/70 truncate">
                  {profile?.email}
                </p>
              </div>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-xl border-border/50 shadow-soft-lg">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <span className="text-sm font-medium">{profile?.full_name || 'User'}</span>
              <span className="text-xs text-muted-foreground">
                {profile?.email}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-border/50" />
          <DropdownMenuItem
            onClick={signOut}
            className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg mx-1 cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Αποσύνδεση
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
