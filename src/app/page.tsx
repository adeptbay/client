import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  activeCategories,
  countInCategory,
  liveTools,
  recentTools,
  topTools,
  totalLive,
} from "@core/registry";
import { site } from "@core/site";
import { pageMetadata } from "@core/seo";
import { Badge, Card } from "@ui/primitives";
import { ToolCard } from "@ui/ToolSections";
import {
  ArrowRightIcon,
  BoltIcon,
  CategoryIcon,
  CheckIcon,
  ChevronRightIcon,
  ShieldIcon,
} from "@ui/Icons";

export const metadata: Metadata = pageMetadata({
  title: `${site.name} — Free Online Tools That Run In Your Browser`,
  description: site.description,
  path: "/",
  ogTitle: site.name,
  ogKicker: site.tagline,
});

// Part 6.6 — the homepage carries a "recently added" strip, so it
// revalidates every ten minutes rather than being frozen at build time.
export const revalidate = 600;

const PROMISE_ICONS = [
  <ShieldIcon key="s" size={19} />,
  <BoltIcon key="b" size={19} />,
  <ArrowRightIcon key="a" size={19} />,
];

/** The three things a first-time visitor is actually checking for. */
const HERO_PROOF = ["No sign-up", "No upload", "No watermark"];

/**
 * The sample shown in the hero preview panel. Counted by hand so the
 * numbers beside it are the real ones — the site's own voice rule is
 * "specific, never decorative", and a mocked-up screenshot that lies
 * about its own output is the first thing a sceptical visitor spots.
 */
const SAMPLE = "AdeptBay processes this text in your browser.";

