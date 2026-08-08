/**
 * Site-wide constants. The single source of truth for brand facts that
 * appear in metadata, schema, the footer and the OG image.
 *
 * Part 3.7 — the brand is an asset, not a decoration. Nothing here is
 * duplicated anywhere else in the codebase.
 */

function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');

  // Vercel injects this on production deployments.
  const vercel = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  return 'http://localhost:3000';
}

export const site = {
  name: 'AdeptBay',
  legalName: 'AdeptBay',
  domain: 'adeptbay.com',
  url: resolveSiteUrl(),

  /** Under 8 words — Step 02 item 14. */
  tagline: 'Every everyday tool, in one bay',

  description:
    'Fast, free online tools for developers, students and businesses. Most run entirely in your browser — no sign-up, no upload, no file size games.',

  /** Tone of voice, five lines — Step 02 item 13. */
  voice: [
    'Plain. Say what the tool does in the fewest words that are still true.',
    'Specific. "0.4s on a 5 MB file", never "blazing fast".',
    'Honest about limits. Every tool page states what it cannot do.',
    'No hype, no exclamation marks, no fake urgency, no cookie-cutter filler.',
    'Written for someone mid-task who wants to leave as soon as they are done.',
  ],

  locale: 'en',
  defaultOgImage: '/api/og',

  social: {
    github: 'https://github.com/adeptbay',
    x: 'https://x.com/adeptbay',
  },

  contact: {
    support: 'support@adeptbay.com',
    privacy: 'privacy@adeptbay.com',
    legal: 'legal@adeptbay.com',
  },

  /**
   * The promise the whole product is built around (Part 4.3).
   * If a tool cannot honour these, it does not ship.
   */
  promises: [
    { title: 'Runs in your browser', body: 'Client-side tools never upload your file. It is processed on your device and never leaves it.' },
    { title: 'No account, no limits', body: 'No sign-up wall, no daily quota, no watermark on anything you make here.' },
    { title: 'Loads in under a second', body: 'Every tool page is statically rendered and served from the edge. Heavy code loads only once you use it.' },
  ],
} as const;

export type Site = typeof site;

/** Absolute URL builder — canonicals, sitemaps and schema all go through this. */
export function absoluteUrl(path = '/'): string {
  return `${site.url}${path.startsWith('/') ? path : `/${path}`}`;
}
