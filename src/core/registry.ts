/**
 * Part 6.2 — the registry.
 *
 * Every tool is loaded once, validated once, and indexed once. Pages,
 * sitemaps, hubs, search and the API all read from here; none of them
 * ever touch a tool file directly.
 *
 * Loading is an explicit barrel (`src/tools/index.ts`) rather than a
 * filesystem scan, so the whole registry is statically analysable —
 * which is what lets the bundler tree-shake tool code out of pages that
 * do not run it. `pnpm new-tool` keeps the barrel in sync.
 */

import { allTools } from '@tools/index';
import { runners } from '@tools/runners';
import { categories, getCategory, type Category } from './categories';
import { scoreTotal, validateTool, type ToolDefinition, type ToolMeta, toMeta } from './tool';

/** The universal supertype of every tool definition. */
export type AnyTool = ToolDefinition<never, never>;

const tools = allTools as AnyTool[];

/* ── Build-time gate ─────────────────────────────────────────────────
   A definition that would produce a thin or duplicate page stops the
   build here rather than shipping. This replaces a separate test suite
   for the one property that actually matters at this scale.           */

function auditRegistry(list: AnyTool[]): void {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const t of list) {
    const id = `${t.category}/${t.slug}`;
    if (seen.has(id)) errors.push(`duplicate tool path: /${id}`);
    seen.add(id);

    if (!getCategory(t.category)) {
      errors.push(`${id}: unknown category "${t.category}" — add it to categories.ts first`);
    }

    // A tool present in the barrel but missing from the runner map would
    // render a page that throws the moment anyone used it. Catch it here.
    if (t.status === 'live' && !runners[t.slug]) {
      errors.push(`${id}: no entry in src/tools/runners.ts — the page would render but not run`);
    }

    errors.push(...validateTool(t));
  }

  // Every `related` target must exist, or internal linking silently 404s.
  for (const t of list) {
    for (const slug of t.related) {
      if (!seen.has(slug) && !list.some((x) => x.slug === slug)) {
        errors.push(`${t.category}/${t.slug}: related tool "${slug}" does not exist`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Tool registry failed validation:\n  - ${errors.join('\n  - ')}`);
  }
}

auditRegistry(tools);

/* ── Verification decay ──────────────────────────────────────────────
   Tool pages carry no byline date; they date their claims instead, via
   the "last verified" line on the InfoGain block. That only works while
   the claim is true — a verification date that has quietly stopped
   being accurate is worse than no date at all, because it converts an
   honesty signal into a false one.

   This warns rather than throws, unlike everything else in this file.
   Staleness arrives on its own, with nobody touching the code, so a
   hard failure would break an unrelated deploy on an arbitrary
   Tuesday. `npm run audit:thin` exits non-zero on the same condition,
   which is the right place for it: a check you run deliberately, not
   one that ambushes a hotfix.                                        */

const STALE_AFTER_MONTHS = 6;

function warnOnStaleVerification(list: AnyTool[]): void {
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth() - STALE_AFTER_MONTHS, 1);

  const stale = list.filter((t) => {
    if (t.status !== 'live' || !t.infoGain.verified) return false;
    const [year, month] = t.infoGain.verified.split('-').map(Number);
    if (!year || !month) return false;
    return new Date(year, month - 1, 1) < cutoff;
  });

  if (stale.length === 0) return;

  console.warn(
    `\n  ${stale.length} live tool page(s) claim a verification date older than ` +
      `${STALE_AFTER_MONTHS} months:\n` +
      stale
        .map((t) => `    ${t.category}/${t.slug} — last verified ${t.infoGain.verified}`)
        .join('\n') +
      '\n  Re-run the benchmarks and update infoGain.verified, or drop the claim.\n',
  );
}

warnOnStaleVerification(tools);

/* ── Indexes ────────────────────────────────────────────────────── */

const byPath = new Map<string, AnyTool>(tools.map((t) => [`${t.category}/${t.slug}`, t]));
const bySlug = new Map<string, AnyTool>(tools.map((t) => [t.slug, t]));

const byCategory = new Map<string, AnyTool[]>();
const byCluster = new Map<string, AnyTool[]>();

for (const t of tools) {
  (byCategory.get(t.category) ?? byCategory.set(t.category, []).get(t.category)!).push(t);
  (byCluster.get(t.cluster) ?? byCluster.set(t.cluster, []).get(t.cluster)!).push(t);
}

/** Highest score first — the hub pages and "next step" strips lead with value. */
const byScoreDesc = (a: AnyTool, b: AnyTool) =>
  scoreTotal(b.score) - scoreTotal(a.score) || a.name.localeCompare(b.name);

for (const list of byCategory.values()) list.sort(byScoreDesc);
for (const list of byCluster.values()) list.sort(byScoreDesc);

/* ── Public reads ───────────────────────────────────────────────── */

/** Everything, including drafts. Use `liveTools()` for anything public. */
export const allToolDefs = (): AnyTool[] => tools;

export const liveTools = (): AnyTool[] => tools.filter((t) => t.status === 'live');

export function getTool(category: string, slug: string): AnyTool | undefined {
  const t = byPath.get(`${category}/${slug}`);
  return t?.status === 'deprecated' ? undefined : t;
}

export const findBySlug = (slug: string): AnyTool | undefined => bySlug.get(slug);

export const toolsInCategory = (category: string): AnyTool[] =>
  (byCategory.get(category) ?? []).filter((t) => t.status === 'live');

export const toolsInCluster = (cluster: string): AnyTool[] =>
  (byCluster.get(cluster) ?? []).filter((t) => t.status === 'live');

/** Categories that have at least one live tool, in planned order. */
export const activeCategories = (): Category[] =>
  categories.filter((c) => toolsInCategory(c.slug).length > 0);

/**
 * What the header and footer list.
 *
 * Everything `activeCategories()` returns, plus any division flagged
 * `navPin` — a division being built, whose hub is still a placeholder.
 * Kept in planned order so the nav reads as the roadmap does.
 */
export const navCategories = (): Category[] =>
  categories.filter((c) => c.navPin || toolsInCategory(c.slug).length > 0);

export const countInCategory = (category: string): number => toolsInCategory(category).length;

export const totalLive = (): number => liveTools().length;

/** Newest first — powers the homepage "recently added" strip. */
export const recentTools = (limit = 8): AnyTool[] =>
  [...liveTools()].sort((a, b) => b.added.localeCompare(a.added)).slice(0, limit);

/** Best-scoring tools overall — the homepage lead grid. */
export const topTools = (limit = 12): AnyTool[] => [...liveTools()].sort(byScoreDesc).slice(0, limit);

/** Static params for `/[category]/[slug]`. */
export const allToolParams = (): { category: string; slug: string }[] =>
  liveTools().map((t) => ({ category: t.category, slug: t.slug }));

/** Serializable form for client components. */
export const metaOf = (t: AnyTool): ToolMeta => toMeta(t);
