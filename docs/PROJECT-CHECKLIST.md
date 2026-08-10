# Project checklist

The full build plan — 14 stages, 350+ items. From Appendix A of *The Founder
Bible*, with this codebase's actual status against each one.

**Legend:** `[x]` done · `[~]` partly done · `[ ]` not started · `→` where it
lives in the repo

Statuses are as of **2026-08-08**. Update this file, not your memory. Past
fifty tools, memory stops being a reliable input to decisions.

---

## Stage 01 · Strategy and foundation — 18 items

- [x] 1. Founder OS document (vision · problems · ideas · daily log · lessons)
- [x] 2. Mission statement in one sentence → `src/core/site.ts`
- [ ] 3. Three-year targets in numbers (traffic · revenue · tool count)
- [ ] 4. Daily working system, blocked in the calendar
- [ ] 5. Decision journal started
- [ ] 6. Opportunity database spreadsheet (11 columns) → seed with `npm run registry:export`
- [ ] 7. Collect 100 problems (Reddit · autocomplete · competitors · own log)
- [ ] 8. Classify by the problem pyramid
- [x] 9. Choose three starting categories → text, developer, security
- [ ] 10. Seven-step keyword research for each category
- [ ] 11. SERP teardown for the top 20 keywords
- [ ] 12. Competitor analysis — 5 sites × 3 weaknesses each
- [ ] 13. Calculate and write down the SOM
- [x] 14. "Never build" list → `src/app/(marketing)/about/page.tsx`
- [x] 15. Business model canvas filled in
- [x] 16. Build order for the first 30 tools via the 50-point score
- [ ] 17. Unit economics with your own assumptions
- [ ] 18. 90-day plan in the calendar → `docs/90-DAY-PLAN.md`

> **Do stage 01 before writing more code.** The platform is built; what is
> missing is the keyword research that decides what to put in it. Building
> tool 15 without item 10 is guessing.

## Stage 02 · Brand and domain — 16 items

- [x] 1. Brainstorm 10 brand names
- [x] 2. Pronunciation test
- [ ] 3. Check .com availability — **adeptbay.com must be registered**
- [ ] 4. Trademark search (local registry + USPTO + EUIPO)
- [ ] 5. Social handles (X, GitHub, YouTube, Reddit, LinkedIn)
- [ ] 6. Buy the domain + auto-renew + WHOIS privacy
- [ ] 7. Defensive domains (.io / .app / misspellings) — optional
- [x] 8. Logo → `src/ui/Logo.tsx`, `src/app/icon.svg`, `public/logo.svg`
- [x] 9. Brand palette (primary · accent · 5 neutral shades) → `docs/BRAND.md`
- [x] 10. Typography, two families maximum → Inter + JetBrains Mono
- [x] 11. Favicon → `src/app/icon.svg`
- [x] 12. OG image template → `src/app/api/og/route.tsx`
- [x] 13. Tone of voice guide, five lines → `src/core/site.ts`
- [x] 14. Tagline under eight words
- [ ] 15. Email domain setup (SPF · DKIM · DMARC)
- [x] 16. Brand asset folder in the repo

## Stage 03 · Engineering foundation — 32 items

- [ ] 1. Private GitHub repo + branch protection
- [~] 2. Workspace/monorepo — **single app with the same boundaries**; split when a second app appears
- [x] 3. TypeScript strict config → `tsconfig.json`
- [ ] 4. ESLint + Prettier — deliberately deferred
- [x] 5. Tailwind preset with brand tokens → `src/config/theme.css`
- [x] 6. Next.js App Router scaffold
- [x] 7. `src/core` — `defineTool()` and types
- [x] 8. Tool registry loader + validation
- [x] 9. Dynamic route `/[category]/[slug]`
- [x] 10. Category hub route
- [x] 11. `/all-tools` index
- [x] 12. SEO generator (title · meta · canonical · OG)
- [x] 13. Seven schema generators → `src/core/schema.ts`
- [x] 14. Sitemap index + per-category shards
- [x] 15. `robots.txt`
- [x] 16. Dynamic OG image route
- [x] 17. 404 and error pages, helpful, with search
- [x] 18. Dark / light theme
- [ ] 19. i18n foundation (route structure ready, languages later)
- [ ] 20. PWA manifest + service worker
- [~] 21. Analytics integration — beacon written, provider not connected
- [ ] 22. Error tracking — deliberately deferred
- [x] 23. Feature flag system → `src/core/flags.ts`
- [x] 24. `scripts/new-tool.mjs` scaffold CLI
- [x] 25. Orphan page audit script
- [x] 26. Thin page report script
- [x] 27. IndexNow ping script
- [~] 28. CI: typecheck · lint · test — typecheck runs in `next build`
- [ ] 29. CI: Lighthouse threshold gate
- [ ] 30. CI: bundle size budget
- [ ] 31. Preview deployment
- [ ] 32. Production deployment + rollback procedure

