# The 90-day plan

From Appendix C. Built for three hours a day.

**The rule:** if you fall a week behind, push the whole plan back a week.
Never try to do double the following week. Consistency beats speed — the
compounding only starts once the flywheel is turning, and it never turns if
you burn out in month two.

---

## Where this repository already is

Weeks 3 through 5 of this plan — brand, monorepo, platform core, the first ten
components, the SEO generators, sitemap sharding, the scaffold CLI — are
**done**. So are 14 tools, which is week 8's target.

**What is not done is weeks 1 and 2: the market research.** That is not an
oversight to route around. The platform can render a thousand tools; it cannot
tell you which thousand. Tool 15 onwards should be chosen by keyword data, not
by what is easy to build.

Start at week 1. Then jump to week 6.

---

## Weeks 1–2 · Foundation (no code)

| Days | Work |
|---|---|
| 1–2 | Founder OS document · mission · three-year targets · daily system in the calendar |
| 3–5 | Opportunity database · collect 50 problems (Reddit 20, autocomplete 20, own log 10) |
| 6–8 | 50 more problems · choose three categories · classify by the problem pyramid |
| 9–11 | Seven-step keyword research across the three categories · modifier matrix · volume verification |
| 12–13 | SERP teardown for the top 20 keywords · three weaknesses per competitor |
| 14 | 50-point scoring · build order for the first 30 tools · SOM calculation · week review |

**Output:** a scored, ordered list of 30 tools with verified search volume.
Everything after this is execution.

## Week 3 · Brand and setup — DONE

| Days | Work | Status |
|---|---|---|
| 15–16 | 10 names · pronunciation test · .com and trademark check · social handles · buy the domain | Name done. **Buy adeptbay.com.** |
| 17 | Logo · palette · typography · favicon | Done |
| 18–19 | Repo setup · Next.js scaffold · Tailwind preset · GitHub repo | Done |
| 20–21 | Hosting · custom domain · SSL · first deploy | **Do this now — it is one Vercel import** |

## Weeks 4–5 · Platform core — DONE

| Days | Work | Status |
|---|---|---|
| 22–24 | `defineTool()` · tool registry · dynamic route | Done |
| 25–27 | First ten UI components | Done — 23 built |
| 28–30 | SEO generator (meta + 7 schema) · breadcrumbs · the 11-section template | Done |
| 31–33 | Category hub · `/all-tools` · sitemap index and shards · robots.txt | Done |
| 34–35 | `new-tool` scaffold CLI · related-tools algorithm · week review | Done |

## Weeks 6–8 · The first 15 tools

Five a week. Each one needs logic · page · 5 FAQ · InfoGain block · 6 internal
links · a real mobile test.

| Days | Work | Status |
|---|---|---|
| 36–42 | Word Counter · Case Converter · Remove Duplicates · Remove Extra Spaces · Text Diff | 4 of 5 |
| 43–49 | Lorem Ipsum · Slug · Find & Replace · Sort Lines · Text Reverser | 2 of 5 |
| 50–56 | Line Numberer · Text to Columns · Char Frequency · Readability · Text Encryptor + homepage, About, Privacy, Terms, Contact | 1 of 5 · pages done |

### Day 56 — the first real milestone

- [ ] Verify Google Search Console **and** Bing Webmaster Tools, submit sitemaps
- [ ] Connect analytics
- [ ] Run Lighthouse — confirm performance ≥ 90 on every tool
- [ ] Use every tool yourself on a real phone

## Weeks 9–11 · Tools 16–35 and content

| Days | Work | Status |
|---|---|---|
| 57–63 | JSON Formatter · Validator · Minifier · to CSV · CSV to JSON · to YAML · YAML to JSON + first 3 guide articles | Formatter done |
| 64–70 | Base64 · URL Encode · JWT Decoder · Hash Generator · UUID · Regex Tester · Cron Generator + 3 guides · category hub content | 4 of 7 done |
| 71–77 | SQL Formatter · HTML/CSS/JS Beautifier · cURL Converter · JSON Diff · JSON to TS · .gitignore + 3 guides · internal link audit · orphan check | Audits scripted |

## Weeks 12–13 · Launch and measure

| Days | Work |
|---|---|
| 78–80 | Submit to 20 directories · PRs to `awesome-*` lists · GitHub profile |
| 81–83 | Prepare and post Show HN · answer genuinely on Reddit (after 30 days of contributing) |
| 84–86 | AdSense application, if 100+ pages and every policy page is ready · `ads.txt` · ad layout policy |
| 87–88 | Email capture at three points · newsletter setup · welcome sequence |
| 89 | KPI dashboard · AI citation tracker baseline · cost spreadsheet |
| 90 | 90-day review: how many pages indexed? average position? which tools have impressions? Write the next 90 days. |

---

## What day 90 realistically looks like

- 35–40 live tools · 10–15 articles · 60–80 indexed pages
- 200–2,000 monthly visitors, mostly direct and referral — search has not
  started yet
- Revenue: $0–$5

**If that feels like failure, it is not.** At this stage the metrics that
matter are indexed pages and production speed. Money arrives in months 6–12.
Months 1–6 are the valley, and this plan exists to get you across it.

The real achievement by day 90 is a working production system: 45 minutes per
tool, repeatable, and handing off cleanly to someone else.

---

## The weekly review — 30 minutes, every week

Appendix D.3. Do not skip it. It is the only thing that catches a bad
direction before it costs a month.

```
Week #___   Date: ______

  New tools shipped        : ___   (target: 5)
  New articles             : ___
  Indexed pages (total)    : ___   (last week: ___)
  Search Console clicks    : ___   (Δ ___%)
  Impressions              : ___   (Δ ___%)
  Average position         : ___
  Visitors                 : ___
  Pages per session        : ___
  Revenue                  : $___

  1. What worked best this week?
  2. Where did the most time go?
  3. What am I dropping next week?

  Next week's three priorities:
  1. ______   2. ______   3. ______
```

Commands to run before filling it in:

```bash
npm run registry:export     # tool list → exports/tools.csv
npm run audit:orphans       # inbound link problems
npm run audit:thin          # thin page report
```

---

## The four rhythms

| Cadence | Time | What |
|---|---|---|
| Daily | 5 min | Search Console click trend. Any sudden drop? Are new pages indexed? |
| Weekly | 30 min | Top 20 queries and pages. Pages with impressions but poor CTR — fix the title. New queries with no page yet. |
| Monthly | 2 h | Indexing rate (indexed ÷ submitted). Per-division performance. Core Web Vitals. AI citation check. |
| Quarterly | 1 day | Content audit: prune thin pages, update old ones, plan the next cluster, re-assess competitors. |
