/** IB IA Review mark: an amber pen nib over a bar (we coach, you write). Inherits size from its parent;
 *  the bar follows the text colour and the nib cut-outs follow --logo-cut (set it to the background colour). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" role="img" aria-label="IB IA Review" focusable="false">
      <path d="M32 6 48 30 41 47H23l-7-17z" fill="#FBBF24" />
      <path d="M32 27v20" stroke="var(--logo-cut, #090E1A)" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="32" cy="27" r="3.4" fill="var(--logo-cut, #090E1A)" />
      <rect x="18" y="52" width="28" height="5.5" rx="2.75" fill="currentColor" />
    </svg>
  );
}

/** Mark + wordmark + tagline lockup. Text inherits colour from the parent. */
export function LogoLockup({ tagline = true, className }: { tagline?: boolean; className?: string }) {
  return (
    <span className={`ibia-lockup ${className ?? ''}`}>
      <LogoMark className="ibia-lockup-mark" />
      <span className="ibia-lockup-text">
        <strong>IB IA Review</strong>
        {tagline && <small>We coach · you write</small>}
      </span>
    </span>
  );
}