## Stage 04 · Component library — 26 items

- [x] 1. ToolShell → `src/ui/ToolShell.tsx`
- [x] 2. FileDropzone (drag · paste · click · multi)
- [x] 3. MultiFileList (reorder · remove)
- [x] 4. MonospaceTextArea
- [ ] 5. LightCodeEditor with syntax highlighting — lands with the first code tool
- [x] 6. OptionsForm (schema → form, automatically)
- [x] 7. ResultBox
- [x] 8. DiffViewer
- [ ] 9. ImagePreview (zoom · before/after) — lands with the image division
- [ ] 10. PdfPreview — lands with the PDF division
- [x] 11. ProgressBar
- [x] 12. CopyButton
- [~] 13. DownloadButton — single file done; ZIP lands with batch tools
- [x] 14. ShareButton
- [x] 15. ResetButton
- [x] 16. ErrorPanel (cause + fix)
- [x] 17. HowToSection
- [x] 18. FaqSection (accordion + schema)
- [x] 19. InfoGainBlock
- [x] 20. RelatedTools
- [x] 21. NextStepStrip
- [x] 22. Breadcrumb
- [x] 23. AdSlot (min-height, lazy, flag-gated)
- [x] 24. UpgradePrompt
- [x] 25. ToolSearch (command palette)
- [x] 26. Toast / notifications

## Stage 05 · The first 15 tools — 15 items

Block 1 of Part 4. Each needs: logic · page · FAQ · InfoGain · 6 internal
links · index verification.

- [x] 1. Word Counter
- [x] 2. Case Converter
- [x] 3. Remove Duplicate Lines
- [x] 4. Remove Extra Spaces
- [x] 5. Text Diff
- [x] 6. Lorem Ipsum Generator
- [x] 7. Slug Generator
- [x] 8. Find & Replace
- [x] 9. Sort Lines
- [x] 10. Text Reverser
- [x] 11. Line Numberer
- [x] 12. Text to Columns
- [x] 13. Character Frequency Counter
- [x] 14. Readability Checker
- [x] 15. Text Encryptor

**Also live, ahead of schedule:** JSON Formatter, Base64 Encode/Decode, URL
Encode/Decode, UUID Generator, Password Generator, Hash Generator, Percentage
Calculator. **22 live in total — stage 05 is complete.**

## Stage 06 · Content system — 22 items

- [~] 1. MDX pipeline — typed content modules instead; MDX at ~50 posts
- [x] 2. Article template (H1 · TL;DR · steps · table · FAQ · CTA)
- [~] 3. Tool guide template — live, generated from tool metadata
- [ ] 4. Comparison page template (with our own data)
- [ ] 5. Glossary page template
- [x] 6. Process for writing 5–8 FAQ entries per tool
- [x] 7. Habit of collecting InfoGain data while building
- [ ] 8. AI draft → human edit workflow
- [ ] 9. Content calendar
- [ ] 10. Image / diagram style guide
- [ ] 11. Alt text policy
- [ ] 12. Author page (E-E-A-T)
- [x] 13. About page
- [x] 14. Methodology page — **critical for AI citation**
- [x] 15. Changelog page
- [x] 16. Roadmap page (public)
- [x] 17. Contact / support page
- [x] 18. Privacy Policy
- [x] 19. Terms of Service
- [x] 20. Cookie notice + consent — currently zero cookies, documented
- [x] 21. DMCA / complaints page
- [x] 22. Accessibility statement

