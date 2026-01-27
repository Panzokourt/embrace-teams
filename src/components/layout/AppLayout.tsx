import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AppSidebar from './AppSidebar';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Loader2 } from 'lucide-react';

export default function AppLayout() {
  const navigate = useNavigate();
  const { user, loading, isApproved } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto pt-16 md:pt-0 relative">
        {/* Top bar with notifications (visible on desktop) */}
        <div className="hidden md:flex absolute top-4 right-6 z-10">
          <NotificationBell />
        </div>
        {/* Mobile notification bell */}
        <div className="fixed top-4 right-4 z-50 md:hidden">
          <NotificationBell />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
