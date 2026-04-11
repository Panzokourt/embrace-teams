import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FolderKanban, FileText, Package, LogOut, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PortalClient {
  id: string;
  name: string;
  logo_url: string | null;
}

export default function ClientPortalLayout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [client, setClient] = useState<PortalClient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    fetchPortalAccess();
  }, [user]);

  const fetchPortalAccess = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('client_portal_users')
      .select('client_id, client:clients(id, name, logo_url)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (!data?.client) {
      navigate('/auth');
      return;
    }
    setClient(data.client as any);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Φόρτωση...</div>
      </div>
    );
  }

  const navItems = [
    { path: '/portal', icon: LayoutDashboard, label: 'Επισκόπηση' },
    { path: '/portal/projects', icon: FolderKanban, label: 'Έργα' },
    { path: '/portal/invoices', icon: FileText, label: 'Τιμολόγια' },
    { path: '/portal/files', icon: Package, label: 'Αρχεία' },
  ];

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border/40 bg-background/95 backdrop-blur-sm flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          {client?.logo_url && (
            <img src={client.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
          )}
          <div>
            <h1 className="text-sm font-semibold">{client?.name}</h1>
            <p className="text-[10px] text-muted-foreground">Client Portal</p>
          </div>
        </div>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/portal' && location.pathname.startsWith(item.path));
            return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn("gap-1.5 text-xs", isActive && "font-semibold")}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground" onClick={signOut}>
          <LogOut className="h-3.5 w-3.5" />
          Αποσύνδεση
        </Button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto p-6">
        <Outlet context={{ client }} />
      </main>
    </div>
  );
}
