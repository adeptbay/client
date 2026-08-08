/**
 * Builds the search index from the registry. Server side only — see
 * `search-index.ts` for the matcher, which is what the browser gets.
 *
 * When the registry passes roughly 2000 tools this index stops being
 * cheap to serialise into every page. At that point it moves behind an
 * edge route and the palette fetches on first keystroke; nothing else
 * has to change, because the matcher already takes the entries as an
 * argument.
 */

import { liveTools } from './registry';
import { scoreTotal } from './tool';
import type { SearchEntry } from './search-index';

export type { SearchEntry } from './search-index';
export { searchTools } from './search-index';

let cache: SearchEntry[] | null = null;

export function searchIndex(): SearchEntry[] {
  if (cache) return cache;

  cache = liveTools().map((tool) => ({
    slug: tool.slug,
    category: tool.category,
    name: tool.name,
    tagline: tool.tagline,
    cluster: tool.cluster,
    hay: [tool.name, ...tool.keywords, tool.cluster, tool.category].join(' ').toLowerCase(),
    rank: scoreTotal(tool.score),
  }));

  return cache;
}
