import { useEffect, useState, type MouseEvent } from 'react';
import { ArrowUp } from 'lucide-react';

/**
 * Floating "back to top", shown once the element with id `after` has scrolled
 * out above the viewport. An IntersectionObserver, not a scroll listener: no
 * work while scrolling. A button, not a link to #top: it must not add a
 * history entry, or Back would land on the same page.
 */
export default function BackToTop({ after }: { after: string }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = document.getElementById(after);
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([entry]) => {
      setShown(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [after]);

  const toTop = (e: MouseEvent<HTMLButtonElement>) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    // Activated from the keyboard (detail 0): move focus up too, or the next
    // Tab would continue from the bottom of the page.
    if (e.detail === 0) document.querySelector<HTMLElement>('.topbar .brand')?.focus({ preventScroll: true });
  };

  return (
    <button type="button" className={shown ? 'totop show' : 'totop'} onClick={toTop} aria-label="Back to top" title="Back to top">
      <ArrowUp size={20} aria-hidden="true" />
    </button>
  );
}
