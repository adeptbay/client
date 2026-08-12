# AdeptBay

A 1000+ tool platform. One codebase, one domain, one authority pool.

> **Adding a tool means adding one file.** Everything else — the page, the
> metadata, seven schema types, the sitemap entry, breadcrumbs, related tools,
> the search index, the API route — is generated from that file.

Built from *The Founder Bible — Tool Empire*. Part and appendix references in
the source comments point back to it.

---

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

```bash
npm run build        # production build; fails if any tool would ship a thin page
npm start            # serve the production build
npm run typecheck    # tsc --noEmit
```

## Deploy to Vercel

Import the repository — Next.js is detected automatically. One environment
variable is required before the first production build:

```
NEXT_PUBLIC_SITE_URL=https://adeptbay.com
```

Every canonical, sitemap entry, OG image URL and schema `@id` is built from
this one value. Set it in **Project → Settings → Environment Variables** for
the Production environment *before* deploying: `NEXT_PUBLIC_*` values are
inlined at build time, so setting it afterwards needs a redeploy.

**A production build without it fails on purpose** (`src/core/site.ts`).
Falling back to the generated `*.vercel.app` host would tell Google that the
Vercel subdomain is the canonical original and `adeptbay.com` is a copy — a
mistake that is invisible in a green build and expensive to unwind once
indexed. Preview deployments fall back deliberately, because there the
generated host *is* the correct host.

Two settings to confirm in the Vercel dashboard, neither of which lives in
this repo:

- **Settings → Domains** — `adeptbay.com` set as the primary domain, so the
  `*.vercel.app` alias 301s to it instead of serving a second indexable copy.
- **Settings → Deployment Protection** — preview deployments stay protected
  or `noindex`, so branch URLs do not become indexed clones.

Everything else in `.env.example` is optional and off by default. The
Content Security Policy in `next.config.mjs` reads that file too: setting
`NEXT_PUBLIC_ANALYTICS_URL` or `NEXT_PUBLIC_ADSENSE_CLIENT` automatically
widens the policy to permit exactly those hosts, so enabling a feature never
silently fails a CSP check.

---

## Layout

All application code lives under `src/`. The repository root holds only
configuration, `public/`, tooling and documentation.

```
adeptbay/
├── src/
│   ├── app/                      Next.js App Router — routes only, no logic
│   │   ├── (marketing)/          about · methodology · privacy · terms ·
│   │   │                         cookies · accessibility · dmca · contact ·
│   │   │                         changelog · roadmap · pricing
│   │   ├── (tools)/
│   │   │   ├── [category]/       division hub          → /text
│   │   │   │   └── [slug]/       the tool page         → /text/word-counter
│   │   │   │       └── guide/    supporting article    → …/guide
│   │   │   └── all-tools/        the full index
│   │   ├── blog/[slug]/
│   │   ├── api/{og,health}/
│   │   ├── sitemap.xml/          sitemap index
│   │   ├── sitemaps/[shard]/     one sitemap per division
│   │   └── robots.ts
│   │
│   ├── core/                     ★ the platform            → @core/*
│   │   ├── tool.ts               defineTool(), types, the build-time gate
│   │   ├── registry.ts           loads, validates and indexes every tool
│   │   ├── categories.ts         the eleven divisions
│   │   ├── seo.ts                title · meta · canonical · OG
│   │   ├── schema.ts             seven JSON-LD generators
│   │   ├── related.ts            the internal linking algorithm
│   │   ├── sitemap.ts            sharding
│   │   ├── search.ts             index (server)
│   │   ├── search-index.ts       matcher (client — no registry import)
│   │   ├── flags.ts              every revenue feature ships dark
│   │   └── analytics.ts          privacy-first usage beacon
│   │
│   ├── ui/                       shared components         → @ui/*
│   │   ├── ToolShell.tsx         the eleven-section page anatomy
│   │   ├── ToolRunner.tsx        the interactive half
│   │   ├── OptionsForm.tsx       options schema → a real form
│   │   └── …                     Result · Inputs · Actions · Feedback · …
│   │
│   ├── engines/                  heavy logic, no tool knowledge → @engines/*
│   │   ├── text.ts               counting · case · lines · slugs · diff
│   │   ├── crypto.ts             Web Crypto wrappers · Base64 · URL
│   │   ├── random.ts             CSPRNG · passwords · UUID v4/v7 · ULID
│   │   ├── format.ts             JSON parsing with real error positions
│   │   └── math.ts               calculators that show their working
│   │
│   ├── ai/                       provider-agnostic, off by default → @ai/*
│   ├── config/theme.css          design tokens
│   │
│   ├── tools/                    ★ one folder per tool     → @tools/*
│   │   ├── text/word-counter/index.ts
│   │   ├── index.ts              the barrel the registry reads
│   │   └── runners.ts            lazy imports — one chunk per tool
│   │
│   └── content/                  roadmap · changelog · blog posts → @/content/*
│
├── public/                       static assets (must stay at the root)
├── scripts/                      new-tool · audits · IndexNow · CSV export
├── docs/                         architecture · brand · checklist · 90-day plan
└── next.config.mjs · tsconfig.json · postcss.config.mjs · package.json
```

