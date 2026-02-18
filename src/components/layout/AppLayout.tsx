import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AppSidebar from './AppSidebar';
import TopBar from './TopBar';
import { QuickActionButton } from '@/components/layout/QuickActionButton';
import { GlobalActivityFeed } from '@/components/activity/GlobalActivityFeed';
import { Loader2 } from 'lucide-react';

export default function AppLayout() {
  const navigate = useNavigate();
  const { user, loading, isApproved } = useAuth();
  const [activityOpen, setActivityOpen] = useState(false);

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
      <main className="flex-1 overflow-auto flex flex-col">
        <TopBar onActivityToggle={() => setActivityOpen(true)} />
        <div className="flex-1">
          <Outlet />
        </div>
      </main>
      <QuickActionButton />
      <GlobalActivityFeed open={activityOpen} onOpenChange={setActivityOpen} />
    </div>
  );
}
