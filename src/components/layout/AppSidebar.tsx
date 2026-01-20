import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
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
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'Διαγωνισμοί', href: '/tenders', icon: FileText, roles: ['admin', 'manager'] },
  { title: 'Έργα', href: '/projects', icon: FolderKanban },
  { title: 'Tasks', href: '/tasks', icon: CheckSquare },
  { title: 'Ομάδες', href: '/teams', icon: Users, roles: ['admin', 'manager'] },
  { title: 'P&L', href: '/financials', icon: DollarSign, roles: ['admin', 'manager'] },
];

const adminNavItems: NavItem[] = [
  { title: 'Χρήστες', href: '/users', icon: UserCog, roles: ['admin'] },
  { title: 'Πελάτες', href: '/clients', icon: Building2, roles: ['admin', 'manager'] },
  { title: 'Ρυθμίσεις', href: '/settings', icon: Settings, roles: ['admin'] },
];

export default function AppSidebar() {
  const location = useLocation();
  const { profile, roles, signOut, isAdmin, isManager, isClient } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const canAccess = (item: NavItem) => {
    if (!item.roles) return true;
    return item.roles.some(role => roles.includes(role as any));
  };

  // Client users see a different sidebar
  if (isClient && !isAdmin && !isManager) {
    return (
      <aside className={cn(
        "h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300",
        collapsed ? "w-[70px]" : "w-64"
      )}>
        <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-sidebar-foreground">Portal</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <SidebarLink
            to="/"
            icon={<LayoutDashboard className="h-5 w-5" />}
            label="Τα Έργα μου"
            active={location.pathname === '/'}
            collapsed={collapsed}
          />
          <SidebarLink
            to="/tasks"
            icon={<CheckSquare className="h-5 w-5" />}
            label="Παραδοτέα"
            active={location.pathname === '/tasks'}
            collapsed={collapsed}
          />
        </nav>

        <UserMenu profile={profile} collapsed={collapsed} signOut={signOut} getInitials={getInitials} />
      </aside>
    );
  }

  return (
    <aside className={cn(
      "h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300",
      collapsed ? "w-[70px]" : "w-64"
    )}>
      {/* Logo */}
      <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-sidebar-foreground">Agency CMD</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.filter(canAccess).map((item) => (
          <SidebarLink
            key={item.href}
            to={item.href}
            icon={<item.icon className="h-5 w-5" />}
            label={item.title}
            active={location.pathname === item.href}
            collapsed={collapsed}
          />
        ))}

        {/* Admin Section */}
        {(isAdmin || isManager) && (
          <>
            <div className={cn(
              "pt-4 pb-2",
              collapsed ? "px-2" : "px-3"
            )}>
              {!collapsed && (
                <span className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
                  Διαχείριση
                </span>
              )}
              {collapsed && <div className="h-px bg-sidebar-border" />}
            </div>
            {adminNavItems.filter(canAccess).map((item) => (
              <SidebarLink
                key={item.href}
                to={item.href}
                icon={<item.icon className="h-5 w-5" />}
                label={item.title}
                active={location.pathname === item.href}
                collapsed={collapsed}
              />
            ))}
          </>
        )}
      </nav>

      {/* User Menu */}
      <UserMenu profile={profile} collapsed={collapsed} signOut={signOut} getInitials={getInitials} />
    </aside>
  );
}

function SidebarLink({
  to,
  icon,
  label,
  active,
  collapsed,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <NavLink
      to={to}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        collapsed && "justify-center px-2"
      )}
    >
      {icon}
      {!collapsed && <span className="text-sm font-medium">{label}</span>}
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
    <div className="p-3 border-t border-sidebar-border">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent",
              collapsed && "justify-center px-2"
            )}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {getInitials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 text-left">
                <p className="text-sm font-medium truncate">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  {profile?.email}
                </p>
              </div>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span>{profile?.full_name || 'User'}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {profile?.email}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} className="text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Αποσύνδεση
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
