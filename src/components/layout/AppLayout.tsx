import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AppSidebar from './AppSidebar';
import { Loader2 } from 'lucide-react';

export default function AppLayout() {
  const navigate = useNavigate();
  const { user, loading, isApproved } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/auth');
      } else if (!isApproved) {
        navigate('/auth');
      }
    }
  }, [user, loading, isApproved, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isApproved) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background dark">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
