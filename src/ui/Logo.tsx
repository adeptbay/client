/**
 * The AdeptBay mark.
 *
 * A ring open to the east with a dot entering it: a bay, and the
 * promise that goes with it — this is where the work gets sheltered.
 * Two shapes and no text in the mark, so it survives being rendered at
 * 16px in a browser tab.
 *
 * Inline SVG rather than an <img>: it inherits `currentColor` for the
 * wordmark, needs no extra request, and cannot shift layout.
 */

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  const gradientId = `ab-mark-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1BAE9A" />
          <stop offset="1" stopColor="#0E6A62" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
      <circle
        cx="16"
        cy="16"
        r="7.5"
        fill="none"
        stroke="#fff"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeDasharray="34.03 13.09"
        strokeDashoffset="-6.55"
      />
      <circle cx="25" cy="16" r="2.2" fill="#fff" />
    </svg>
  );
}

export function Logo({
  size = 30,
  showWordmark = true,
  className,
}: {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ''}`}>
      <LogoMark size={size} />
      {showWordmark && (
        <span className="text-[17px] font-semibold tracking-tight text-fg">
          Adept<span className="text-brand-text">Bay</span>
        </span>
      )}
    </span>
  );
}
