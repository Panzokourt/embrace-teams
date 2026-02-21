import { useState, useEffect, useCallback } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AppSidebar from './AppSidebar';
import TopBar from './TopBar';
import SecretaryPanel, { type RightPanelTab } from '@/components/secretary/SecretaryPanel';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Loader2 } from 'lucide-react';

const PANEL_OPEN_KEY = 'secretary-panel-open';
const PANEL_TAB_KEY = 'secretary-panel-tab';

export default function AppLayout() {
  const { user, loading, companyRole, postLoginRoute } = useAuth();
  const [rightPanelOpen, setRightPanelOpen] = useState(() => {
    try { return localStorage.getItem(PANEL_OPEN_KEY) === 'true'; } catch { return false; }
  });
  const [activeTab, setActiveTab] = useState<RightPanelTab>(() => {
    try { return (localStorage.getItem(PANEL_TAB_KEY) as RightPanelTab) || 'secretary'; } catch { return 'secretary'; }
  });

  useEffect(() => {
    try {
      localStorage.setItem(PANEL_OPEN_KEY, String(rightPanelOpen));
    } catch {}
  }, [rightPanelOpen]);

  useEffect(() => {
    try {
      localStorage.setItem(PANEL_TAB_KEY, activeTab);
    } catch {}
  }, [activeTab]);

  // Cmd+J shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        setRightPanelOpen(prev => !prev);
        setActiveTab('secretary');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const togglePanel = useCallback((tab: RightPanelTab) => {
    if (rightPanelOpen && activeTab === tab) {
      setRightPanelOpen(false);
    } else {
      setActiveTab(tab);
      setRightPanelOpen(true);
    }
  }, [rightPanelOpen, activeTab]);

  const closePanel = useCallback(() => setRightPanelOpen(false), []);
  const togglePanelSimple = useCallback(() => setRightPanelOpen(prev => !prev), []);

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

  if (!companyRole) {
    window.location.replace('/onboarding');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (postLoginRoute && postLoginRoute !== '/') {
    window.location.replace(postLoginRoute);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Sidebar panel */}
        <ResizablePanel defaultSize={15} minSize={5} maxSize={25} className="hidden md:block">
          <AppSidebar />
        </ResizablePanel>
        <ResizableHandle className="hidden md:flex" />

        {/* Main content */}
        <ResizablePanel defaultSize={rightPanelOpen ? 55 : 85} minSize={30}>
          <main className="h-full overflow-auto flex flex-col">
            <TopBar
              onPanelToggle={togglePanelSimple}
              rightPanelOpen={rightPanelOpen}
            />
            <div className="flex-1">
              <Outlet />
            </div>
          </main>
        </ResizablePanel>

        {rightPanelOpen && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={30} minSize={20} maxSize={45}>
              <SecretaryPanel
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onClose={closePanel}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
