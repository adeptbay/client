#!/usr/bin/env node
/**
 * Tool scaffold generator.
 *
 * Part 6.3, rule 3: "a new tool is always created with the scaffold,
 * never by hand." At fifty tools hand-created files are merely
 * inconsistent. At a thousand they are unmaintainable, because every
 * variation has to be remembered by a person.
 *
 * Usage:
 *   npm run new-tool -- --category text --slug find-replace --name "Find and Replace"
 *   npm run new-tool                      (prompts for anything missing)
 *
 * It writes the tool file and registers it in src/tools/index.ts and
 * src/tools/runners.ts. The generated file will NOT pass the registry
 * audit until the TODO markers are filled in — that is intentional.
 * A tool that ships with placeholder copy is exactly the thin page the
 * whole architecture exists to prevent.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
/** Application source lives under src/; config and tooling stay at the root. */
const SRC = join(ROOT, 'src');

/* ── Arguments ──────────────────────────────────────────────────── */

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    out[argv[i].slice(2)] = argv[i + 1]?.startsWith('--') ? true : argv[++i];
  }
  return out;
}

const kebab = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

/** Read the division list straight out of categories.ts, so this script
 *  can never drift from the real one. */
async function readCategories() {
  const source = await readFile(join(SRC, 'core/categories.ts'), 'utf8');
  return [...source.matchAll(/^\s{4}slug: '([a-z0-9-]+)',$/gm)].map((m) => m[1]);
}

/* ── Template ───────────────────────────────────────────────────── */

function template({ slug, category, name }) {
  return `import { defineTool } from '@core/tool';

interface Options {
  // TODO: describe this tool's options as a TypeScript type.
  example: string;
}

export default defineTool<string, Options>({
  slug: '${slug}',
  category: '${category}',
  cluster: 'TODO-cluster', // TODO: which keyword neighbourhood does this sit in?

  name: '${name}',
  tagline: 'TODO: one line. What it does, plus the one thing that makes it different.',
  description:
    'TODO: 80–170 characters. What the tool does, the differentiator, and a reason to use it. This becomes the meta description.',
  keywords: ['TODO primary keyword', 'TODO secondary keyword'],

  runtime: 'client', // Prefer client. Part 4.4: if the browser can do it, do not use a server.
  status: 'draft',   // Flip to 'live' once every TODO below is gone.
  premium: false,
  apiEnabled: true,

  // The 50-point score (Part 3.3). Be honest — this decides build order.
  score: { demand: 5, evergreen: 5, serp: 5, money: 5, ease: 5 },

  input: {
    type: 'text',
    label: 'Input',
    placeholder: 'TODO',
    rows: 8,
    sample: 'TODO: a sample that shows the tool at its best in one glance.',
  },

  options: [
    {
      key: 'example',
      type: 'text',
      label: 'TODO',
      default: '',
    },
  ],

  output: { type: 'text', label: 'Result' },

  // 3–5 steps.
  howTo: [
    { title: 'TODO', detail: 'TODO' },
    { title: 'TODO', detail: 'TODO' },
    { title: 'TODO', detail: 'TODO' },
  ],

  // 5–8 questions. Phrase each as the literal question someone types,
  // and complete the answer in the first 40–60 words (Part 5.10).
  faq: [
    { q: 'TODO?', a: 'TODO' },
    { q: 'TODO?', a: 'TODO' },
    { q: 'TODO?', a: 'TODO' },
    { q: 'TODO?', a: 'TODO' },
  ],

  // ★ The block that makes this page worth having (Part 5.4).
  // At least one of benchmarks / supports / limits / errors / table.
  infoGain: {
    summary:
      'TODO: 40–60 words of something true that no competitor page says. Your own measurement, a real limit, or a design decision and its reason.',
    supports: ['TODO'],
    limits: ['TODO: what this tool will not do.'],
    verified: '${new Date().toISOString().slice(0, 7)}',
  },

  related: [], // TODO: 6–10 slugs. Must exist, or the build fails.
  nextSteps: [], // TODO: up to 3 — what the user probably wants next.

  added: '${new Date().toISOString().slice(0, 10)}',
  updated: '${new Date().toISOString().slice(0, 10)}',

  run: (input, options) => {
    // TODO: the actual logic. Heavy work belongs in src/engines,
    // not here — this file should stay close to metadata plus a call.
    void options;
    return { output: input };
  },
});
`;
}

/* ── Registration ───────────────────────────────────────────────── */

/**
 * Insert `line` immediately after the first whole line matching `anchor`.
 *
 * Matching the whole line matters: the section markers are box-drawing
 * comments like `// ── text ─────────`, and anchoring on a prefix would
 * splice the new import into the middle of the rule.
 */
async function register(file, anchor, line) {
  const path = join(ROOT, file);
  const source = await readFile(path, 'utf8');
  if (source.includes(line.trim())) return false;

  const lines = source.split('\n');
  const at = lines.findIndex((l) => anchor.test(l));
  if (at === -1) throw new Error(`Could not find the anchor ${anchor} in ${file}`);

  lines.splice(at + 1, 0, line);
  await writeFile(path, lines.join('\n'), 'utf8');
  return true;
}

/* ── Main ───────────────────────────────────────────────────────── */

const args = parseArgs(process.argv.slice(2));
const rl = createInterface({ input: process.stdin, output: process.stdout });

try {
  const categories = await readCategories();

  const category =
    args.category ?? (await rl.question(`Division (${categories.join(', ')}): `)).trim();

  if (!categories.includes(category)) {
    throw new Error(`"${category}" is not a division. Add it to src/core/categories.ts first.`);
  }

  const name = args.name ?? (await rl.question('Tool name (e.g. "Find and Replace"): ')).trim();
  if (!name) throw new Error('A tool name is required.');

  const slug = kebab(args.slug ?? name);
  const dir = join(SRC, 'tools', category, slug);

  if (existsSync(join(dir, 'index.ts'))) {
    throw new Error(`src/tools/${category}/${slug}/index.ts already exists.`);
  }

  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'index.ts'), template({ slug, category, name }), 'utf8');

  const identifier = camel(slug);

  // The import block header, e.g.  // ── text ───────────
  const importAnchor = new RegExp(`^// ── ${category}\\b`);
  // The array/object section marker, e.g.  // text
  const listAnchor = new RegExp(`^ {2}// ${category}\\s*$`);

  await register('src/tools/index.ts', importAnchor, `import ${identifier} from './${category}/${slug}';`);
  await register('src/tools/index.ts', listAnchor, `  ${identifier},`);
  await register(
    'src/tools/runners.ts',
    listAnchor,
    `  '${slug}': () => import('./${category}/${slug}'),`,
  );

  console.log(`
Created  src/tools/${category}/${slug}/index.ts
Registered in src/tools/index.ts and src/tools/runners.ts

Next — the 30-step launch checklist is in docs/PROJECT-CHECKLIST.md. The
short version:

  1. Verify the keyword has real search volume before writing any code.
  2. Fill in every TODO. The build fails while placeholders remain.
  3. Write the run() logic; put anything heavy in src/engines.
  4. Write the infoGain block. This is the part that matters most.
  5. Add 6-10 related slugs, and link to it from 5 existing pages.
  6. Set status: 'live'.
  7. npm run typecheck && npm run build
`);
} catch (error) {
  console.error(`\n  ${error.message}\n`);
  process.exitCode = 1;
} finally {
  rl.close();
}
