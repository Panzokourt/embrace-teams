import { createContext, useContext, useEffect, useState, useMemo, useCallback, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCoach } from '@/hooks/useCoach';
import { COACHING_REGISTRY, filterCoachingForRole, findCoachForRoute, type CoachEntry } from '@/lib/coaching/registry';
import CoachPopover from './CoachPopover';
import CoachTour from './CoachTour';

interface CoachingCtx {
  /** Manually trigger a coach by key (forces it even if already seen). */
  trigger: (key: string) => void;
  /** Restart all tours (clears seen state). */
  restartAll: () => Promise<void>;
  /** Whether the user has globally disabled coaching. */
  disabled: boolean;
  setDisabled: (v: boolean) => void;
}

const Ctx = createContext<CoachingCtx | null>(null);

const DISABLE_KEY = 'coaching:disabled';

export function CoachingProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { companyRole, user } = useAuth();
  const { hasSeen, markSeen, reset, loading } = useCoach();

  const [active, setActive] = useState<CoachEntry | null>(null);
  const [forced, setForced] = useState(false);
  const [disabled, setDisabledState] = useState<boolean>(() => {
    try { return localStorage.getItem(DISABLE_KEY) === 'true'; } catch { return false; }
  });

  const setDisabled = useCallback((v: boolean) => {
    setDisabledState(v);
    try { localStorage.setItem(DISABLE_KEY, String(v)); } catch {}
  }, []);

  const filteredRegistry = useMemo(
    () => filterCoachingForRole(COACHING_REGISTRY, companyRole?.role ?? null),
    [companyRole?.role]
  );

  // Route-driven trigger
  useEffect(() => {
    if (!user || loading || disabled || active) return;
    const entry = findCoachForRoute(filteredRegistry, location.pathname);
    if (entry && !hasSeen(entry.key)) {
      // Slight delay so the page can render first
      const t = setTimeout(() => setActive(entry), 600);
      return () => clearTimeout(t);
    }
  }, [location.pathname, user, loading, disabled, filteredRegistry, hasSeen, active]);

  const trigger = useCallback((key: string) => {
    const entry = COACHING_REGISTRY.find((e) => e.key === key);
    if (!entry) return;
    setForced(true);
    setActive(entry);
  }, []);

  const handleDismiss = useCallback(() => {
    if (active) markSeen(active.key, true);
    setActive(null);
    setForced(false);
  }, [active, markSeen]);

  const handleComplete = useCallback(() => {
    if (active) markSeen(active.key, false);
    setActive(null);
    setForced(false);
  }, [active, markSeen]);

  const restartAll = useCallback(async () => {
    await reset();
  }, [reset]);

  const value = useMemo<CoachingCtx>(() => ({ trigger, restartAll, disabled, setDisabled }), [trigger, restartAll, disabled, setDisabled]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {active && (
        active.type === 'tour' && active.steps?.length ? (
          <CoachTour
            title={active.title}
            body={active.body}
            steps={active.steps}
            onDismiss={handleDismiss}
            onComplete={handleComplete}
          />
        ) : (
          <CoachPopover
            title={active.title}
            body={active.body}
            cta={active.cta}
            onDismiss={handleDismiss}
          />
        )
      )}
    </Ctx.Provider>
  );
}

export function useCoaching(): CoachingCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Safe default — coaching is optional infrastructure
    return {
      trigger: () => {},
      restartAll: async () => {},
      disabled: true,
      setDisabled: () => {},
    };
  }
  return ctx;
}
