/**
 * Part 5.5 — internal linking is the single biggest SEO lever on a tool
 * site, and the only one entirely under our control.
 *
 * Rules encoded here:
 *   · 8–12 internal links per tool page
 *   · anchor text is the tool's real name, never "click here"
 *   · related tools are generated, because 1000 pages cannot be hand-wired
 *   · no page sits more than three clicks from the homepage
 */

import { findBySlug, liveTools, toolsInCategory, toolsInCluster, type AnyTool } from './registry';
import { scoreTotal } from './tool';

/**
 * Related tools, in descending confidence:
 *   1. hand-picked `related` slugs (the author knows the real workflow)
 *   2. same cluster (Part 4.6 — siblings that share a keyword neighbourhood)
 *   3. same category, best scoring first (keeps link equity flowing to
 *      the pages most likely to rank)
 */
export function relatedTools(tool: AnyTool, limit = 8): AnyTool[] {
  const out: AnyTool[] = [];
  const taken = new Set<string>([tool.slug]);

  const push = (t: AnyTool | undefined) => {
    if (!t || taken.has(t.slug) || t.status !== 'live' || out.length >= limit) return;
    taken.add(t.slug);
    out.push(t);
  };

  for (const slug of tool.related) push(findBySlug(slug));
  for (const t of toolsInCluster(tool.cluster)) push(t);
  for (const t of toolsInCategory(tool.category)) push(t);

  return out;
}

/**
 * The "next step" strip (Part 4.6) — shown with the result, not in the
 * footer. Moving a user from one tool to the next is what takes
 * pages-per-session from 1.3 to 2.8, which roughly doubles RPM and sends
 * Google a genuine engagement signal.
 */
export function nextStepTools(tool: AnyTool, limit = 3): AnyTool[] {
  const explicit = (tool.nextSteps ?? [])
    .map(findBySlug)
    .filter((t): t is AnyTool => !!t && t.status === 'live');

  if (explicit.length >= limit) return explicit.slice(0, limit);

  const filler = toolsInCluster(tool.cluster).filter(
    (t) => t.slug !== tool.slug && !explicit.some((e) => e.slug === t.slug),
  );

  return [...explicit, ...filler].slice(0, limit);
}

const STOPWORDS = new Set(['online', 'free', 'tool', 'with', 'from', 'into', 'your', 'text', 'file']);

const significantWords = (keywords: readonly string[]): Set<string> =>
  new Set(
    keywords
      .flatMap((k) => k.toLowerCase().split(/[^a-z0-9]+/))
      .filter((w) => w.length > 3 && !STOPWORDS.has(w)),
  );

/**
 * Cross-division links. Someone who just compressed an image usually
 * wants a PDF next; clusters do not know that, so we bridge on keyword
 * overlap. Without this, divisions become isolated islands and link
 * equity never crosses between them.
 */
export function crossCategoryTools(tool: AnyTool, limit = 4): AnyTool[] {
  const mine = significantWords(tool.keywords);
  if (mine.size === 0) return [];

  return liveTools()
    .filter((t) => t.category !== tool.category)
    .map((t) => {
      const theirs = significantWords(t.keywords);
      let overlap = 0;
      for (const w of theirs) if (mine.has(w)) overlap++;
      return { t, overlap };
    })
    .filter((x) => x.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || scoreTotal(b.t.score) - scoreTotal(a.t.score))
    .slice(0, limit)
    .map((x) => x.t);
}

/**
 * Total internal links a tool page will emit. Part 5.5 wants 8–12;
 * `scripts/audit-orphans.mjs` reports anything outside that band.
 */
export function internalLinkCount(tool: AnyTool): number {
  return (
    relatedTools(tool).length +
    nextStepTools(tool).length +
    crossCategoryTools(tool).length +
    2 // breadcrumb: home + category hub
  );
}
