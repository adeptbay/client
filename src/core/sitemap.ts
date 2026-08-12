/**
 * Part 5.9 — indexing at scale.
 *
 * At 1000+ pages the problem is not ranking, it is getting indexed at
 * all. Two rules drive this file:
 *
 *   1. Shard by category. One file per division, joined by an index.
 *      Search Console then reports an indexing rate PER DIVISION, which
 *      is the only way to tell "PDF is not indexing" from "the site is
 *      not indexing".
 *   2. `lastmod` is honest. It comes from `tool.updated`, which a tool
 *      author changes only on a real edit. A sitemap that claims
 *      everything changed today is a sitemap Google stops trusting.
 */

import { absoluteUrl } from './site';
import { categories } from './categories';
import { flags } from './flags';
import { liveTools, toolsInCategory } from './registry';
import { posts } from '@/content/posts';

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

/** Hard limits from the sitemap protocol: 50,000 URLs and 50 MB per file. */
export const MAX_URLS_PER_SITEMAP = 50_000;

/** Static pages that are not generated from the registry. */
export const STATIC_PAGES: { path: string; priority: number; changefreq: SitemapEntry['changefreq'] }[] = [
  { path: '/', priority: 1.0, changefreq: 'daily' },
  { path: '/all-tools', priority: 0.9, changefreq: 'daily' },
  { path: '/blog', priority: 0.6, changefreq: 'weekly' },
  { path: '/about', priority: 0.5, changefreq: 'monthly' },
  { path: '/methodology', priority: 0.6, changefreq: 'monthly' },
  { path: '/roadmap', priority: 0.4, changefreq: 'weekly' },
  { path: '/changelog', priority: 0.4, changefreq: 'weekly' },
  { path: '/contact', priority: 0.3, changefreq: 'yearly' },
  { path: '/privacy', priority: 0.3, changefreq: 'yearly' },
  { path: '/terms', priority: 0.3, changefreq: 'yearly' },
  { path: '/cookies', priority: 0.2, changefreq: 'yearly' },
  { path: '/accessibility', priority: 0.2, changefreq: 'yearly' },
  { path: '/dmca', priority: 0.2, changefreq: 'yearly' },
];

/** Shard names, used as `/sitemaps/{name}.xml`. */
export function shardNames(): string[] {
  return ['core', ...categories.filter((c) => toolsInCategory(c.slug).length > 0).map((c) => c.slug)];
}

export function entriesForShard(shard: string): SitemapEntry[] {
  if (shard === 'core') {
    const newest = liveTools().reduce((max, t) => (t.updated > max ? t.updated : max), '2026-01-01');

    const staticEntries = STATIC_PAGES.map((p) => ({
      loc: absoluteUrl(p.path),
      // Hubs and indexes genuinely change when a tool is added.
      lastmod: p.path === '/' || p.path === '/all-tools' ? newest : undefined,
      changefreq: p.changefreq,
      priority: p.priority,
    }));

    /**
     * Blog posts. `/blog` was listed but its posts were not, so every
     * article on the site was invisible to the sitemap — on a project
     * whose entire strategy is "getting indexed at all", the supporting
     * content was the one thing left out of the index.
     */
    const postEntries: SitemapEntry[] = posts.map((post) => ({
      loc: absoluteUrl(`/blog/${post.slug}`),
      lastmod: post.updated,
      changefreq: 'yearly',
      priority: 0.5,
    }));

    /**
     * `/pricing` renders `noindex` until the Premium flag is on
     * (see its page metadata). Submitting a noindex URL in a sitemap is
     * a Search Console warning and wasted crawl, so it appears here on
     * exactly the same condition.
     */
    const pricingEntries: SitemapEntry[] = flags.premium
      ? [{ loc: absoluteUrl('/pricing'), changefreq: 'monthly', priority: 0.7 }]
      : [];

    return [...staticEntries, ...postEntries, ...pricingEntries];
  }

  const tools = toolsInCategory(shard);
  if (tools.length === 0) return [];

  const hubLastmod = tools.reduce((max, t) => (t.updated > max ? t.updated : max), tools[0]!.updated);

  return [
    { loc: absoluteUrl(`/${shard}`), lastmod: hubLastmod, changefreq: 'weekly', priority: 0.9 },
    ...tools.flatMap((t): SitemapEntry[] => [
      {
        loc: absoluteUrl(`/${t.category}/${t.slug}`),
        lastmod: t.updated,
        changefreq: 'monthly',
        priority: 0.8,
      },
      {
        loc: absoluteUrl(`/${t.category}/${t.slug}/guide`),
        lastmod: t.updated,
        changefreq: 'monthly',
        priority: 0.5,
      },
    ]),
  ];
}

const escapeXml = (s: string): string =>
  s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

export function renderUrlset(entries: SitemapEntry[]): string {
  const urls = entries
    .map((e) => {
      const parts = [`    <loc>${escapeXml(e.loc)}</loc>`];
      if (e.lastmod) parts.push(`    <lastmod>${e.lastmod}</lastmod>`);
      if (e.changefreq) parts.push(`    <changefreq>${e.changefreq}</changefreq>`);
      if (e.priority !== undefined) parts.push(`    <priority>${e.priority.toFixed(1)}</priority>`);
      return `  <url>\n${parts.join('\n')}\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

export function renderSitemapIndex(): string {
  const items = shardNames()
    .map((name) => {
      const entries = entriesForShard(name);
      const lastmod = entries.reduce<string | undefined>(
        (max, e) => (e.lastmod && (!max || e.lastmod > max) ? e.lastmod : max),
        undefined,
      );
      return `  <sitemap>\n    <loc>${absoluteUrl(`/sitemaps/${name}.xml`)}</loc>${
        lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''
      }\n  </sitemap>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</sitemapindex>`;
}
