import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
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
  Network,
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
} from 'lucide-react';
import { briefDefinitions, getBriefDefinition } from '@/components/blueprints/briefDefinitions';
import { BriefFormDialog } from '@/components/blueprints/BriefFormDialog';

import { PermissionType } from '@/contexts/AuthContext';
import olsenyLogo from '@/assets/olseny-logo.png';
import { ActiveTimerIndicator } from '@/components/time-tracking/ActiveTimerIndicator';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{className?: string;}>;
  permission?: PermissionType;
  adminOnly?: boolean;
}

const briefIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Palette, Monitor, FileText, Globe, Calendar, MessageSquare,
};

const navItems: NavItem[] = [
{ title: 'My Work', href: '/my-work', icon: LayoutList },
{ title: 'Dashboard', href: '/', icon: LayoutDashboard },
{ title: 'Εργασίες', href: '/work', icon: FolderKanban, permission: 'projects.view' },
{ title: 'Αρχείο', href: '/files', icon: FileArchive, permission: 'files.view' },
{ title: 'HR', href: '/hr', icon: UserCog },
{ title: 'Λογιστήριο', href: '/financials', icon: DollarSign, permission: 'financials.view' },
{ title: 'Αναφορές', href: '/reports', icon: BarChart3, permission: 'financials.view' }];


const adminNavItems: NavItem[] = [
{ title: 'Πελάτες', href: '/clients', icon: Building2, permission: 'clients.view' },
{ title: 'Προσχέδια', href: '/blueprints', icon: FileStack, permission: 'settings.company' },
{ title: 'Ρυθμίσεις', href: '/settings', icon: Settings, permission: 'settings.company' }];