> Policy pages need a lawyer's review before launch. They are accurate about
> how the software behaves, which is necessary and not sufficient.

## Stage 07 · SEO implementation — 28 items

- [ ] 1. Verify Google Search Console
- [ ] 2. Verify Bing Webmaster Tools — **not optional; ChatGPT search is Bing-backed**
- [ ] 3. Submit sitemap to both
- [ ] 4. IndexNow key setup → script ready at `npm run seo:indexnow`
- [x] 5. Eleven-section tool page template
- [x] 6. Title and meta templates
- [x] 7. Self-referencing canonical tags
- [ ] 8. hreflang (once i18n exists)
- [x] 9. Internal linking algorithm (related · cluster · cross-category)
- [x] 10. Footer navigation to every category
- [x] 11. Breadcrumbs on every page
- [x] 12. Seven schema types
- [x] 13. Click depth ≤ 3 verified
- [x] 14. Zero orphan pages → `npm run audit:orphans`
- [ ] 15. Broken link check
- [x] 16. Block parameter URLs in robots.txt
- [ ] 17. Core Web Vitals baseline measurement
- [x] 18. LCP optimisation (lazy-load heavy code)
- [x] 19. CLS optimisation (ad slot heights reserved)
- [ ] 20. INP optimisation (Web Worker for heavy processing)
- [ ] 21. Image optimisation (AVIF/WebP, correct sizes)
- [x] 22. Font optimisation (self-hosted, `display: swap`, size-adjusted fallback)
- [x] 23. Mobile UX audit — every tool tested by hand
- [ ] 24. Search Console API → own database
- [ ] 25. AI citation tracker sheet (20 questions)
- [ ] 26. Weekly SEO routine SOP
- [ ] 27. Quarterly content audit SOP
- [x] 28. Traffic-drop diagnostic checklist → in this file, below

## Stage 08 · Infrastructure and security — 26 items

- [ ] 1. Hosting setup (Vercel / Cloudflare)
- [ ] 2. Custom domain + SSL
- [x] 3. CDN cache rules
- [x] 4. Security headers (CSP · HSTS · nosniff · Referrer-Policy) → `next.config.mjs`
- [ ] 5. PostgreSQL (Neon / Supabase) + migrations
- [ ] 6. Database schema (Part 6.4)
- [ ] 7. Daily backups + restore test
- [ ] 8. Redis (Upstash) for cache and rate limiting
- [ ] 9. Object storage (R2) + lifecycle rule (1–2 hours)
- [ ] 10. Presigned URL flow
- [ ] 11. Job queue + worker
- [ ] 12. Rate limit middleware (six tiers)
- [ ] 13. Cloudflare Turnstile
- [~] 14. File type validation — extension check done; magic bytes with the first file tool
- [ ] 15. Decompression bomb guard
- [ ] 16. Processing timeout and memory limits
- [ ] 17. SSRF protection (for URL-input tools)
- [x] 18. Server-side input validation — derived from each tool's own options schema
- [x] 19. Secrets in env only, never in code
- [ ] 20. Dependabot / dependency audit
- [ ] 21. Licence audit (GPL/AGPL check)
- [ ] 22. Uptime monitoring (5 endpoints) → `/api/health` ready
- [ ] 23. Status page
- [ ] 24. Incident response SOP
- [x] 25. No PII in logs — verified; no logging of input contents anywhere
- [x] 26. Data retention policy written → `src/app/(marketing)/privacy/page.tsx`

> Items 5–17 are not needed until the first server-side tool. Building them
> now is infrastructure with no traffic on it.

## Stage 09 · Monetisation — 24 items

