import { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AppSidebar from './AppSidebar';
import TopBar from './TopBar';
import SecretaryPanel, { type RightPanelTab } from '@/components/secretary/SecretaryPanel';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Loader2 } from 'lucide-react';
import ChatFloatingBubbles from '@/components/chat/ChatFloatingBubbles';
import type { ImperativePanelHandle } from 'react-resizable-panels';

const PANEL_OPEN_KEY = 'secretary-panel-open';
const PANEL_TAB_KEY = 'secretary-panel-tab';
const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';
const SIDEBAR_SIZE_KEY = 'sidebar-panel-size';

const COLLAPSED_SIZE = 4; // percentage for icon-only sidebar
const DEFAULT_SIZE = 15;
const MIN_EXPANDED_SIZE = 12;
const MAX_SIZE = 25;

export default function AppLayout() {
  const { user, loading, companyRole, postLoginRoute } = useAuth();
  const sidebarRef = useRef<ImperativePanelHandle>(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'; } catch { return false; }
  });
  const [rightPanelOpen, setRightPanelOpen] = useState(() => {
    try { return localStorage.getItem(PANEL_OPEN_KEY) === 'true'; } catch { return false; }
  });
  const [activeTab, setActiveTab] = useState<RightPanelTab>(() => {
    try { return (localStorage.getItem(PANEL_TAB_KEY) as RightPanelTab) || 'secretary'; } catch { return 'secretary'; }
  });

  useEffect(() => {
    try { localStorage.setItem(PANEL_OPEN_KEY, String(rightPanelOpen)); } catch {}
  }, [rightPanelOpen]);

  useEffect(() => {
    try { localStorage.setItem(PANEL_TAB_KEY, activeTab); } catch {}
  }, [activeTab]);

  useEffect(() => {
    try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed)); } catch {}
  }, [sidebarCollapsed]);

  // When collapsed state changes, resize the panel
  useEffect(() => {
    if (sidebarRef.current) {
      if (sidebarCollapsed) {
        sidebarRef.current.resize(COLLAPSED_SIZE);
      } else {
        const savedSize = localStorage.getItem(SIDEBAR_SIZE_KEY);
        const size = savedSize ? Math.max(Number(savedSize), MIN_EXPANDED_SIZE) : DEFAULT_SIZE;
        sidebarRef.current.resize(size);
      }
    }
  }, [sidebarCollapsed]);

  // Handle panel resize - auto-collapse/expand based on size
  const handleSidebarResize = useCallback((size: number) => {
    if (!sidebarCollapsed && size <= COLLAPSED_SIZE + 1) {
      setSidebarCollapsed(true);
    } else if (sidebarCollapsed && size > COLLAPSED_SIZE + 2) {
      setSidebarCollapsed(false);
    }
    // Save expanded size for restore
    if (!sidebarCollapsed && size >= MIN_EXPANDED_SIZE) {
      try { localStorage.setItem(SIDEBAR_SIZE_KEY, String(size)); } catch {}
    }
  }, [sidebarCollapsed]);

  const toggleCollapsed = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

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
    if (postLoginRoute === '/select-workspace') {
      return <Navigate to="/select-workspace" replace />;
    }
    if (postLoginRoute === '/onboarding') {
      return <Navigate to="/onboarding" replace />;
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (postLoginRoute && postLoginRoute === '/select-workspace') {
    return <Navigate to="/select-workspace" replace />;
  }

  return (
    <div className="flex h-screen bg-background">
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Sidebar panel */}
        <ResizablePanel
          ref={sidebarRef}
          defaultSize={sidebarCollapsed ? COLLAPSED_SIZE : DEFAULT_SIZE}
          minSize={COLLAPSED_SIZE}
          maxSize={MAX_SIZE}
          collapsible
          collapsedSize={COLLAPSED_SIZE}
          onResize={handleSidebarResize}
          className="hidden md:block"
        >
          <AppSidebar collapsed={sidebarCollapsed} onToggleCollapse={toggleCollapsed} />
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

      {/* Floating Messenger-style chat windows */}
      <ChatFloatingBubbles />
    </div>
  );
}
