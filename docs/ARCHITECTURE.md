# Architecture

Why this codebase is shaped the way it is. Every decision here is a bet about
what breaks at 1000 tools, not at 14.

---

## 0. Layout: `src/`, not the book's monorepo

Part 6.3 specifies a pnpm workspace: `apps/web/`, `apps/worker/`, `apps/docs/`
and a sibling `packages/*`. That is the right shape for three deployable
applications sharing code. There is one application, so the workspace would be
overhead with no payoff — a second `package.json` per boundary, a build
orchestrator, and a Vercel project that needs configuring instead of detecting.

The boundaries the book cares about are kept exactly; only the container
changes.

| Book | Here | Alias |
|---|---|---|
| `apps/web/app/` | `src/app/` | — |
| `packages/core/` | `src/core/` | `@core/*` |
| `packages/ui/` | `src/ui/` | `@ui/*` |
| `packages/engines/` | `src/engines/` | `@engines/*` |
| `packages/ai/` | `src/ai/` | `@ai/*` |
| `packages/config/` | `src/config/` | — |
| `tools/` | `src/tools/` | `@tools/*` |
| `content/` | `src/content/` | `@/content/*` |

Two things follow from this that matter more than the folder names:

- **`packages/` was the wrong word anyway.** A package is a separately
  versioned, separately published unit with its own manifest. These have none
  of that. Inside `src/`, calling them `core`, `ui` and `engines` describes
  what they actually are.
- **No import statement names a directory.** Everything goes through the
  aliases above, so this whole restructure touched `tsconfig.json`, one CSS
  import and the ops scripts — and not a single `import` line in 96 source
  files. When a worker app does appear and the monorepo becomes worth its
  cost, the same property makes that move cheap.

Config, `public/`, `scripts/` and `docs/` stay at the repository root: they are
not application source, and `public/` has to be there for Next.js to serve it.

---

## 1. A tool is a data record

The single most important idea in the codebase (Part 6.2).

Most developers model a tool as **code**: a page, a component, a handler. That
works to about fifty tools and then collapses, because every tool is a
snowflake and improving the page template means editing fifty files.

Here a tool is **data plus one function**:

```ts
export default defineTool({
  slug, category, cluster, name, tagline, description, keywords,
  runtime, status, score,
  input, options, output,
  howTo, faq, infoGain, related, nextSteps,
  run,            // ← the only part that is new each time
});
```

From that one record the platform generates the page, the title, the meta
description, the canonical, the OG image, four schema types, the sitemap
entry, the breadcrumb, the related-tools block, the search index entry and
the category hub listing.

**The payoff compounds.** Improving the page anatomy improves every page at
once. Adding a schema type adds it everywhere. The 900th tool costs the same
as the 9th.

---

## 2. Client-side by default

Part 4.4, "the golden rule": if the browser can do it, the server must not.

| | Server-side | Client-side |
|---|---|---|
| Cost at 1M visits | Bandwidth + compute + storage | Zero |
| Latency | Upload, queue, process, download | Immediate |
| Privacy | A copy existed on your disk | No copy exists |
| Abuse surface | Your compute, someone else's purpose | None |
| Scaling work | Real | The CDN's problem |

This is why the free tier has no sign-up, no quota and no file size cap: those
restrictions are what a server bill looks like from the outside, and there is
no server bill.

Some jobs genuinely need a server — large video transcoding, high-accuracy
OCR, Office format conversion. Those are labelled on the page, and the
pipeline for them (presigned upload direct to object storage, queue, worker,
two-hour lifecycle deletion) is specified in Part 6.7 and not yet built,
because nothing needs it yet.

---

## 3. The client/server boundary is load-bearing

The subtle failure mode of this architecture: the registry imports every tool
definition, and it runs a validation pass at module scope, which means it
**cannot be tree-shaken**. Any client component that transitively imports
`src/core/registry.ts` drags all 1000 tool definitions — and their `run` functions —
into the browser bundle.

Two places where that nearly happened, and how they are handled:

- **Search.** `src/core/search.ts` builds the index and imports the registry.
  `src/core/search-index.ts` holds only the matcher and imports nothing. The command
  palette imports the second and receives the index as a prop from the server.
- **Byte formatting.** `formatBytes` lives in `src/engines/bytes.ts`, not
  `src/engines/format.ts`, so a client component does not pull in a JSON parser to
  render "2.4 MB".

**Rule: before importing anything from `@core` into a `'use client'` file,
follow the import chain.** If it reaches `src/core/registry.ts`, split it.

## 4. One chunk per tool

`src/tools/index.ts` is a barrel of static imports — the registry's input, server
side only. `src/tools/runners.ts` is a map of *dynamic* imports:

```ts
'word-counter': () => import('./text/word-counter'),
```

`ToolRunner` looks up the slug and awaits it, so the bundler emits one chunk
per tool. A visitor on `/text/word-counter` downloads that tool's logic and
none of the other 999.

An explicit barrel rather than a filesystem scan or `require.context`, because
a static import graph is what lets the bundler prove which chunk belongs to
which page. `npm run new-tool` maintains both files.

---

## 5. The build is the quality gate

There is no test runner. Instead `src/core/registry.ts` audits every definition at
module load, which means it runs during `next build` and fails it:

