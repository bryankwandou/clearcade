/**
 * The mark.
 *
 * A single beam enters a glass tile on the left and leaves as four bars of
 * decreasing length. That is the product drawn literally: undifferentiated
 * activity goes in, a rule refracts it, an ordered list comes out — and you
 * can see the rule doing it. The four bars are the four weights.
 *
 * It survives being small, which is most of what a logo has to do. At 20px
 * the beam and the tile still read, and the bars become a texture rather than
 * disappearing into a smudge.
 */
export function Mark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="cc-glass" x1="10" y1="8" x2="34" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--color-glass-300)" />
          <stop offset="1" stopColor="var(--color-glass-600)" />
        </linearGradient>
        <linearGradient id="cc-beam" x1="0" y1="24" x2="20" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--color-glass-400)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--color-glass-400)" />
        </linearGradient>
      </defs>

      {/* The incoming beam, fading in from nothing so the tile is the subject. */}
      <rect x="0" y="22.4" width="17" height="3.2" rx="1.6" fill="url(#cc-beam)" />

      {/* The tile. Rotated square rather than a circle: this is an arcade
          catalogue and every game on it is a rounded rectangle. */}
      <rect
        x="14"
        y="14"
        width="20"
        height="20"
        rx="5"
        transform="rotate(45 24 24)"
        fill="url(#cc-glass)"
      />
      <rect
        x="14"
        y="14"
        width="20"
        height="20"
        rx="5"
        transform="rotate(45 24 24)"
        stroke="var(--color-glass-300)"
        strokeOpacity="0.5"
        strokeWidth="1"
      />

      {/* The ranked output. Lengths fall off the way a real leaderboard does:
          a clear first, then a compressed middle. */}
      <g fill="var(--color-glass-300)">
        <rect x="34" y="14.6" width="13" height="2.8" rx="1.4" />
        <rect x="34" y="20.8" width="9.5" height="2.8" rx="1.4" opacity="0.82" />
        <rect x="34" y="27" width="6.5" height="2.8" rx="1.4" opacity="0.62" />
        <rect x="34" y="33.2" width="4" height="2.8" rx="1.4" opacity="0.42" />
      </g>
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Mark size={26} />
      <span className="text-[15px] font-semibold tracking-[-0.01em]">
        Clear<span className="text-[var(--color-glass-400)]">cade</span>
      </span>
    </span>
  );
}
