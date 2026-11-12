import Lenis from 'lenis';

/** Smooth scroll + reveal-on-scroll for the whole app. Respects reduced motion. */
export function initMotion() {
  if (typeof window === 'undefined') return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) {
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
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
