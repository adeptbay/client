#!/usr/bin/env node
/**
 * Thin page report — Part 5.6, and the quarterly content audit in
 * Part 5.12.
 *
 * Google's scaled content abuse policy does not punish volume; it
 * punishes pages that carry no value. This is a proxy for "would a
 * reviewer look at this page and see original substance?" It cannot
 * judge quality — nothing automated can — but it reliably finds the
 * pages that have nothing to judge.
 *
 * Run before every launch batch, and every quarter over the whole set.
 */

import { bar, pad, readTools } from './lib/read-registry.mjs';

const tools = await readTools();

/**
 * Tool pages carry no byline date — they date their claims instead, in
 * the "last verified" line under the technical notes. That is only an
 * honesty signal while it is true, so it needs an owner. Six months is
 * the point at which "benchmarks re-run each quarter" has visibly
 * stopped being the case.
 *
 * The build only warns about this, because staleness arrives with no
 * code change and should never block an unrelated deploy. This script
 * is the deliberate check, so here it counts as a real problem.
 */
const STALE_AFTER_MONTHS = 6;
const staleCutoff = new Date();
staleCutoff.setMonth(staleCutoff.getMonth() - STALE_AFTER_MONTHS);

function verificationAge(verified) {
  if (!verified) return null;
  const [year, month] = verified.split('-').map(Number);
  if (!year || !month) return null;
  const at = new Date(year, month - 1, 1);
  if (at >= staleCutoff) return null;
  const months =
    (staleCutoff.getFullYear() - year) * 12 + (staleCutoff.getMonth() - (month - 1)) +
    STALE_AFTER_MONTHS;
  return { verified, months };
}

const problems = [];

for (const tool of tools) {
  const issues = [];

  if (tool.unreadable) {
    problems.push({ tool, issues: ['file could not be parsed'] });
    continue;
  }

  if (tool.todos > 0) issues.push(`${tool.todos} unfilled TODO markers`);
  if (tool.faqCount < 5) issues.push(`${tool.faqCount} FAQ entries (Part 5.4 wants 5–8)`);
  if (tool.howToCount < 3) issues.push(`${tool.howToCount} how-to steps (wants 3–5)`);
  if (tool.related.length < 6) issues.push(`${tool.related.length} related tools (wants 6–10)`);
  if (tool.keywords.length < 3) issues.push(`${tool.keywords.length} target keywords`);

  if (!tool.hasBenchmarks && !tool.hasTable) {
    issues.push('no benchmark and no comparison table — the weakest kind of infoGain block');
  }
  if (!tool.hasLimits) issues.push('no stated limits');

  if (tool.description.length < 80 || tool.description.length > 170) {
    issues.push(`description is ${tool.description.length} chars (wants 80–170)`);
  }

  if (tool.score < 30 && tool.status === 'live') {
    issues.push(`score ${tool.score}/50 — below the backlog threshold but shipped`);
  }

  if (tool.status === 'live') {
    const stale = verificationAge(tool.verified);
    if (stale) {
      issues.push(
        `page claims "last verified ${stale.verified}" — ${stale.months} months old; ` +
          're-run the benchmarks or drop the claim',
      );
    }
  }

  if (issues.length > 0) problems.push({ tool, issues });
}

console.log(`\nThin page report  ·  ${tools.length} tools scanned\n${bar()}`);

if (problems.length === 0) {
  console.log('\nNothing flagged. Every tool carries its own substance.\n');
} else {
  for (const { tool, issues } of problems) {
    const label = tool.status === 'live' ? 'LIVE ' : 'draft';
    console.log(`\n  ${label}  ${pad(`${tool.category}/${tool.slug}`, 40)}`);
    for (const issue of issues) console.log(`         · ${issue}`);
  }

  const liveProblems = problems.filter((p) => p.tool.status === 'live');
  console.log(`\n${bar()}`);
  console.log(`${problems.length} tools flagged, ${liveProblems.length} of them live.`);
  console.log(
    'A flag is a prompt to look, not proof of a problem. A live tool with\n' +
      'unfilled TODOs or no infoGain evidence is a real problem.\n',
  );

  if (liveProblems.length > 0) process.exitCode = 1;
}

/* ── Distribution, for the weekly review ───────────────────────── */

const live = tools.filter((t) => t.status === 'live');
if (live.length > 0) {
  const buckets = { '40–50': 0, '30–39': 0, '20–29': 0, 'under 20': 0 };
  for (const t of live) {
    if (t.score >= 40) buckets['40–50']++;
    else if (t.score >= 30) buckets['30–39']++;
    else if (t.score >= 20) buckets['20–29']++;
    else buckets['under 20']++;
  }

  console.log(`Score distribution (live tools)\n${bar()}`);
  for (const [range, count] of Object.entries(buckets)) {
    console.log(`  ${pad(range, 12)} ${'█'.repeat(count)} ${count}`);
  }
  console.log('');
}
