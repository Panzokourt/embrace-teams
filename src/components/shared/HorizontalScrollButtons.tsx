import { useEffect, useState, type RefObject } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StickyHorizontalScrollHandle } from './StickyHorizontalScroll';

interface HorizontalScrollButtonsProps {
  containerRef: RefObject<StickyHorizontalScrollHandle | null>;
  /** Pixels per click (default 320). */
  step?: number;
  className?: string;
}

/**
 * Toolbar buttons that let users scroll a horizontal table left/right
 * without touching the scrollbar. Auto-hides if the container does not
 * overflow.
 */
export function HorizontalScrollButtons({
  containerRef,
  step = 320,
  className,
}: HorizontalScrollButtonsProps) {
  const [overflow, setOverflow] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const handle = containerRef.current;
    const el = handle?.getScrollEl();
    if (!el) return;

    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      setOverflow(max > 1);
      setAtStart(el.scrollLeft <= 0);
      setAtEnd(el.scrollLeft >= max - 1);
    };

    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c as Element));
    window.addEventListener('resize', update);

    // Re-check briefly after mount in case children render late
    const t = setTimeout(update, 100);

    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
      window.removeEventListener('resize', update);
      clearTimeout(t);
    };
  }, [containerRef]);

  if (!overflow) return null;

  const scroll = (dir: 1 | -1) => {
    containerRef.current?.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => scroll(-1)}
        disabled={atStart}
        aria-label="Scroll αριστερά"
        title="Scroll αριστερά"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => scroll(1)}
        disabled={atEnd}
        aria-label="Scroll δεξιά"
        title="Scroll δεξιά"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
