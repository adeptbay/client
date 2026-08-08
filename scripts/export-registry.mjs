#!/usr/bin/env node
/**
 * Registry export — Appendix A step 01 item 6, and Part 4 homework 1.
 *
 * The book is emphatic that the tool list lives in a spreadsheet with
 * columns for status, build date, URL, indexed and monthly clicks. This
 * exports the half the codebase knows about, so the operator only has to
 * maintain the half it does not — the Search Console figures.
 *
 * Usage:
 *   npm run registry:export              writes exports/tools.csv
 *   npm run registry:export -- --json    writes exports/tools.json too
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, readTools } from './lib/read-registry.mjs';

const wantJson = process.argv.includes('--json');

const tools = (await readTools()).sort(
  (a, b) => b.score - a.score || String(a.slug).localeCompare(String(b.slug)),
);

const COLUMNS = [
  'slug',
  'category',
  'cluster',
  'name',
  'status',
  'runtime',
  'score',
  'url',
  'guide_url',
  'primary_keyword',
  'keyword_count',
  'faq_count',
  'related_count',
  'has_benchmark',
  'has_limits',
  'todos',
  // Filled in by hand from Search Console — Appendix D.2.
  'indexed',
  'first_indexed',
  'best_position',
  'clicks_30d',
  'impressions_30d',
  'notes',
];

const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://adeptbay.com').replace(/\/+$/, '');

const escape = (value) => {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const rows = tools.map((t) => ({
  slug: t.slug,
  category: t.category,
  cluster: t.cluster,
  name: t.name,
  status: t.status,
  runtime: t.runtime,
  score: t.score,
  url: `${origin}/${t.category}/${t.slug}`,
  guide_url: `${origin}/${t.category}/${t.slug}/guide`,
  primary_keyword: t.keywords[0] ?? '',
  keyword_count: t.keywords.length,
  faq_count: t.faqCount,
  related_count: t.related.length,
  has_benchmark: t.hasBenchmarks ? 'yes' : 'no',
  has_limits: t.hasLimits ? 'yes' : 'no',
  todos: t.todos,
  indexed: '',
  first_indexed: '',
  best_position: '',
  clicks_30d: '',
  impressions_30d: '',
  notes: '',
}));

const csv = [COLUMNS.join(','), ...rows.map((r) => COLUMNS.map((c) => escape(r[c])).join(','))].join(
  '\n',
);

const dir = join(ROOT, 'exports');
await mkdir(dir, { recursive: true });
await writeFile(join(dir, 'tools.csv'), `${csv}\n`, 'utf8');

if (wantJson) {
  await writeFile(join(dir, 'tools.json'), `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
}

const live = tools.filter((t) => t.status === 'live').length;

console.log(`
Exported ${tools.length} tools (${live} live) to exports/tools.csv${wantJson ? ' and tools.json' : ''}

The last six columns are blank on purpose. Fill them from Search Console
during the weekly review (Appendix D.3) — that is the join between what
was built and what it actually did.
`);