- [ ] 1. AdSense application (needs 100+ pages and the policy pages, both ready)
- [ ] 2. `ads.txt`
- [x] 3. Ad layout policy, written → `src/ui/AdSlot.tsx`
- [x] 4. min-height on the AdSlot component
- [x] 5. Ad lazy-loading
- [x] 6. Maximum units per page fixed at two
- [ ] 7. RPM tracking dashboard
- [ ] 8. Raptive trigger (25,000 pageviews) in the calendar
- [ ] 9. Mediavine trigger (50,000 sessions) in the calendar
- [ ] 10. Backup plan if AdSense is refused, written
- [ ] 11. Choose five affiliate programmes
- [ ] 12. Affiliate disclosure + `rel="sponsored"`
- [ ] 13. Three email capture points
- [ ] 14. Email platform + welcome sequence
- [ ] 15. Newsletter template
- [ ] 16. Premium feature list, final
- [x] 17. Pricing page → `src/app/(marketing)/pricing/page.tsx` (noindex until live)
- [ ] 18. Merchant-of-record account (Paddle / Lemon Squeezy / Polar)
- [ ] 19. Checkout flow + webhooks
- [ ] 20. Subscription state management
- [ ] 21. Dunning sequence
- [ ] 22. Refund policy and process
- [ ] 23. API key management + quotas
- [ ] 24. API documentation site

## Stage 10 · Distribution — 22 items

- [ ] 1. Pick five subreddits, contribute for 30 days *before* posting
- [ ] 2. Show HN plan
- [ ] 3. Product Hunt assets (GIF · copy · hunter)
- [ ] 4. Submit to 20 directories
- [ ] 5. PRs to `awesome-*` lists
- [ ] 6. Open-source one tool's core
- [ ] 7. Publish an npm package
- [ ] 8. GitHub profile / org setup
- [ ] 9. Chrome extension MVP
- [ ] 10. Chrome Web Store listing
- [ ] 11. Firefox / Edge ports
- [ ] 12. YouTube channel + 10 shorts
- [ ] 13. Build-in-public routine on X / LinkedIn
- [ ] 14. Embeddable widget + embed code
- [ ] 15. Brand monitoring (Google Alerts)
- [ ] 16. Broken link reclaim campaign
- [ ] 17. Partnership outreach list
- [x] 18. "Next step" retention loop → `NextStepStrip`
- [ ] 19. Bookmark prompt
- [ ] 20. localStorage history
- [x] 21. Shareable result links → options stored in the URL
- [ ] 22. Channel share dashboard

## Stage 11 · AI layer — 16 items

- [x] 1. `src/ai` abstraction layer
- [x] 2. Model router (three tiers)
- [ ] 3. Prompt library, version controlled
- [ ] 4. Prompt caching enabled
- [x] 5. Response cache (hash-based; in-memory, moves to Redis)
- [x] 6. `max_tokens` and output limits
- [ ] 7. Quota system (anonymous · registered · premium)
- [x] 8. Daily budget cap + alert
- [x] 9. Prompt injection protection
- [x] 10. Output schema validation
- [ ] 11. Moderation layer
- [x] 12. PII masking
- [x] 13. "AI-generated" label in the UI → `AI_DISCLOSURE`
- [ ] 14. Eval set (20+ cases per feature)
- [ ] 15. Eval CI gate (90% pass)
- [x] 16. Per-call cost tracking

## Stage 12 · Legal, financial, operational — 24 items

- [ ] 1. Tax identification number
- [ ] 2. Trade licence, if applicable
- [ ] 3. Business bank account, separate from personal
- [ ] 4. Foreign currency / export retention account — ask your bank
- [ ] 5. Payoneer account
- [ ] 6. Wise or an alternative (check availability)
- [ ] 7. Income and expense spreadsheet, from day one
- [ ] 8. Monthly financial close routine
- [ ] 9. Subscription cost register
- [ ] 10. Initial consultation with an accountant
- [ ] 11. Annual tax calendar
- [ ] 12. VAT applicability check
- [ ] 13. Company registration, once revenue justifies it
- [ ] 14. Trademark application
- [ ] 15. Contractor agreement template (with IP assignment)
- [ ] 16. NDA template
- [ ] 17. Invoice template
- [ ] 18. Reserve fund (six months of costs)
- [ ] 19. First six SOPs
- [ ] 20. Password manager + 2FA on every account
- [ ] 21. Access register
- [ ] 22. Backup policy (code · database · documents)
- [ ] 23. Bus-factor document
- [ ] 24. Annual strategy rewrite date

