import { entriesForShard, renderUrlset, shardNames } from '@core/sitemap';

/**
 * One sitemap per division, served at /sitemaps/{name}.xml.
 *
 * The `.xml` is part of the parameter rather than the route, because a
 * search engine will only accept a sitemap URL that looks like one, and
 * because the shard names then match exactly what gets submitted to
 * Search Console.
 */

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return shardNames().map((name) => ({ shard: `${name}.xml` }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shard: string }> },
): Promise<Response> {
  const { shard } = await params;
  const name = shard.replace(/\.xml$/, '');

  const entries = entriesForShard(name);
  if (entries.length === 0) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(renderUrlset(entries), {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
