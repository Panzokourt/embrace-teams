import { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AppSidebar from './AppSidebar';
import TopBar from './TopBar';
import VoiceCommandProvider, { useVoiceCommand } from '@/components/secretary/VoiceCommandProvider';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Loader2 } from 'lucide-react';
import ChatFloatingBubbles from '@/components/chat/ChatFloatingBubbles';
import QuickChatBar from '@/components/quick-chat/QuickChatBar';
import { FocusModeProvider } from '@/contexts/FocusContext';
import FocusOverlay from '@/components/focus/FocusOverlay';
import { LayoutProvider, useLayout } from '@/contexts/LayoutContext';
import { DockProvider, useDock } from '@/contexts/DockContext';
import { CoachingProvider } from '@/components/coaching/CoachingProvider';
import FloatingDock from '@/components/dock/FloatingDock';
import { cn } from '@/lib/utils';

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';
const SIDEBAR_WIDTH_KEY = 'sidebar-width';

// Fixed pixel widths
const SIDEBAR_EXPANDED_DEFAULT = 240;
const SIDEBAR_MIN_W = 200;
const SIDEBAR_MAX_W = 320;
const SIDEBAR_COLLAPSED_W = 80;
const SIDEBAR_COLLAPSE_THRESHOLD = 180;
const SIDEBAR_EXPAND_THRESHOLD = 120;

function AppLayoutInner({ onRegisterOpenPanel }: { onRegisterOpenPanel?: (fn: (() => void) | null) => void }) {
  const { user, loading, companyRole, postLoginRoute } = useAuth();
  const { layoutState, sidebarMode, density } = useLayout();
  const { registerSendHandler } = useVoiceCommand();
  const { openPanel, notifyQuickChatOpened } = useDock();

  // Sidebar collapsed preference
  const [sidebarUserPref, setSidebarUserPref] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'; } catch { return false; }
  });

  const sidebarCollapsed = sidebarMode === 'collapsed' || (sidebarMode === 'expanded' && sidebarUserPref);

  // Sidebar width (when expanded)
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try { return Number(localStorage.getItem(SIDEBAR_WIDTH_KEY)) || SIDEBAR_EXPANDED_DEFAULT; } catch { return SIDEBAR_EXPANDED_DEFAULT; }
  });

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [quickChatOpen, setQuickChatOpen] = useState(false);

  const toggleQuickChat = useCallback(() => {
    setQuickChatOpen(prev => {
      const next = !prev;
      if (next) notifyQuickChatOpened();
      return next;
    });
  }, [notifyQuickChatOpened]);

  // When dock panel opens → close QuickChatBar (mutual exclusion)
  useEffect(() => {
    const handler = () => setQuickChatOpen(false);
    window.addEventListener('dock-panel-opened', handler);
    return () => window.removeEventListener('dock-panel-opened', handler);
  }, []);

  // Persist
  useEffect(() => { try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarUserPref)); } catch {} }, [sidebarUserPref]);
  useEffect(() => { try { localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth)); } catch {} }, [sidebarWidth]);

  const toggleCollapsed = useCallback(() => setSidebarUserPref(prev => !prev), []);

  // Listen for secretary navigation events
  const navigateRef = useRef(useNavigate());
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.path) {
        navigateRef.current(detail.path);
      }
    };
    window.addEventListener('secretary-navigate', handler);
    return () => window.removeEventListener('secretary-navigate', handler);
  }, []);

  // Register open panel for voice command — now navigates to /secretary page
  useEffect(() => {
    if (onRegisterOpenPanel) {
      onRegisterOpenPanel(() => () => navigateRef.current('/secretary'));
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
        if (newW > SIDEBAR_EXPAND_THRESHOLD) {
          setSidebarUserPref(false);
          setSidebarWidth(Math.max(SIDEBAR_MIN_W, Math.min(SIDEBAR_MAX_W, newW)));
        }
      } else {
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

      {/* Sidebar */}
      {sidebarMode !== 'hidden' && (
        <div
          className="h-full shrink-0 transition-[width] duration-200 ease-apple overflow-visible relative z-30"
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

      {/* Middle column: TopBar + Content + Dock + QuickChat (centered within this column) */}
      <div className="flex-1 min-w-0 flex flex-col h-full relative">
        <TopBar
          onMobileMenuToggle={() => setMobileSidebarOpen(true)}
          showHamburger={sidebarMode === 'hidden'}
          onQuickChatToggle={toggleQuickChat}
        />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>

        {/* Floating dock + QuickChat — centered within main content area (not viewport) */}
        <FloatingDock onQuickChatToggle={toggleQuickChat} registerSendHandler={registerSendHandler} />
        <QuickChatBar isOpen={quickChatOpen} onToggle={toggleQuickChat} />
      </div>

      <ChatFloatingBubbles />
      <FocusOverlay />
    </div>
  );
}

function AppLayoutWithVoice() {
  const [openPanelFn, setOpenPanelFn] = useState<(() => void) | null>(null);

  const handleRegisterOpenPanel = useCallback((fn: (() => void) | null) => {
    setOpenPanelFn(() => fn);
  }, []);

  return (
    <VoiceCommandProvider onOpenSecretaryPanel={() => openPanelFn?.()}>
      <AppLayoutInner onRegisterOpenPanel={handleRegisterOpenPanel} />
    </VoiceCommandProvider>
  );
}

export default function AppLayout() {
  return (
    <FocusModeProvider>
      <LayoutProvider>
        <DockProvider>
          <CoachingProvider>
            <AppLayoutWithVoice />
          </CoachingProvider>
        </DockProvider>
      </LayoutProvider>
    </FocusModeProvider>
  );
}
