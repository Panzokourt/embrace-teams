import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AppSidebar from './AppSidebar';
import TopBar from './TopBar';
import { QuickActionButton } from '@/components/layout/QuickActionButton';
import { GlobalActivityFeed } from '@/components/activity/GlobalActivityFeed';
import { Loader2 } from 'lucide-react';

export default function AppLayout() {
  const { user, loading, isApproved, postLoginRoute } = useAuth();
  const [activityOpen, setActivityOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (postLoginRoute && postLoginRoute !== '/') {
    return <Navigate to={postLoginRoute} replace />;
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
