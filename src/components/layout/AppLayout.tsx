import { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AppSidebar from './AppSidebar';
import TopBar from './TopBar';
import SecretaryPanel, { type RightPanelTab } from '@/components/secretary/SecretaryPanel';
import VoiceCommandProvider, { useVoiceCommand } from '@/components/secretary/VoiceCommandProvider';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Loader2 } from 'lucide-react';
import ChatFloatingBubbles from '@/components/chat/ChatFloatingBubbles';
import QuickChatBar from '@/components/quick-chat/QuickChatBar';
import { FocusModeProvider } from '@/contexts/FocusContext';
import FocusOverlay from '@/components/focus/FocusOverlay';
import { LayoutProvider, useLayout } from '@/contexts/LayoutContext';
import { cn } from '@/lib/utils';

const PANEL_OPEN_KEY = 'secretary-panel-open';
const PANEL_TAB_KEY = 'secretary-panel-tab';
const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';
const SIDEBAR_WIDTH_KEY = 'sidebar-width';
const RIGHT_PANEL_WIDTH_KEY = 'right-panel-width';

// Fixed pixel widths
const SIDEBAR_EXPANDED_DEFAULT = 240;
const SIDEBAR_MIN_W = 200;
const SIDEBAR_MAX_W = 320;
const SIDEBAR_COLLAPSED_W = 60;
const SIDEBAR_COLLAPSE_THRESHOLD = 180;
const SIDEBAR_EXPAND_THRESHOLD = 120;

const RIGHT_PANEL_DEFAULT = 380;
const RIGHT_PANEL_MIN = 300;
const RIGHT_PANEL_MAX = 500;

