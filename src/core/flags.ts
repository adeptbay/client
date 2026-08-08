/**
 * Part 6 · flags.ts — feature flags.
 *
 * Every revenue and infrastructure feature ships dark. The monetisation
 * ladder (Part 8) is a sequence of flag flips, not a sequence of
 * rewrites, so nothing here needs a code change to go live.
 *
 * Each key is read as a literal member access because that is the only
 * form Next.js inlines at build time.
 */

const on = (v: string | undefined): boolean => v === 'true' || v === '1';

export const flags = {
  /** Part 8 — only after AdSense approval and 100+ live pages. */
  ads: on(process.env.NEXT_PUBLIC_FLAG_ADS),
  /** Part 10 — gate at ~20,000 monthly visitors, not before. */
  premium: on(process.env.NEXT_PUBLIC_FLAG_PREMIUM),
  /** Part 10 — public developer API. */
  api: on(process.env.NEXT_PUBLIC_FLAG_API),
  /** Part 7 — AI features. Off means zero AI cost, by construction. */
  ai: on(process.env.NEXT_PUBLIC_FLAG_AI),
  /** Part 3.5 — engine 2, opens at ~5,000 monthly visitors. */
  newsletter: on(process.env.NEXT_PUBLIC_FLAG_NEWSLETTER),
  /** Privacy-first usage beacon. Off by default; no cookie either way. */
  analytics: on(process.env.NEXT_PUBLIC_FLAG_ANALYTICS),
} as const;

export type FlagName = keyof typeof flags;

export const isEnabled = (name: FlagName): boolean => flags[name];
