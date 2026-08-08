#!/usr/bin/env node
/**
 * IndexNow ping — Part 5.9, and Appendix A step 07 item 4.
 *
 * IndexNow tells Bing and Yandex about new or changed URLs immediately
 * rather than waiting for a crawl. That matters more than it looks:
 * ChatGPT's search is Bing-backed, so this is the fastest published
 * route into an AI answer engine's index, not just a minor SEO detail.
 *
 * Setup:
 *   1. Generate a key:  node -e "console.log(crypto.randomUUID().replace(/-/g,''))"
 *   2. Put it in .env.local and in the host's environment as INDEXNOW_KEY
 *   3. Serve it at https://yourdomain/<key>.txt containing the key itself
 *
 * Usage:
 *   npm run seo:indexnow                        submit every live URL
 *   npm run seo:indexnow -- /text/word-counter  submit specific paths
 *   npm run seo:indexnow -- --dry-run           print, do not send
 */

import { readTools } from './lib/read-registry.mjs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const explicit = args.filter((a) => a.startsWith('/'));

const key = process.env.INDEXNOW_KEY;
const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://adeptbay.com').replace(/\/+$/, '');
const host = new URL(origin).host;

if (!key && !dryRun) {
  console.error(
    '\n  INDEXNOW_KEY is not set.\n' +
      '  Generate one, add it to your environment, and serve it at\n' +
      `  ${origin}/<key>.txt before running this.\n`,
  );
  process.exit(1);
}

let urls;

if (explicit.length > 0) {
  urls = explicit.map((path) => `${origin}${path}`);
} else {
  const tools = (await readTools()).filter((t) => t.status === 'live');
  const categories = [...new Set(tools.map((t) => t.category))];

  urls = [
    `${origin}/`,
    `${origin}/all-tools`,
    ...categories.map((c) => `${origin}/${c}`),
    ...tools.flatMap((t) => [
      `${origin}/${t.category}/${t.slug}`,
      `${origin}/${t.category}/${t.slug}/guide`,
    ]),
  ];
}

console.log(`\nIndexNow · ${urls.length} URLs · host ${host}`);

if (dryRun) {
  for (const url of urls) console.log(`  ${url}`);
  console.log('\nDry run — nothing submitted.\n');
  process.exit(0);
}

// The endpoint accepts at most 10,000 URLs per request.
const CHUNK = 10_000;

for (let i = 0; i < urls.length; i += CHUNK) {
  const batch = urls.slice(i, i + CHUNK);

  const response = await fetch('https://api.indexnow.org/IndexNow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host,
      key,
      keyLocation: `${origin}/${key}.txt`,
      urlList: batch,
    }),
  });

  // 200 = accepted, 202 = accepted but the key is still being verified.
  if (response.ok) {
    console.log(`  Batch ${i / CHUNK + 1}: ${batch.length} URLs accepted (${response.status})`);
  } else {
    console.error(`  Batch ${i / CHUNK + 1}: HTTP ${response.status} — ${await response.text()}`);
    process.exitCode = 1;
  }
}

console.log('\nDone. Bing typically reflects this within hours; Google ignores IndexNow.\n');