- meta description outside 80–170 characters
- fewer than four FAQ entries, or three how-to steps
- an information-gain block with no benchmark, table, limits or errors
- a `related` slug that does not exist
- a tool in the barrel but missing from the runner map
- a duplicate URL, or a category not in `categories.ts`
- a 50-point score below the build threshold

This is a deliberate trade. Unit tests catch logic errors, and the engines are
pure functions where a test suite would earn its place later. But the failure
mode that actually kills this business model is not a wrong word count — it is
shipping 400 pages with nothing on them and taking a scaled-content penalty.
The check that matters most is the one that runs on every build.

---

## 6. Rendering strategy

| Page | Strategy | Why |
|---|---|---|
| Tool page | SSG for the top 200 by score, ISR for the rest, 24h | 1000 eager pages is an 8–20 minute build; this is under two |
| Category hub | ISR, 1h | A new tool appears within the hour |
| Homepage | ISR, 10m | The "recently added" strip stays fresh |
| Guide / blog | SSG | Content does not change per request |
| Sitemaps | ISR, 1h | Regenerate as tools land |
| OG image | On demand, cached immutably | A pure function of the query string |
| `/api/health` | Dynamic | Reads the registry, so it fails when the registry does |

---

## 7. Theming without variants

Two layers in `src/config/theme.css`:

1. **Raw ramps** (`--color-brand-600`) — the physical colours. Components never
   reference these.
2. **Semantic roles** (`--brand`, `--fg-muted`, `--line`) defined on `:root`
   and redefined under `[data-theme="dark"]`, then exposed through
   `@theme inline` as utilities.

So `bg-panel` resolves to `var(--panel)` and changes meaning when the
attribute flips. **No component contains a single `dark:` variant.** At 1000
pages, a dark mode that requires remembering a variant on every colour is a
dark mode that is broken on a quarter of the site.

A blocking inline script in `<head>` sets `data-theme` before first paint, so
there is no flash and no layout shift.

---

## 8. Where the money hooks are, dark

Nothing revenue-related is switched on, and all of it is wired:

- `src/core/flags.ts` — ads, premium, api, ai, newsletter, analytics. All false.
- `AdSlot` — renders `null` when the flag is off, and reserves its height when
  on. There is no `above-fold` placement, and adding one requires editing that
  file. That is the point.
- `src/core/analytics.ts` — the event shape is a one-to-one match for the `tool_usage`
  table in Part 6.4, so standing up Postgres is a change of transport.
- `src/ai` — router, cache, guardrails and a daily budget cap, with no
  provider SDK. Two environment variables switch providers.

The monetisation ladder is a sequence of flag flips, not a sequence of
rewrites.

---

## 9. What is missing, on purpose

| Not here | Add it when |
|---|---|
| Test runner | The engines get complex enough that the build gate is not enough |
| Error monitoring | There is enough traffic that a broken tool goes unreported |
| Database | The first user account or server-side tool |
| Redis | The first rate-limited endpoint |
| Object storage | The first file upload |
| Job queue | The first job over ~5 seconds |
| Monorepo tooling | The build exceeds a few minutes, or a second app appears |
| MDX | Roughly 50 blog posts |
| i18n | The English divisions are deep, not before |

Each is a real cost — dependency surface, build time, cognitive load — and
each has a threshold at which the cost is worth paying. None of those
thresholds have been reached.

---

## 10. Two CSS traps that have already bitten this codebase

Both were real bugs, both are fixed, and both will recur if someone
"simplifies" the fix. Worth knowing before touching layout code.

### `backdrop-filter` creates a containing block for `position: fixed`

The site header is `sticky top-0 z-40 backdrop-blur-md`. Any element with
`backdrop-filter` (also `transform`, `filter`, `perspective`, `contain` or
`will-change`) becomes the **containing block for fixed-position descendants**.

The command palette originally rendered its overlay in place, inside the
header. `fixed inset-0` therefore resolved to the header's 64px box rather
than the viewport: the modal floated over an undimmed page with only the
header strip darkened. The header's `z-40` compounded it by trapping the
`z-50` overlay in a stacking context it could not escape.

**Fix:** `ToolSearch` renders the dialog through `createPortal` into
`document.body`. Any future modal, drawer or popover triggered from inside the
header must do the same.

### `field-sizing: content` collapses an empty textarea

Setting it globally on `textarea` made every empty tool input render one row
tall, which destroys the "the tool is usable the moment the page loads"
promise — the input has to look like somewhere you can paste 500 lines. The
base layer now leaves it unset and `rows` governs the initial height.

---

## 11. Known limits

Honest list, so nobody discovers these the hard way:

- **The search index ships to the browser.** Fine at 14 tools, roughly 100 KB
  at 1000. Around 2000 it must move behind an edge route. The matcher already
  takes entries as an argument, so only the transport changes.
- **`crossCategoryTools` is O(n) per page render.** At 1000 tools that is a
  1000-item scan per page, at build time. Acceptable; memoise if the build
  slows.
- **The AI response cache is per-instance and in-memory.** It resets on
  redeploy. That is a circuit breaker, not accounting — it moves to Redis at
  the same time the rate limiter does.
- **Guide pages are generated from tool metadata.** Correct and specific to
  each tool, but not hand-written. The 90-day plan allocates three
  hand-written replacements per week.
- **`PdfPreview`, `LightCodeEditor` and `ImagePreview` are not built.** They
  land with the first tools that need them, rather than as unused stubs.