> **Revenue first, structure second.** Registering a company at zero revenue
> buys annual filings, an audit and accountant fees, and nothing else.

## Stage 13 · Measurement — 18 items

- [ ] 1. Define the North Star metric — proposed: monthly successful tool runs
- [ ] 2. KPI tree document
- [ ] 3. Per-tool dashboard (runs · success · p95 · clicks · position · RPM)
- [ ] 4. Traffic source breakdown
- [ ] 5. Returning user tracking
- [ ] 6. Pages per session tracking
- [ ] 7. Tool success rate alert (under 95%)
- [ ] 8. Indexing rate tracking
- [ ] 9. Core Web Vitals monitoring
- [ ] 10. Revenue dashboard by source
- [ ] 11. Cost dashboard as a percentage of revenue
- [ ] 12. Premium funnel tracking (five steps)
- [ ] 13. Churn and retention cohorts
- [ ] 14. API usage and quota
- [ ] 15. AI cost tracking
- [ ] 16. AI citation tracker
- [ ] 17. Weekly review template
- [ ] 18. Monthly investor-style update, written to yourself

## Stage 14 · Scale — 20 items

- [~] 1. Tool production line SOP → `npm run new-tool` + the launch checklist below
- [ ] 2. Hire the first VA, with a trial project
- [ ] 3. Content writer onboarding
- [ ] 4. Frontend developer hire
- [ ] 5. Code review process
- [ ] 6. On-call / incident rotation
- [ ] 7. i18n — first three languages
- [ ] 8. Public API launch
- [ ] 9. SaaS product selection (verify five signals)
- [ ] 10. SaaS MVP scope
- [ ] 11. Enterprise / white-label offer
- [ ] 12. Portfolio strategy decision
- [ ] 13. Acquisition due-diligence checklist
- [ ] 14. Exit-readiness checklist
- [ ] 15. Valuation tracking (monthly net × multiple)
- [ ] 16. Risk register (12 failure patterns)
- [ ] 17. Quarterly theme setting
- [ ] 18. Annual strategy retreat (one day, alone)
- [ ] 19. Succession / bus-factor plan
- [ ] 20. Personal: one full day off per week

---

# Per-tool launch checklist — 30 steps

Run this for every new tool. Appendix D.1.

**Before writing code**
1. Verify the keyword and its real search volume
2. Write the SERP teardown
3. State the differentiator in one sentence
4. Score it — build only at 30 or above

**Build**
5. `npm run new-tool`
6. Fill in the metadata (slug, category, cluster)
7. Define the input and options schema
8. Write `run()` — heavy logic goes in `src/engines`
9. Test three normal cases by hand
10. Error handling, with a fix in every message
11. Test with a very large input
12. Test with empty and malformed input
13. Add two worked examples

**Content**
14. Write the InfoGain block — benchmark, limits, support matrix
15. Five to eight FAQ entries
16. Three to five how-to steps
17. Title and meta description
18. Verify the OG image renders
19. Validate the schema (Rich Results Test)

**Linking**
20. Six to ten related tools
21. Link from five existing pages
22. Confirm it appears on the category hub

**Quality**
23. Test on a real phone, by hand
24. Lighthouse ≥ 90
25. Check CLS with the ad slot rendered
26. Accessibility: keyboard-only, labels, focus

**Launch**
27. Confirm it is in the sitemap
28. `npm run seo:indexnow`
29. URL Inspect in Search Console
30. Update the status in the spreadsheet

---

# Traffic-drop diagnostic

In this order. Most people check last what should be checked first.

1. **Is the site broken?** Rendering, robots.txt, canonical tags. Check this
   first, not last — it is the most common cause and the easiest to fix.
2. Search Console → Manual Actions. A policy problem?
3. Coverage report. Have pages been de-indexed?
4. Is the drop site-wide, or one division? A specific problem or a general one?
5. Does the date line up with a known core update?
6. Are impressions down, or only CTR? **CTR down with position unchanged means
   an AI Overview appeared** — that is a snippet problem, not a ranking one.
7. Did competitors drop too? Then it is market-wide.
