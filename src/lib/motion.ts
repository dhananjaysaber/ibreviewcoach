import Lenis from 'lenis';

/** Smooth scroll + reveal-on-scroll for the whole app. Respects reduced motion. */
export function initMotion() {
  if (typeof window === 'undefined') return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) {
    // Let nested scroll areas (modals, drawers, panels) scroll natively instead of being captured by Lenis.
    const inNestedScroller = (node: Element | null) => {
      for (let el = node as HTMLElement | null; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
        const oy = getComputedStyle(el).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) return true;
      }
      return false;
    };
    const lenis = new Lenis({
      lerp: 0.09,
      smoothWheel: true,
      prevent: (node: Element) => !!node.closest?.('[data-lenis-prevent]') || inNestedScroller(node),
    });
    const raf = (t: number) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    document.addEventListener('click', (e) => {
      const a = (e.target as HTMLElement).closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      const id = a?.getAttribute('href');
      if (id && id.length > 1) {
        const el = document.querySelector(id);
        if (el) { e.preventDefault(); lenis.scrollTo(el as HTMLElement, { offset: -72 }); }
      }
    });
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.12 });
  const scan = () => document.querySelectorAll('.landing-main .landing-section, .landing-main .landing-proof-strip, .landing-main .landing-feature-card')
    .forEach((el) => { if (!el.classList.contains('reveal')) { el.classList.add('reveal'); io.observe(el); } });
  scan();
  new MutationObserver(scan).observe(document.getElementById('root')!, { childList: true, subtree: true });
}
