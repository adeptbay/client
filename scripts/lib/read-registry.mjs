/**
 * Reads tool metadata out of the source files for the ops scripts.
 *
 * These scripts run under plain Node, which cannot resolve the
 * TypeScript path aliases the registry uses, so importing
 * src/core/registry.ts directly is not an option without adding a
 * loader and a build step to what should be a zero-dependency script.
 *
 * Instead it extracts the handful of fields the audits need with
 * targeted patterns. Deliberately shallow: if a pattern stops matching,
 * the script reports the file as unreadable rather than silently
 * treating it as empty. The build-time audit in registry.ts remains the
 * authority on correctness — this is for reporting, not enforcement.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Application source lives under src/; config and tooling stay at the root. */
export const SRC = join(ROOT, 'src');

const field = (source, key) =>
  source.match(new RegExp(`^\\s*${key}:\\s*'([^']*)'`, 'm'))?.[1] ?? null;

const numberField = (source, key) =>
  Number(source.match(new RegExp(`${key}:\\s*(\\d+)`))?.[1] ?? 0);

function arrayField(source, key) {
  const raw = source.match(new RegExp(`^\\s*${key}:\\s*\\[([\\s\\S]*?)\\]`, 'm'))?.[1];
  if (!raw) return [];
  return [...raw.matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

function countOccurrences(source, key) {
  // Counts entries in a structured array such as faq or howTo.
  const block = source.match(new RegExp(`${key}:\\s*\\[([\\s\\S]*?)\\n {2}\\],`, 'm'))?.[1] ?? '';
  return (block.match(/^\s{4}\{/gm) ?? []).length;
}

export async function readTools() {
  const toolsDir = join(SRC, 'tools');
  const categories = (await readdir(toolsDir, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  const tools = [];

  for (const category of categories) {
    const slugs = (await readdir(join(toolsDir, category), { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name);

    for (const slug of slugs) {
      const path = join(toolsDir, category, slug, 'index.ts');
      let source;
      try {
        // Normalise line endings before matching. A CRLF file would
        // silently fail every `\n`-anchored pattern below and report
        // the tool as empty rather than as unreadable — which is the
        // worst kind of wrong answer for an audit to give.
        source = (await readFile(path, 'utf8')).replace(/\r\n/g, '\n');
      } catch {
        tools.push({ slug, category, unreadable: true });
        continue;
      }

      tools.push({
        slug: field(source, 'slug') ?? slug,
        category: field(source, 'category') ?? category,
        cluster: field(source, 'cluster'),
        name: field(source, 'name'),
        status: field(source, 'status'),
        runtime: field(source, 'runtime'),
        description: source.match(/description:\s*\n?\s*'([\s\S]*?)',\n/)?.[1] ?? '',
        keywords: arrayField(source, 'keywords'),
        related: arrayField(source, 'related'),
        nextSteps: arrayField(source, 'nextSteps'),
        faqCount: countOccurrences(source, 'faq'),
        howToCount: countOccurrences(source, 'howTo'),
        score:
          numberField(source, 'demand') +
          numberField(source, 'evergreen') +
          numberField(source, 'serp') +
          numberField(source, 'money') +
          numberField(source, 'ease'),
        hasBenchmarks: /benchmarks:\s*\[/.test(source),
        hasTable: /table:\s*\{/.test(source),
        hasLimits: /limits:\s*\[/.test(source),
        // Only scaffold placeholders count. A bare /TODO/ also matches
        // legitimate content — a code sample containing "// TODO: add
        // logging" is not an unfinished tool.
        todos: (source.match(/'TODO|"TODO|TODO-cluster/g) ?? []).length,
        bytes: Buffer.byteLength(source),
        path: `src/tools/${category}/${slug}/index.ts`,
      });
    }
  }

  return tools;
}

/* Small formatting helpers shared by the reports. */

export const pad = (s, n) => String(s).padEnd(n);
export const bar = (n = 72) => '─'.repeat(n);
