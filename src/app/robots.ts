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
        allow: '/',
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
    host: absoluteUrl('/'),
  };
}
