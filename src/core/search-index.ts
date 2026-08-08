/**
 * The search matcher — pure, and deliberately free of any import.
 *
 * This module is separate from `search.ts` for one reason: the command
 * palette is a client component, and `search.ts` imports the registry.
 * If the matcher lived there, importing it in the browser would drag
 * all 1000 tool definitions — and their run functions — into the client
 * bundle, because the registry runs a validation pass at module scope
 * and therefore cannot be tree-shaken.
 *
 * The index is built on the server and handed down as a prop. This file
 * only knows how to rank it.
 */

export interface SearchEntry {
  slug: string;
  category: string;
  name: string;
  tagline: string;
  cluster: string;
  /** Lower-cased haystack: name + keywords + cluster + category. */
  hay: string;
  /** The tool's own 50-point score, used to break ties. */
  rank: number;
}

/**
 * Ranking, strongest signal first:
 *   4  exact name match
 *   3  name starts with the query
 *   2  a word inside the name starts with the query
 *   1  the query appears anywhere in the haystack
 *
 * Ties break on the tool's own score, so when two tools match equally
 * well the better one wins. Not a search library: at this corpus size —
 * short names, not prose — a scored substring match gives better
 * results than a 40 KB index, and costs nothing.
 */
export function searchTools(query: string, entries: SearchEntry[], limit = 12): SearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...entries].sort((a, b) => b.rank - a.rank).slice(0, limit);

  const scored: { entry: SearchEntry; score: number }[] = [];

  for (const entry of entries) {
    const name = entry.name.toLowerCase();
    let score = 0;

    if (name === q) score = 4;
    else if (name.startsWith(q)) score = 3;
    else if (name.split(/\s+/).some((word) => word.startsWith(q))) score = 2;
    else if (entry.hay.includes(q)) score = 1;

    if (score > 0) scored.push({ entry, score });
  }

  return scored
    .sort(
      (a, b) =>
        b.score - a.score || b.entry.rank - a.entry.rank || a.entry.name.localeCompare(b.entry.name),
    )
    .slice(0, limit)
    .map((x) => x.entry);
}
