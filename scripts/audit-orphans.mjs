#!/usr/bin/env node
/**
 * Orphan and internal-link audit — Part 5.5, Appendix A step 07 item 14.
 *
 * Two failure modes this catches, both of which are invisible until
 * traffic does not arrive:
 *
 *   · An orphan page — nothing links to it, so it indexes slowly or not
 *     at all. Part 5.9: "a new page with fewer than five internal links
 *     indexes slowly."
 *   · A page with too many outbound links, which dilutes the equity it
 *     passes. Part 5.5 sets the band at 8–12.
 *
 * Run monthly. Exits non-zero if any tool has zero inbound links, so it
 * can be wired into CI later without modification.
 */

import { bar, pad, readTools } from './lib/read-registry.mjs';

const tools = await readTools();
const live = tools.filter((t) => t.status === 'live');

const bySlug = new Map(live.map((t) => [t.slug, t]));

/* ── Inbound links ───────────────────────────────────────────────
   Two structural links exist for every tool no matter what: its division
   hub lists it, and /all-tools lists it. Those are real internal links
   and a crawler follows them, so they count. What this measures on top
   is sibling links — tool to tool — which are the ones that actually
   build a cluster.                                                    */

const STRUCTURAL_INBOUND = 2; // category hub + /all-tools

const siblings = new Map(live.map((t) => [t.slug, 0]));

for (const tool of live) {
  for (const target of [...tool.related, ...tool.nextSteps]) {
    if (siblings.has(target)) siblings.set(target, siblings.get(target) + 1);
  }
}

const inbound = new Map(live.map((t) => [t.slug, siblings.get(t.slug) + STRUCTURAL_INBOUND]));

/* ── Outbound links ────────────────────────────────────────────── */

const outbound = new Map(
  live.map((t) => [t.slug, new Set([...t.related, ...t.nextSteps]).size + 2]), // +2 for breadcrumb
);

/* ── Report ────────────────────────────────────────────────────── */

console.log(`\nInternal link audit  ·  ${live.length} live tools\n${bar()}`);

// An orphan has no sibling links at all — reachable only from a listing
// page, so it carries no cluster signal and indexes slowly.
const orphans = live.filter((t) => siblings.get(t.slug) === 0);
const weak = live.filter((t) => siblings.get(t.slug) > 0 && inbound.get(t.slug) < 5);
const thinOut = live.filter((t) => outbound.get(t.slug) < 8);
const noisyOut = live.filter((t) => outbound.get(t.slug) > 12);
const broken = [];

for (const tool of live) {
  for (const target of [...tool.related, ...tool.nextSteps]) {
    if (!bySlug.has(target)) broken.push(`${tool.slug} → ${target}`);
  }
}

console.log(`${pad('Orphans (no sibling links)', 34)} ${orphans.length}`);
console.log(`${pad('Weak (under 5 inbound total)', 34)} ${weak.length}`);
console.log(`${pad('Too few outbound (under 8)', 34)} ${thinOut.length}`);
console.log(`${pad('Too many outbound (over 12)', 34)} ${noisyOut.length}`);
console.log(`${pad('Broken related targets', 34)} ${broken.length}`);

const section = (title, list, format) => {
  if (list.length === 0) return;
  console.log(`\n${title}\n${bar()}`);
  for (const item of list) console.log(`  ${format(item)}`);
};

section(
  'ORPHANS — reachable only from listing pages, no sibling links',
  orphans,
  (t) => `${pad(t.slug, 30)} ${t.path}`,
);
section('WEAK — under five inbound links', weak, (t) =>
  `${pad(t.slug, 30)} ${inbound.get(t.slug)} inbound (${siblings.get(t.slug)} sibling)`,
);
section('TOO FEW OUTBOUND', thinOut, (t) => `${pad(t.slug, 30)} ${outbound.get(t.slug)} links`);
section('TOO MANY OUTBOUND', noisyOut, (t) => `${pad(t.slug, 30)} ${outbound.get(t.slug)} links`);
section('BROKEN TARGETS', broken, (b) => b);

console.log(`\n${bar()}`);

if (orphans.length > 0 || broken.length > 0) {
  console.log('FAIL — fix orphans and broken targets before the next launch batch.\n');
  process.exitCode = 1;
} else {
  console.log('PASS — every live tool has at least one inbound link.\n');
}
