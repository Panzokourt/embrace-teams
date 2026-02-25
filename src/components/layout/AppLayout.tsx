import { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AppSidebar from './AppSidebar';
import TopBar from './TopBar';
import SecretaryPanel, { type RightPanelTab } from '@/components/secretary/SecretaryPanel';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Loader2 } from 'lucide-react';
import ChatFloatingBubbles from '@/components/chat/ChatFloatingBubbles';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { FocusModeProvider } from '@/contexts/FocusContext';
import FocusOverlay from '@/components/focus/FocusOverlay';
import { LayoutProvider, useLayout } from '@/contexts/LayoutContext';
import { cn } from '@/lib/utils';

const PANEL_OPEN_KEY = 'secretary-panel-open';
const PANEL_TAB_KEY = 'secretary-panel-tab';
const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';
const SIDEBAR_SIZE_KEY = 'sidebar-panel-size';

const COLLAPSED_SIZE = 4;
const DEFAULT_SIZE = 15;
const MIN_EXPANDED_SIZE = 12;
const MAX_SIZE = 25;

function AppLayoutInner() {
  const { user, loading, companyRole, postLoginRoute } = useAuth();
  const { layoutState, sidebarMode, rightPanelMode, density } = useLayout();
  const sidebarRef = useRef<ImperativePanelHandle>(null);

  // User preference for sidebar collapse (only applies in wide/standard)
  const [sidebarUserPref, setSidebarUserPref] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'; } catch { return false; }
  });

  // Effective sidebar collapsed state
  const sidebarCollapsed = sidebarMode === 'collapsed' || (sidebarMode === 'expanded' && sidebarUserPref);

  const [rightPanelOpen, setRightPanelOpen] = useState(() => {
    try { return localStorage.getItem(PANEL_OPEN_KEY) === 'true'; } catch { return false; }
  });
  const [activeTab, setActiveTab] = useState<RightPanelTab>(() => {
    try { return (localStorage.getItem(PANEL_TAB_KEY) as RightPanelTab) || 'secretary'; } catch { return 'secretary'; }
  });

  // Mobile sidebar state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(PANEL_OPEN_KEY, String(rightPanelOpen)); } catch {}
  }, [rightPanelOpen]);

  useEffect(() => {
    try { localStorage.setItem(PANEL_TAB_KEY, activeTab); } catch {}
  }, [activeTab]);

  useEffect(() => {
    try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarUserPref)); } catch {}
  }, [sidebarUserPref]);

  // When collapsed state changes, resize the panel (only for docked sidebar)
  useEffect(() => {
    if (sidebarRef.current && sidebarMode !== 'hidden') {
      if (sidebarCollapsed) {
        sidebarRef.current.resize(COLLAPSED_SIZE);
      } else {
        const savedSize = localStorage.getItem(SIDEBAR_SIZE_KEY);
        const size = savedSize ? Math.max(Number(savedSize), MIN_EXPANDED_SIZE) : DEFAULT_SIZE;
        sidebarRef.current.resize(size);
      }
    }
  }, [sidebarCollapsed, sidebarMode]);

  const handleSidebarResize = useCallback((size: number) => {
    if (!sidebarCollapsed && size <= COLLAPSED_SIZE + 1) {
      setSidebarUserPref(true);
    } else if (sidebarCollapsed && size > COLLAPSED_SIZE + 2) {
      setSidebarUserPref(false);
    }
    if (!sidebarCollapsed && size >= MIN_EXPANDED_SIZE) {
      try { localStorage.setItem(SIDEBAR_SIZE_KEY, String(size)); } catch {}
    }
  }, [sidebarCollapsed]);

  const toggleCollapsed = useCallback(() => {
    setSidebarUserPref(prev => !prev);
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

  // Close mobile sidebar on layout change
  useEffect(() => {
    if (sidebarMode !== 'hidden') setMobileSidebarOpen(false);
  }, [sidebarMode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (!companyRole) {
    if (postLoginRoute === '/select-workspace') return <Navigate to="/select-workspace" replace />;
    if (postLoginRoute === '/onboarding') return <Navigate to="/onboarding" replace />;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  if (postLoginRoute === '/select-workspace') return <Navigate to="/select-workspace" replace />;

  const showDockedRightPanel = rightPanelOpen && rightPanelMode === 'docked';
  const showOverlayRightPanel = rightPanelOpen && rightPanelMode === 'overlay';
  const showDrawerRightPanel = rightPanelOpen && rightPanelMode === 'drawer';

  return (
    <div className={cn(
      "flex h-screen bg-background relative",
      density === 'compact' ? 'density-compact' : 'density-comfortable'
    )}>
      {/* STATE D: Mobile sidebar as Sheet */}
      {sidebarMode === 'hidden' && (
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent side="left" className="p-0 w-80 bg-card border-border/50">
            <AppSidebar collapsed={false} onToggleCollapse={() => setMobileSidebarOpen(false)} isMobileSheet />
          </SheetContent>
        </Sheet>
      )}

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Sidebar panel — hidden on mobile */}
        {sidebarMode !== 'hidden' && (
          <>
            <ResizablePanel
              ref={sidebarRef}
              defaultSize={sidebarCollapsed ? COLLAPSED_SIZE : DEFAULT_SIZE}
              minSize={COLLAPSED_SIZE}
              maxSize={MAX_SIZE}
              collapsible
              collapsedSize={COLLAPSED_SIZE}
              onResize={handleSidebarResize}
            >
              <AppSidebar
                collapsed={sidebarCollapsed}
                onToggleCollapse={toggleCollapsed}
                forceCollapsed={sidebarMode === 'collapsed'}
              />
            </ResizablePanel>
            <ResizableHandle />
          </>
        )}

        {/* Main content */}
        <ResizablePanel defaultSize={showDockedRightPanel ? 55 : 85} minSize={30}>
          <main className="h-full overflow-auto flex flex-col">
            <TopBar
              onPanelToggle={togglePanelSimple}
              rightPanelOpen={rightPanelOpen}
              onMobileMenuToggle={() => setMobileSidebarOpen(true)}
              showHamburger={sidebarMode === 'hidden'}
            />
            <div className="flex-1">
              <Outlet />
            </div>
          </main>
        </ResizablePanel>

        {/* STATE A: Docked right panel */}
        {showDockedRightPanel && (
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

      {/* STATE B/C: Overlay right panel */}
      {showOverlayRightPanel && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={closePanel}
          />
          <div className="fixed top-0 right-0 z-50 h-full w-[400px] max-w-[85vw] animate-slide-in-right shadow-2xl">
            <SecretaryPanel
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onClose={closePanel}
            />
          </div>
        </>
      )}

      {/* STATE D: Drawer right panel */}
      {showDrawerRightPanel && (
        <Sheet open={true} onOpenChange={(open) => !open && closePanel()}>
          <SheetContent side="right" className="p-0 w-[90vw] max-w-[400px]">
            <SecretaryPanel
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onClose={closePanel}
            />
          </SheetContent>
        </Sheet>
      )}

      <ChatFloatingBubbles />
      <FocusOverlay />
    </div>
  );
}

export default function AppLayout() {
  return (
    <FocusModeProvider>
      <LayoutProvider>
        <AppLayoutInner />
      </LayoutProvider>
    </FocusModeProvider>
  );
}