Imports never name these directories — they go through path aliases
(`@core/tool`, `@ui/ToolShell`, `@engines/text`), so moving a boundary is a
change to `tsconfig.json` and nothing else.

### Three rules that keep this working at 1000 tools

1. **No UI code in `src/tools/`.** Metadata and `run()` only. UI always comes
   from `src/ui`.
2. **No tool-specific logic in `src/engines`.** These are reusable primitives;
   a tool composes them.
3. **New tools come from the scaffold.** `npm run new-tool`, never by hand.
   Consistent scaffolding is what makes tool #900 as cheap as tool #9.

---

## Adding a tool

```bash
npm run new-tool -- --category text --slug find-replace --name "Find and Replace"
```

That writes `src/tools/text/find-replace/index.ts` and registers it in
`src/tools/index.ts` and `src/tools/runners.ts`. Fill in the TODO markers, set
`status: 'live'`, and the page exists.

**The build will refuse it until the placeholders are gone.** `src/core/registry.ts`
runs a validation pass at module load, so a tool with no information-gain
block, fewer than four FAQ entries, a meta description outside 80–170
characters, or a broken related-tool reference fails `npm run build` rather
than shipping. That is deliberate: Google's scaled-content policy does not
punish volume, it punishes pages with nothing in them.

---

## Operator scripts

| Command | What it does | When |
|---|---|---|
| `npm run new-tool` | Scaffold and register a tool | Every new tool |
| `npm run audit:orphans` | Orphan pages, weak inbound links, broken targets | Monthly |
| `npm run audit:thin` | Thin-page report and score distribution | Before each launch batch |
| `npm run seo:indexnow` | Submit URLs to Bing and Yandex | After each deploy |
| `npm run registry:export` | Tool list to `exports/tools.csv` | Weekly review |

`registry:export` leaves six columns blank on purpose — they are filled from
Search Console during the weekly review. That join, between what was built and
what it did, is the only reliable input to deciding what to build next.

---

## What is deliberately not here

No test runner, no error-monitoring service, no linter config, no monorepo
tooling, no component library, no icon package, no state manager, no CSS-in-JS.
Three runtime dependencies: `next`, `react`, `react-dom`.

Every one of those has a right time to be added, and it is later. The
hooks are in place: `src/core/analytics.ts` matches the `tool_usage` table schema so
wiring a database is a change of transport; `src/core/flags.ts` means the monetisation
ladder is a sequence of flag flips; `src/ai` is a complete abstraction
with no provider SDK behind it.

## Further reading

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — why it is built this way
- [`docs/BRAND.md`](docs/BRAND.md) — palette, type, voice, logo
- [`docs/PROJECT-CHECKLIST.md`](docs/PROJECT-CHECKLIST.md) — the 350-item plan
- [`docs/90-DAY-PLAN.md`](docs/90-DAY-PLAN.md) — day-by-day execution
