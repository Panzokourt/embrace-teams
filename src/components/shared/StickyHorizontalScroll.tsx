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
  /** Force the floating proxy scrollbar to always render (debugging). */
  alwaysShowProxy?: boolean;
}

/** Find the nearest vertically-scrolling ancestor (the one whose own scrollbar
 *  the user has to interact with). Falls back to window. */
function getScrollParent(el: HTMLElement | null): HTMLElement | Window {
  let node: HTMLElement | null = el?.parentElement ?? null;
  while (node) {
    const style = getComputedStyle(node);
    const oy = style.overflowY;
    const canScroll =
      (oy === 'auto' || oy === 'scroll' || oy === 'overlay') &&
      node.scrollHeight > node.clientHeight;
    if (canScroll) return node;
    node = node.parentElement;
  }
  return window;
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
>(({ children, className, innerClassName, alwaysShowProxy = false }, ref) => {
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

  // Track overflow + sizes + native scrollbar visibility relative to the
  // nearest vertically-scrolling ancestor (typically <main>), not just window.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const scrollParent = getScrollParent(el);

    const update = () => {
      setContentWidth(el.scrollWidth);
      setHasOverflow(el.scrollWidth - el.clientWidth > 1);
      const rect = el.getBoundingClientRect();
      setProxyRect({ left: rect.left, width: rect.width });

      const parentBottom =
        scrollParent === window
          ? window.innerHeight || document.documentElement.clientHeight
          : (scrollParent as HTMLElement).getBoundingClientRect().bottom;
      const parentTop =
        scrollParent === window
          ? 0
          : (scrollParent as HTMLElement).getBoundingClientRect().top;

      // Native scrollbar is "visible" only when the bottom of the scroll
      // container is itself currently inside the visible area of its
      // scrolling ancestor.
      setNativeScrollbarVisible(rect.bottom <= parentBottom + 1 && rect.bottom > parentTop);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    Array.from(el.children).forEach((child) => ro.observe(child as Element));
    if (scrollParent !== window) ro.observe(scrollParent as HTMLElement);

    window.addEventListener('resize', update);
    // Listen to scroll on the real ancestor (e.g. <main className="overflow-auto">)
    // AND window, in capture mode, to catch scroll on any intermediate container.
    window.addEventListener('scroll', update, true);
    if (scrollParent !== window) {
      (scrollParent as HTMLElement).addEventListener('scroll', update, { passive: true });
    }

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      if (scrollParent !== window) {
        (scrollParent as HTMLElement).removeEventListener('scroll', update);
      }
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
  }, [hasOverflow]);

  // Show the proxy bar whenever there is horizontal overflow AND the real
  // scrollbar is currently off-screen (so the user can't reach it without
  // scrolling the page).
  const showProxy =
    (alwaysShowProxy || (hasOverflow && !nativeScrollbarVisible)) &&
    proxyRect &&
    proxyRect.width > 0;

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