export default function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, roles, signOut, isAdmin, isManager, isClient, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [selectedBriefType, setSelectedBriefType] = useState<string | null>(null);

  const selectedDef = selectedBriefType ? getBriefDefinition(selectedBriefType) : null;

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const canAccess = (item: NavItem) => {
    // Super admins and company admins can access everything
    if (isSuperAdmin || isCompanyAdmin) return true;

    // Admin-only items require admin/manager legacy role
    if (item.adminOnly) return isAdmin || isManager;

    // Check specific permission
    if (item.permission) return hasPermission(item.permission);

    // No permission required
    return true;
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const SidebarContent = ({ isMobile = false }: {isMobile?: boolean;}) =>
  <>
      {/* Logo */}
      <div className="p-4 flex items-center justify-between">
        {(!collapsed || isMobile) &&
      <div className="flex items-center gap-2">
        <img src={olsenyLogo} alt="Olseny" className="h-8 w-8 rounded-lg" />
        <span className="font-bold text-lg text-foreground tracking-tight">OLSENY</span>
      </div>
      }
        {collapsed && !isMobile &&
      <img src={olsenyLogo} alt="Olseny" className="h-8 w-8 rounded-lg mx-auto" />
      }
        {!isMobile &&
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary/80 hidden md:flex transition-all duration-200",
          collapsed && "absolute right-2 top-4"
        )}
        onClick={() => setCollapsed(!collapsed)}>

            {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
      }
      </div>

      {/* Active Timer Indicator */}
      <ActiveTimerIndicator collapsed={collapsed && !isMobile} />

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {isClient && !isAdmin && !isManager ?
      // Client navigation
      <>
            <SidebarLink
          to="/"
          icon={<LayoutDashboard className="h-[18px] w-[18px]" />}
          label="Τα Έργα μου"
          active={location.pathname === '/'}
          collapsed={collapsed && !isMobile}
          onClick={() => isMobile && setMobileOpen(false)} />

            <SidebarLink
          to="/tasks"
          icon={<CheckSquare className="h-[18px] w-[18px]" />}
          label="Παραδοτέα"
          active={location.pathname === '/tasks'}
          collapsed={collapsed && !isMobile}
          onClick={() => isMobile && setMobileOpen(false)} />

          </> :

      // Admin/Manager/Employee navigation
      <>
            {navItems.filter(canAccess).map((item, index) =>
        <SidebarLink
          key={item.href}
          to={item.href}
          icon={<item.icon className="h-[18px] w-[18px]" />}
          label={item.title}
          active={location.pathname === item.href}
          collapsed={collapsed && !isMobile}
          onClick={() => isMobile && setMobileOpen(false)}
          delay={index * 20} />

        )}

            {/* Admin Section - Show if any admin nav item is accessible */}
            {adminNavItems.some(canAccess) &&
        <>
                <div className={cn(
            "pt-6 pb-2",
            collapsed && !isMobile ? "px-2" : "px-3"
          )}>
                  {(!collapsed || isMobile) &&
            <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-widest">
                      Διαχείριση
                    </span>
            }
                  {collapsed && !isMobile && <div className="h-px bg-border/50 mx-1" />}
                </div>
                {adminNavItems.filter(canAccess).map((item, index) =>
          <SidebarLink
            key={item.href}
            to={item.href}
            icon={<item.icon className="h-[18px] w-[18px]" />}
            label={item.title}
            active={location.pathname === item.href}
            collapsed={collapsed && !isMobile}
            onClick={() => isMobile && setMobileOpen(false)}
            delay={(navItems.length + index) * 20} />

          )}
              </>
        }
          </>
      }
      </nav>

      {/* Quick Actions */}
      <div className={cn("px-3 py-1", collapsed && !isMobile && "flex justify-center")}>
        <Popover open={quickOpen} onOpenChange={setQuickOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="default"
              size={collapsed && !isMobile ? "icon" : "default"}
              className={cn(
                "h-10 transition-all duration-200 bg-primary text-primary-foreground hover:bg-primary/90",
                (!collapsed || isMobile) && "w-full justify-start gap-3 px-3",
                quickOpen && "[&>svg:first-child]:rotate-45"
              )}
            >
              <Plus className="h-[18px] w-[18px] transition-transform duration-200" />
              {(!collapsed || isMobile) && <span className="text-sm font-medium">Νέο...</span>}
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

      {/* Theme Toggle */}
      <div className={cn(
      "px-3 py-2",
      collapsed && !isMobile && "flex justify-center"
    )}>
        <Button
        variant="ghost"
        size={collapsed && !isMobile ? "icon" : "default"}
        className={cn(
          "h-10 text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all duration-200",
          (!collapsed || isMobile) && "w-full justify-start gap-3 px-3"
        )}
        onClick={toggleTheme}>

          {resolvedTheme === 'dark' ?
        <Sun className="h-[18px] w-[18px]" /> :

        <Moon className="h-[18px] w-[18px]" />
        }
          {(!collapsed || isMobile) &&
        <span className="text-sm">{resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        }
        </Button>
      </div>

      {/* User Menu */}
      <UserMenu
      profile={profile}
      collapsed={collapsed && !isMobile}
      signOut={() => {
        signOut();
        isMobile && setMobileOpen(false);
      }}
      getInitials={getInitials} />

    </>;


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
          <SheetContent side="left" className="p-0 w-72 bg-card border-border/50">
            <div className="h-full flex flex-col">
              <SidebarContent isMobile />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className={cn(
        "h-screen bg-card/50 backdrop-blur-sm border-r border-border/40 flex-col transition-all duration-300 ease-apple hidden md:flex",
        collapsed ? "w-[72px]" : "w-64"
      )}>
        <SidebarContent />
      </aside>

      {selectedDef && (
        <BriefFormDialog
          open={true}
          onOpenChange={() => setSelectedBriefType(null)}
          definition={selectedDef}
        />
      )}
    </>);

}

function SidebarLink({
  to,
  icon,
  label,
  active,
  collapsed,
  onClick,
  delay = 0








}: {to: string;icon: React.ReactNode;label: string;active: boolean;collapsed: boolean;onClick?: () => void;delay?: number;}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ease-apple",
        active ?
        "bg-primary text-primary-foreground" :
        "text-muted-foreground hover:text-primary-foreground hover:bg-primary",
        collapsed && "justify-center px-2"
      )}
      style={{ animationDelay: `${delay}ms` }}>

      <span className={cn(
        "transition-transform duration-200",
        active && "scale-105",
        !active && "group-hover:scale-105"
      )}>
        {icon}
      </span>
      {!collapsed &&
      <span className={cn(
        "text-sm font-medium transition-colors",
        active && "font-semibold"
      )}>
          {label}
        </span>
      }
      {active && !collapsed &&
      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
      }
    </NavLink>);

}

function UserMenu({
  profile,
  collapsed,
  signOut,
  getInitials





}: {profile: any;collapsed: boolean;signOut: () => void;getInitials: (name: string | null) => string;}) {
  return (
    <div className="p-3 border-t border-border/40">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 h-12 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-200",
              collapsed && "justify-center px-2"
            )}>

            <Avatar className="h-8 w-8 ring-2 ring-border/50">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                {getInitials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            {!collapsed &&
            <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground/70 truncate">
                  {profile?.email}
                </p>
              </div>
            }
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
            className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg mx-1 cursor-pointer">

            <LogOut className="mr-2 h-4 w-4" />
            Αποσύνδεση
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>);

}