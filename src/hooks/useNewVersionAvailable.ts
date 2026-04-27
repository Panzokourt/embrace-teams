import { useEffect, useRef, useState } from 'react';

const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const VERSION_URL = '/version.json';

declare const __BUILD_ID__: string;

interface VersionInfo {
  buildId: string;
  builtAt?: string;
}

/**
 * Polls /version.json and returns true when a newer build is detected.
 * Skips entirely in development.
 */
export function useNewVersionAvailable(): {
  hasUpdate: boolean;
  reload: () => void;
  dismiss: () => void;
} {
  const [hasUpdate, setHasUpdate] = useState(false);
  const currentBuildId = useRef<string | null>(null);
  const dismissedFor = useRef<string | null>(null);

  useEffect(() => {
    // Skip in dev
    if (typeof __BUILD_ID__ === 'undefined' || __BUILD_ID__ === 'dev') {
      return;
    }

    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'cache-control': 'no-cache' },
        });
        if (!res.ok) return;
        const data: VersionInfo = await res.json();
        if (cancelled || !data?.buildId) return;

        if (currentBuildId.current === null) {
          currentBuildId.current = data.buildId;
          return;
        }

        if (
          data.buildId !== currentBuildId.current &&
          data.buildId !== dismissedFor.current
        ) {
          setHasUpdate(true);
        }
      } catch {
        // ignore — offline or transient
      }
    };

    // Initial fetch sets the baseline
    check();

    const interval = setInterval(check, POLL_INTERVAL_MS);

    const onFocus = () => check();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const reload = () => {
    // Hard reload to bypass cache
    window.location.reload();
  };

  const dismiss = () => {
    // Remember this build id so we don't nag again until next deploy
    if (currentBuildId.current) {
      dismissedFor.current = currentBuildId.current;
    }
    setHasUpdate(false);
  };

  return { hasUpdate, reload, dismiss };
}