function AppLayoutInner({ onRegisterOpenPanel }: { onRegisterOpenPanel?: (fn: (() => void) | null) => void }) {
  const { user, loading, companyRole, postLoginRoute } = useAuth();
  const { layoutState, sidebarMode, rightPanelMode, density } = useLayout();
  const { registerSendHandler } = useVoiceCommand();

  // Sidebar collapsed preference
  const [sidebarUserPref, setSidebarUserPref] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'; } catch { return false; }
  });

  const sidebarCollapsed = sidebarMode === 'collapsed' || (sidebarMode === 'expanded' && sidebarUserPref);

  // Sidebar width (when expanded)
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try { return Number(localStorage.getItem(SIDEBAR_WIDTH_KEY)) || SIDEBAR_EXPANDED_DEFAULT; } catch { return SIDEBAR_EXPANDED_DEFAULT; }
  });

  // Right panel
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<RightPanelTab>(() => {
    try { return (localStorage.getItem(PANEL_TAB_KEY) as RightPanelTab) || 'secretary'; } catch { return 'secretary'; }
  });
  const [rightPanelWidth, setRightPanelWidth] = useState(() => {
    try { return Number(localStorage.getItem(RIGHT_PANEL_WIDTH_KEY)) || RIGHT_PANEL_DEFAULT; } catch { return RIGHT_PANEL_DEFAULT; }
  });

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [quickChatOpen, setQuickChatOpen] = useState(false);
  const toggleQuickChat = useCallback(() => setQuickChatOpen(prev => !prev), []);

  // Persist to localStorage
  // Note: rightPanelOpen is intentionally NOT persisted — panel starts closed on every page load
  useEffect(() => { try { localStorage.setItem(PANEL_TAB_KEY, activeTab); } catch {} }, [activeTab]);
  useEffect(() => { try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarUserPref)); } catch {} }, [sidebarUserPref]);
  useEffect(() => { try { localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth)); } catch {} }, [sidebarWidth]);
  useEffect(() => { try { localStorage.setItem(RIGHT_PANEL_WIDTH_KEY, String(rightPanelWidth)); } catch {} }, [rightPanelWidth]);

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

  // Listen for sidebar secretary button
  useEffect(() => {
    const handler = () => {
      setRightPanelOpen(true);
      setActiveTab('secretary');
    };
    window.addEventListener('open-secretary-panel', handler);
    return () => window.removeEventListener('open-secretary-panel', handler);
  }, []);

  // Listen for secretary navigation events — navigate while keeping panel open
  const navigateRef = useRef(useNavigate());
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.path) {
        navigateRef.current(detail.path);
        // Keep/open secretary panel after navigation
        setRightPanelOpen(true);
        setActiveTab('secretary');
      }
    };
    window.addEventListener('secretary-navigate', handler);
    return () => window.removeEventListener('secretary-navigate', handler);
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

  // Register open panel for voice command
  useEffect(() => {
    if (onRegisterOpenPanel) {
      onRegisterOpenPanel(() => {
        setActiveTab('secretary');
        setRightPanelOpen(true);
      });
    }
    return () => onRegisterOpenPanel?.(null);
  }, [onRegisterOpenPanel]);

  // Close mobile sidebar on layout change
  useEffect(() => {
    if (sidebarMode !== 'hidden') setMobileSidebarOpen(false);
  }, [sidebarMode]);

  // ─── Sidebar resize ───
  const sidebarResizing = useRef(false);
  const sidebarStartX = useRef(0);
  const sidebarStartW = useRef(0);

  const onSidebarResizeStart = useCallback((e: React.MouseEvent) => {
    if (sidebarMode === 'hidden') return;
    e.preventDefault();
    sidebarResizing.current = true;
    sidebarStartX.current = e.clientX;
    sidebarStartW.current = sidebarCollapsed ? SIDEBAR_COLLAPSED_W : sidebarWidth;

    const onMove = (ev: MouseEvent) => {
      if (!sidebarResizing.current) return;
      const delta = ev.clientX - sidebarStartX.current;
      const newW = sidebarStartW.current + delta;

      if (sidebarCollapsed) {
        // Expanding from rail
        if (newW > SIDEBAR_EXPAND_THRESHOLD) {
          setSidebarUserPref(false);
          setSidebarWidth(Math.max(SIDEBAR_MIN_W, Math.min(SIDEBAR_MAX_W, newW)));
        }
      } else {
        // Collapsing or resizing
        if (newW < SIDEBAR_COLLAPSE_THRESHOLD) {
          setSidebarUserPref(true);
        } else {
          setSidebarWidth(Math.max(SIDEBAR_MIN_W, Math.min(SIDEBAR_MAX_W, newW)));
        }
      }
    };

    const onUp = () => {
      sidebarResizing.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [sidebarMode, sidebarCollapsed, sidebarWidth]);

  // ─── Right panel resize ───
  const rpResizing = useRef(false);
  const rpStartX = useRef(0);
  const rpStartW = useRef(0);

  const onRightPanelResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    rpResizing.current = true;
    rpStartX.current = e.clientX;
    rpStartW.current = rightPanelWidth;

    const onMove = (ev: MouseEvent) => {
      if (!rpResizing.current) return;
      const delta = rpStartX.current - ev.clientX; // dragging left = bigger
      const newW = rpStartW.current + delta;
      setRightPanelWidth(Math.max(RIGHT_PANEL_MIN, Math.min(RIGHT_PANEL_MAX, newW)));
    };

    const onUp = () => {
      rpResizing.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [rightPanelWidth]);

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

  const isMobile = layoutState === 'mobile';
  const isOverlay = rightPanelMode === 'overlay';
  const showDockedRightPanel = rightPanelOpen && !isMobile && !isOverlay;
  const showOverlayRightPanel = rightPanelOpen && !isMobile && isOverlay;
  const showDrawerRightPanel = rightPanelOpen && isMobile;

  const effectiveSidebarWidth = sidebarMode === 'hidden' ? 0 : sidebarCollapsed ? SIDEBAR_COLLAPSED_W : sidebarWidth;

    return (
    <div className={cn(
      "flex h-screen bg-background relative overflow-hidden",
      density === 'compact' ? 'density-compact' : 'density-comfortable'
    )}>
      {/* Mobile sidebar as Sheet */}
      {sidebarMode === 'hidden' && (
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent side="left" className="p-0 w-80 bg-card border-border/50">
            <AppSidebar collapsed={false} onToggleCollapse={() => setMobileSidebarOpen(false)} isMobileSheet />
          </SheetContent>
        </Sheet>
      )}

      {/* Sidebar — full height */}
      {sidebarMode !== 'hidden' && (
        <div
          className="h-full shrink-0 transition-[width] duration-200 ease-apple overflow-visible relative"
          style={{ width: effectiveSidebarWidth }}
        >
          <AppSidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={toggleCollapsed}
            forceCollapsed={sidebarMode === 'collapsed'}
          />
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors z-10"
            onMouseDown={onSidebarResizeStart}
          />
        </div>
      )}

      {/* Middle column: TopBar + Content */}
      <div className="flex-1 min-w-0 flex flex-col h-full">
        <TopBar
          onPanelToggle={togglePanelSimple}
          rightPanelOpen={rightPanelOpen}
          onMobileMenuToggle={() => setMobileSidebarOpen(true)}
          showHamburger={sidebarMode === 'hidden'}
          onQuickChatToggle={toggleQuickChat}
        />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Docked right panel — full height */}
      {showDockedRightPanel && (
        <div
          className="h-full shrink-0 overflow-hidden relative"
          style={{ width: rightPanelWidth }}
        >
          <div
            className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors z-10"
            onMouseDown={onRightPanelResizeStart}
          />
          <SecretaryPanel activeTab={activeTab} onTabChange={setActiveTab} onClose={closePanel} registerSendHandler={registerSendHandler} />
        </div>
      )}

      {/* Overlay right panel */}
      {showOverlayRightPanel && (
        <>
          <div className="fixed inset-0 bg-black/20 z-30" onClick={closePanel} />
          <div
            className="fixed top-0 right-0 h-full z-40 shadow-2xl"
            style={{ width: Math.min(rightPanelWidth, 400) }}
          >
            <SecretaryPanel activeTab={activeTab} onTabChange={setActiveTab} onClose={closePanel} registerSendHandler={registerSendHandler} />
          </div>
        </>
      )}

      {/* Mobile drawer right panel */}
      {showDrawerRightPanel && (
        <Sheet open={true} onOpenChange={(open) => !open && closePanel()}>
          <SheetContent side="right" className="p-0 w-[90vw] max-w-[400px]">
            <SecretaryPanel activeTab={activeTab} onTabChange={setActiveTab} onClose={closePanel} registerSendHandler={registerSendHandler} />
          </SheetContent>
        </Sheet>
      )}

      <ChatFloatingBubbles />
      <FocusOverlay />
      <QuickChatBar isOpen={quickChatOpen} onToggle={toggleQuickChat} />
    </div>
  );
}

function AppLayoutWithVoice() {
  const [openPanelFn, setOpenPanelFn] = useState<(() => void) | null>(null);

  return (
    <VoiceCommandProvider onOpenSecretaryPanel={() => openPanelFn?.()}>
      <AppLayoutInner onRegisterOpenPanel={setOpenPanelFn} />
    </VoiceCommandProvider>
  );
}

export default function AppLayout() {
  return (
    <FocusModeProvider>
      <LayoutProvider>
        <AppLayoutWithVoice />
      </LayoutProvider>
    </FocusModeProvider>
  );
}
