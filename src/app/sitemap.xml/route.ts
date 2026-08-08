import { renderSitemapIndex } from '@core/sitemap';

/**
 * The sitemap index. Points at one shard per division plus a core shard
 * for static pages — Part 5.9.
 *
 * Sharding is not about the 50,000-URL limit; we are nowhere near it.
 * It is about diagnosis. Search Console reports coverage per submitted
 * sitemap, so a per-division shard turns "some pages are not indexed"
 * into "the PDF division is not indexing", which is an actionable fact.
 */

export const revalidate = 3600;

export function GET(): Response {
  return new Response(renderSitemapIndex(), {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
