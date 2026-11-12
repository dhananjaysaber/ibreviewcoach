/** IB IA Review mark: a pen nib (we coach, you write). Drawn to inherit sizing from its parent. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" role="img" aria-label="IB IA Review" focusable="false">
      <path d="M32 8 47 30 41 47H23l-6-17z" fill="currentColor" />
      <path d="M32 28v19" stroke="var(--logo-cut, #FBBF24)" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="32" cy="28" r="3.2" fill="var(--logo-cut, #FBBF24)" />
      <rect x="20" y="51" width="24" height="5" rx="2.5" fill="currentColor" />
    </svg>
  );
}
