import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

export interface StickyHorizontalScrollHandle {
  /** The actual scroll container (the one with overflow-x-auto). */
  getScrollEl: () => HTMLDivElement | null;
  scrollBy: (options: ScrollToOptions) => void;
  scrollTo: (options: ScrollToOptions) => void;
}

interface StickyHorizontalScrollProps {
  children: ReactNode;
  className?: string;
  /** Optional className for the inner scrolling div. */
  innerClassName?: string;
}

/**
 * Wraps a horizontally-overflowing child (e.g. a wide <Table>) and renders a
 * sticky proxy scrollbar pinned to the bottom of the viewport whenever the
 * real scrollbar is not currently visible. Bi-directionally synced with the
 * real scroll container so users never need to scroll the page to find the
 * horizontal scrollbar.
 */
export const StickyHorizontalScroll = forwardRef<
  StickyHorizontalScrollHandle,
  StickyHorizontalScrollProps
>(({ children, className, innerClassName }, ref) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const proxyRef = useRef<HTMLDivElement>(null);
  const proxyInnerRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef<'real' | 'proxy' | null>(null);

  const [hasOverflow, setHasOverflow] = useState(false);
  const [nativeScrollbarVisible, setNativeScrollbarVisible] = useState(false);
  const [contentWidth, setContentWidth] = useState(0);
  const [proxyRect, setProxyRect] = useState<{ left: number; width: number } | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      getScrollEl: () => scrollRef.current,
      scrollBy: (options) => scrollRef.current?.scrollBy(options),
      scrollTo: (options) => scrollRef.current?.scrollTo(options),
    }),
    []
  );

  // Track overflow + sizes
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const update = () => {
      setContentWidth(el.scrollWidth);
      setHasOverflow(el.scrollWidth - el.clientWidth > 1);
      const rect = el.getBoundingClientRect();
      setProxyRect({ left: rect.left, width: rect.width });
      // Native scrollbar is "visible" only when the bottom of the scroll
      // container is itself within the viewport.
      const vh = window.innerHeight || document.documentElement.clientHeight;
      setNativeScrollbarVisible(rect.bottom <= vh && rect.bottom > 0);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    // Also observe children growth (e.g. table re-layout)
    Array.from(el.children).forEach((child) => ro.observe(child as Element));

    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, []);

  // Sync real -> proxy
  useEffect(() => {
    const real = scrollRef.current;
    const proxy = proxyRef.current;
    if (!real || !proxy) return;

    const onRealScroll = () => {
      if (syncingRef.current === 'proxy') {
        syncingRef.current = null;
        return;
      }
      syncingRef.current = 'real';
      proxy.scrollLeft = real.scrollLeft;
    };
    const onProxyScroll = () => {
      if (syncingRef.current === 'real') {
        syncingRef.current = null;
        return;
      }
      syncingRef.current = 'proxy';
      real.scrollLeft = proxy.scrollLeft;
    };

    real.addEventListener('scroll', onRealScroll, { passive: true });
    proxy.addEventListener('scroll', onProxyScroll, { passive: true });
    return () => {
      real.removeEventListener('scroll', onRealScroll);
      proxy.removeEventListener('scroll', onProxyScroll);
    };
  }, []);

  // Always show the proxy bar whenever there is horizontal overflow, so users
  // never have to scroll to the bottom of the page to find a scrollbar.
  // Always show the proxy bar whenever there is horizontal overflow AND the
  // real scrollbar is currently off-screen. This way users never have to
  // scroll the page down to find the horizontal scrollbar.
  const showProxy =
    hasOverflow && !nativeScrollbarVisible && proxyRect && proxyRect.width > 0;

  return (
    <>
      <div
        ref={scrollRef}
        className={cn('overflow-x-auto', innerClassName, className)}
      >
        {children}
      </div>

      {showProxy && (
        <div
          aria-hidden="true"
          className="fixed bottom-0 z-30 h-3.5 overflow-x-auto overflow-y-hidden border-t border-border bg-background/95 shadow-[0_-4px_12px_-2px_hsl(var(--foreground)/0.18)] backdrop-blur supports-[backdrop-filter]:bg-background/85 [&::-webkit-scrollbar]:h-3.5 [&::-webkit-scrollbar-track]:bg-muted/40 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-background hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/70"
          style={{
            left: proxyRect.left,
            width: proxyRect.width,
          }}
          ref={proxyRef}
        >
          <div
            ref={proxyInnerRef}
            style={{ width: contentWidth, height: 1 }}
          />
        </div>
      )}
    </>
  );
});

StickyHorizontalScroll.displayName = 'StickyHorizontalScroll';
