import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  Moon,
  Sun,
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
  { title: 'Ρυθμίσεις', href: '/settings', icon: Settings },
];

export default function AppSidebar() {
  const location = useLocation();
  const { profile, roles, signOut, isAdmin, isManager, isClient } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const canAccess = (item: NavItem) => {
    if (!item.roles) return true;
    return item.roles.some(role => roles.includes(role as any));
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {/* Logo */}
      <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
        {(!collapsed || isMobile) && (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-sidebar-foreground">
              {isClient && !isAdmin && !isManager ? 'Portal' : 'Agency CMD'}
            </span>
          </div>
        )}
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground hover:bg-sidebar-accent hidden md:flex"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {isClient && !isAdmin && !isManager ? (
          // Client navigation
          <>
            <SidebarLink
              to="/"
              icon={<LayoutDashboard className="h-5 w-5" />}
              label="Τα Έργα μου"
              active={location.pathname === '/'}
              collapsed={collapsed && !isMobile}
              onClick={() => isMobile && setMobileOpen(false)}
            />
            <SidebarLink
              to="/tasks"
              icon={<CheckSquare className="h-5 w-5" />}
              label="Παραδοτέα"
              active={location.pathname === '/tasks'}
              collapsed={collapsed && !isMobile}
              onClick={() => isMobile && setMobileOpen(false)}
            />
          </>
        ) : (
          // Admin/Manager/Employee navigation
          <>
            {navItems.filter(canAccess).map((item) => (
              <SidebarLink
                key={item.href}
                to={item.href}
                icon={<item.icon className="h-5 w-5" />}
                label={item.title}
                active={location.pathname === item.href}
                collapsed={collapsed && !isMobile}
                onClick={() => isMobile && setMobileOpen(false)}
              />
            ))}

            {/* Admin Section */}
            {(isAdmin || isManager) && (
              <>
                <div className={cn(
                  "pt-4 pb-2",
                  (collapsed && !isMobile) ? "px-2" : "px-3"
                )}>
                  {(!collapsed || isMobile) && (
                    <span className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
                      Διαχείριση
                    </span>
                  )}
                  {(collapsed && !isMobile) && <div className="h-px bg-sidebar-border" />}
                </div>
                {adminNavItems.filter(canAccess).map((item) => (
                  <SidebarLink
                    key={item.href}
                    to={item.href}
                    icon={<item.icon className="h-5 w-5" />}
                    label={item.title}
                    active={location.pathname === item.href}
                    collapsed={collapsed && !isMobile}
                    onClick={() => isMobile && setMobileOpen(false)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </nav>

      {/* Theme Toggle */}
      <div className={cn(
        "p-3 border-t border-sidebar-border",
        (collapsed && !isMobile) && "flex justify-center"
      )}>
        <Button
          variant="ghost"
          size={collapsed && !isMobile ? "icon" : "default"}
          className={cn(
            "text-sidebar-foreground hover:bg-sidebar-accent",
            (!collapsed || isMobile) && "w-full justify-start gap-3"
          )}
          onClick={toggleTheme}
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
          {(!collapsed || isMobile) && (
            <span className="text-sm">{resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          )}
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
        getInitials={getInitials} 
      />
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="bg-background">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 bg-sidebar border-sidebar-border">
            <div className="h-full flex flex-col">
              <SidebarContent isMobile />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className={cn(
        "h-screen bg-sidebar border-r border-sidebar-border flex-col transition-all duration-300 hidden md:flex",
        collapsed ? "w-[70px]" : "w-64"
      )}>
        <SidebarContent />
      </aside>
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
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
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
              <div className="flex-1 text-left min-w-0">
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