export default function HomePage() {
  const categories = activeCategories();
  const featured = topTools(8);
  const recent = recentTools(4);
  const count = totalLive();
  // Stated as a share, not a count: "24 tools / 24 offline" reads as a
  // duplicated number, and the percentage keeps telling the truth on its
  // own the day the first server-side tool ships.
  const offlineShare = count
    ? Math.round((liveTools().filter((t) => t.runtime === "client").length / count) * 100)
    : 0;

  return (
    <>
      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden border-b border-line bg-surface">
        {/* Decorative backdrop, in two layers. Sits behind everything
            and is invisible to assistive tech. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bay-glow" />
          <div className="absolute inset-0 bay-grid opacity-70" />
        </div>

        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            {/* ── Copy ─────────────────────────────────────────── */}
            <div className="lg:col-span-7">
              <Badge tone="brand" className="gap-2 py-1 pl-2 pr-3">
                <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
                </span>
                {count} tools live · more every week
              </Badge>

              <h1 className="mt-5 max-w-2xl text-[2.125rem] font-semibold leading-[1.08] tracking-tight text-fg sm:text-[3.25rem]">
                Every tool you need,{" "}
                <span className="bg-linear-to-r from-brand to-brand-hover bg-clip-text text-transparent">
                  in one bay.
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-fg-muted sm:text-[17px]">
                Fast, free utilities for developers, students and businesses.
                Most of them run entirely in your browser — so your files are
                never uploaded, and there is no sign-up, no quota and no
                watermark.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/all-tools"
                  className="group inline-flex h-12 items-center gap-2 rounded-lg bg-brand px-6 text-[15px]
                             font-medium text-fg-onbrand shadow-[0_10px_30px_-14px_var(--brand)]
                             transition-colors hover:bg-brand-hover"
                >
                  Browse all tools
                  <ArrowRightIcon
                    size={17}
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </Link>
                <Link
                  href="/methodology"
                  className="inline-flex h-12 items-center rounded-lg border border-line bg-panel px-6 text-[15px]
                             font-medium text-fg transition-colors hover:border-line-strong hover:bg-sunken"
                >
                  How we build these
                </Link>
              </div>

              <ul className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2.5">
                {HERO_PROOF.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-1.5 text-[13px] font-medium text-fg-muted"
                  >
                    <CheckIcon size={15} className="text-brand" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Product proof ────────────────────────────────────
                A static picture of what "runs in your browser" means,
                above the fold. No client JavaScript, and hidden below
                lg so the mobile hero stays one screen tall.          */}
            <div className="relative hidden lg:col-span-5 lg:block">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-brand/10 blur-3xl"
              />
              <div className="relative overflow-hidden rounded-2xl border border-line bg-panel shadow-pop">
                <div className="flex items-center gap-2.5 border-b border-line bg-sunken px-3.5 py-2.5">
                  <span className="flex gap-1.5" aria-hidden="true">
                    <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
                    <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
                    <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
                  </span>
                  <span className="min-w-0 flex-1 truncate rounded-md border border-line bg-panel px-2.5 py-1 font-mono text-[11px] text-fg-subtle">
                    {site.domain}/text/word-counter
                  </span>
                </div>

                <div className="px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                    Input
                  </p>
                  <p className="mt-1.5 rounded-lg border border-line bg-sunken px-3 py-2.5 font-mono text-[12px] leading-relaxed text-fg-muted">
                    {SAMPLE}
                  </p>

                  <dl className="mt-3 grid grid-cols-3 gap-2">
                    {[
                      { label: "Words", value: "7" },
                      { label: "Characters", value: "45" },
                      { label: "Read time", value: "2s" },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-lg border border-line bg-sunken px-2.5 py-2"
                      >
                        <dt className="text-[10px] uppercase tracking-wider text-fg-subtle">
                          {stat.label}
                        </dt>
                        <dd className="mt-0.5 font-mono text-lg tabular-nums leading-none text-fg">
                          {stat.value}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <p className="mt-3 flex items-center gap-2 rounded-lg border border-brand-line bg-brand-soft px-3 py-2 text-[12px] font-medium text-brand-text">
                    <ShieldIcon size={14} className="shrink-0" />0 bytes
                    uploaded · processed on this device
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── At a glance ──────────────────────────────────────── */}
          <dl className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:mt-16 sm:grid-cols-4">
            <Stat label="Tools live" value={String(count)} />
            <Stat label="Divisions" value={String(categories.length)} />
            <Stat label="Run offline" value={`${offlineShare}%`} />
            <Stat label="Sign-ups needed" value="0" />
          </dl>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        {/* ── Promises ─────────────────────────────────────────── */}
        <ul className="grid gap-4 sm:grid-cols-3">
          {site.promises.map((promise, i) => (
            <Card
              as="li"
              key={promise.title}
              className="px-5 py-5 transition-colors hover:border-brand-line"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand-line bg-brand-soft text-brand">
                {PROMISE_ICONS[i]}
              </span>
              <h2 className="mt-3.5 text-[15px] font-semibold text-fg">
                {promise.title}
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">
                {promise.body}
              </p>
            </Card>
          ))}
        </ul>

        {/* ── Divisions ────────────────────────────────────────── */}
        <section className="mt-16">
          <SectionHead
            eyebrow="Categories"
            title="Browse by division"
            action={
              <Link
                href="/all-tools"
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-brand-text"
              >
                All tools
                <ArrowRightIcon
                  size={15}
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </Link>
            }
          />

          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/${category.slug}`}
                  className="group flex h-full flex-col rounded-xl border border-line bg-panel px-4 py-4
                             transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-line
                             hover:shadow-pop"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line
                                 bg-sunken text-fg-muted transition-colors
                                 group-hover:border-brand-line group-hover:bg-brand-soft group-hover:text-brand"
                    >
                      <CategoryIcon path={category.icon} size={18} />
                    </span>
                    <h3 className="text-sm font-semibold text-fg">
                      {category.name}
                    </h3>
                    <span className="ml-auto shrink-0 rounded-full bg-sunken px-2 py-0.5 font-mono text-[11px] text-fg-subtle">
                      {countInCategory(category.slug)}
                    </span>
                  </div>
                  <p className="mt-2.5 text-[13px] leading-relaxed text-fg-muted">
                    {category.tagline}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Most used ────────────────────────────────────────── */}
        <section className="mt-16">
          <SectionHead
            eyebrow="Most used"
            title="Start here"
            subtitle="The tools people reach for most often."
          />
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((tool) => (
              <li key={`${tool.category}/${tool.slug}`}>
                <ToolCard tool={tool} showCategory />
              </li>
            ))}
          </ul>
        </section>

        {/* ── Recently added ───────────────────────────────────── */}
        <section className="mt-16">
          <SectionHead eyebrow="New" title="Recently added" />
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map((tool) => (
              <li key={`${tool.category}/${tool.slug}`}>
                <ToolCard tool={tool} showCategory />
              </li>
            ))}
          </ul>
        </section>

        {/* ── The privacy argument, stated plainly ─────────────── */}
        <section className="relative mt-16 overflow-hidden rounded-2xl border border-line bg-sunken px-6 py-8 sm:px-10 sm:py-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand to-transparent opacity-60"
          />
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-4">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand-line bg-brand-soft text-brand">
                <ShieldIcon size={19} />
              </span>
              <h2 className="mt-4 text-xl font-semibold tracking-tight text-fg sm:text-2xl">
                Why “runs in your browser” is not marketing
              </h2>
              <Link
                href="/privacy"
                className="group mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-text"
              >
                Read the privacy policy
                <ChevronRightIcon
                  size={15}
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </Link>
            </div>

            <div className="prose-bay max-w-3xl lg:col-span-8">
              <p>
                Most online tools work by uploading your file to a server,
                processing it there, and sending the result back. That means a
                copy of your document existed on someone else’s machine, was
                written to their disk, and passed through their logs.
              </p>
              <p>
                The tools here marked <strong>Offline</strong> do the work in
                your own browser using WebAssembly and the platform’s built-in
                APIs. There is no upload step, because there is nowhere to
                upload to. You can verify it: load a tool page, disconnect from
                the internet, and it keeps working.
              </p>
              <p>
                Some jobs genuinely need a server — large video transcoding, for
                instance. Those tools say so on the page, delete your file
                within two hours, and never log its contents.{" "}
                <Link href="/privacy">The privacy policy</Link> states exactly
                which is which.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

/* ── Local presentation helpers ──────────────────────────────────── */

/** One cell of the hero's at-a-glance bar. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panel px-4 py-4 sm:px-5">
      <dt className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
        {label}
      </dt>
      <dd className="mt-1 font-mono text-2xl tabular-nums leading-none text-fg">
        {value}
      </dd>
    </div>
  );
}

/**
 * Section heading. The eyebrow gives each block a visual anchor without
 * adding a colour — the rule and the small caps do the work.
 */
function SectionHead({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div>
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-text">
          <span aria-hidden="true" className="h-px w-6 bg-brand-line" />
          {eyebrow}
        </p>
        <h2 className="mt-2.5 text-xl font-semibold tracking-tight text-fg sm:text-2xl">
          {title}
        </h2>
        {subtitle && <p className="mt-1.5 text-sm text-fg-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
