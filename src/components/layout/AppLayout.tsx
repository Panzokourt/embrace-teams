import { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AppSidebar from './AppSidebar';
import TopBar from './TopBar';
import SecretaryPanel, { type RightPanelTab } from '@/components/secretary/SecretaryPanel';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Loader2 } from 'lucide-react';
import ChatFloatingBubbles from '@/components/chat/ChatFloatingBubbles';
import { FocusModeProvider } from '@/contexts/FocusContext';
import FocusOverlay from '@/components/focus/FocusOverlay';
import { LayoutProvider, useLayout } from '@/contexts/LayoutContext';
import { cn } from '@/lib/utils';

const PANEL_OPEN_KEY = 'secretary-panel-open';
const PANEL_TAB_KEY = 'secretary-panel-tab';
const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

// Fixed pixel widths for sidebar
const SIDEBAR_EXPANDED_W = 240; // px - rail (48) + panel (~192)
const SIDEBAR_COLLAPSED_W = 48;  // px - rail only
const RIGHT_PANEL_W = 380;       // px
const MIN_MAIN_CONTENT_W = 600;  // px - safe minimum

function AppLayoutInner() {
  const { user, loading, companyRole, postLoginRoute } = useAuth();
  const { layoutState, sidebarMode, rightPanelMode, density } = useLayout();

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
  const showOverlayRightPanel = rightPanelOpen && (rightPanelMode === 'overlay');
  const showDrawerRightPanel = rightPanelOpen && rightPanelMode === 'drawer';

  const sidebarWidth = sidebarMode === 'hidden' ? 0 : sidebarCollapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_EXPANDED_W;

  return (
    <div className={cn(
      "flex h-screen bg-background relative overflow-hidden",
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

      {/* Sidebar — fixed width, not resizable */}
      {sidebarMode !== 'hidden' && (
        <div
          className="h-full shrink-0 transition-[width] duration-200 ease-apple overflow-hidden"
          style={{ width: sidebarWidth }}
        >
          <AppSidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={toggleCollapsed}
            forceCollapsed={sidebarMode === 'collapsed'}
          />
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 min-w-0 flex flex-col h-full">
        <TopBar
          onPanelToggle={togglePanelSimple}
          rightPanelOpen={rightPanelOpen}
          onMobileMenuToggle={() => setMobileSidebarOpen(true)}
          showHamburger={sidebarMode === 'hidden'}
        />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* STATE A: Docked right panel */}
      {showDockedRightPanel && (
        <div
          className="h-full shrink-0 border-l border-border/40 overflow-hidden"
          style={{ width: RIGHT_PANEL_W }}
        >
          <SecretaryPanel activeTab={activeTab} onTabChange={setActiveTab} onClose={closePanel} />
        </div>
      )}

      {/* STATE B/C: Overlay right panel */}
      {showOverlayRightPanel && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={closePanel} />
          <div className="fixed top-0 right-0 z-50 h-full w-[400px] max-w-[85vw] animate-slide-in-right shadow-2xl">
            <SecretaryPanel activeTab={activeTab} onTabChange={setActiveTab} onClose={closePanel} />
          </div>
        </>
      )}

      {/* STATE D: Drawer right panel */}
      {showDrawerRightPanel && (
        <Sheet open={true} onOpenChange={(open) => !open && closePanel()}>
          <SheetContent side="right" className="p-0 w-[90vw] max-w-[400px]">
            <SecretaryPanel activeTab={activeTab} onTabChange={setActiveTab} onClose={closePanel} />
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
