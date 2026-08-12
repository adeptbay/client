import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@core/site';

/**
 * Part 5.9 — protect the crawl budget.
 *
 * Tool options live in the query string so a configured tool is a
 * shareable link. That is good for people and bad for crawlers: it
 * turns one canonical page into an unbounded set of parameterised
 * URLs. Every page already carries a self-referencing canonical, and
 * this blocks the crawl on top of it.
 *
 * AI crawlers are explicitly allowed. Part 5.10: roughly 12–18% of
 * English informational queries are now handled by AI search engines,
 * and that channel is only open to sites those crawlers can read.
 * Blocking them to protect content nobody would otherwise find is a
 * trade almost no tool site should take.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          /**
           * The OG image endpoint, carved back out of the /api/ block.
           *
           * Every page's og:image and twitter:image points at
           * /api/og?title=… (see core/seo.ts). Both facebookexternalhit
           * and Twitterbot obey robots.txt, so leaving this inside the
           * /api/ disallow means every social share renders a blank
           * card — the images are generated correctly and then never
           * fetched. This rule is longer than both `/api/` and `/*?*`,
           * and the longest matching rule wins, so it re-allows the
           * endpoint including its query string.
           */
          '/api/og',
        ],
        disallow: [
          '/api/',
          // Parameterised variants of a canonical tool page.
          '/*?*',
        ],
      },
      // Named explicitly so the intent is unambiguous rather than
      // inherited from the wildcard rule.
      { userAgent: 'GPTBot', allow: '/' },
      { userAgent: 'OAI-SearchBot', allow: '/' },
      { userAgent: 'ChatGPT-User', allow: '/' },
      { userAgent: 'PerplexityBot', allow: '/' },
      { userAgent: 'ClaudeBot', allow: '/' },
      { userAgent: 'Google-Extended', allow: '/' },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    /**
     * No `host` directive. It was only ever read by Yandex, which
     * deprecated it in 2018 in favour of a 301 plus a canonical tag —
     * both of which this site already has. Emitting it from
     * `absoluteUrl('/')` also produced `Host: https://adeptbay.com/`,
     * where the directive takes a bare hostname, so it was a malformed
     * line advertising a rule nothing enforces.
     */
  };
}
