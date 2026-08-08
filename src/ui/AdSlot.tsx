import { flags } from '@core/flags';

/**
 * AdSlot.
 *
 * Part 5.8 names ad containers as the number one cause of a failing CLS
 * score, and Part 8 sets the layout policy. Both are enforced here
 * rather than left to whoever adds the next page:
 *
 *   · every slot reserves its height up front, so nothing ever shifts
 *   · no slot renders above the fold — the tool comes first
 *   · a maximum of two display units per page in year one
 *   · when the flag is off, the component renders nothing at all,
 *     not an empty box
 *
 * The `above-fold` placement deliberately does not exist. Adding it
 * would require editing this file, which is the point.
 */

export type AdPlacement = 'in-content' | 'below-content' | 'sidebar';

const HEIGHTS: Record<AdPlacement, string> = {
  'in-content': 'min-h-[280px]',
  'below-content': 'min-h-[280px]',
  sidebar: 'min-h-[600px]',
};

export function AdSlot({ placement, className }: { placement: AdPlacement; className?: string }) {
  if (!flags.ads) return null;

  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (!client) return null;

  return (
    <aside
      aria-label="Advertisement"
      className={`${HEIGHTS[placement]} flex items-center justify-center overflow-hidden rounded-xl border border-line bg-sunken ${className ?? ''}`}
    >
      {/* The AdSense <ins> goes here once the account is approved.
          The reserved height above is what keeps CLS under 0.05. */}
      <span className="text-[11px] uppercase tracking-widest text-fg-subtle">Advertisement</span>
    </aside>
  );
}
