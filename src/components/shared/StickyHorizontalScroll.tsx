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
  const [bottomVisible, setBottomVisible] = useState(true);
  const [contentWidth, setContentWidth] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
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
      setViewportWidth(el.clientWidth);
      setHasOverflow(el.scrollWidth - el.clientWidth > 1);
      const rect = el.getBoundingClientRect();
      setProxyRect({ left: rect.left, width: rect.width });
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

  // Track whether the bottom edge of the scroll container is in viewport
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Sentinel at the bottom of the scroll wrapper
    const sentinel = document.createElement('div');
    sentinel.style.position = 'absolute';
    sentinel.style.bottom = '0';
    sentinel.style.left = '0';
    sentinel.style.right = '0';
    sentinel.style.height = '1px';
    sentinel.style.pointerEvents = 'none';

    const wrapper = el.parentElement;
    if (!wrapper) return;
    const prevPosition = wrapper.style.position;
    if (!prevPosition) wrapper.style.position = 'relative';
    wrapper.appendChild(sentinel);

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => setBottomVisible(entry.isIntersecting));
      },
      { threshold: 0, rootMargin: '0px 0px -16px 0px' }
    );
    io.observe(sentinel);

    return () => {
      io.disconnect();
      sentinel.remove();
      wrapper.style.position = prevPosition;
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

  const showProxy = hasOverflow && !bottomVisible && proxyRect && proxyRect.width > 0;

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
          className="fixed bottom-0 z-30 h-3 overflow-x-auto overflow-y-hidden rounded-t border-t border-border/60 bg-background/95 shadow-[0_-2px_8px_-2px_hsl(var(--foreground)/0.15)] backdrop-blur supports-[backdrop-filter]:bg-background/80 [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-border hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50"
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
