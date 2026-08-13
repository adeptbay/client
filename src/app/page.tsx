import Link from "next/link";
import type { Metadata } from "next";
import {
  activeCategories,
  countInCategory,
  recentTools,
  topTools,
  totalLive,
} from "@core/registry";
import { site } from "@core/site";
import { pageMetadata } from "@core/seo";
import { Badge, Card } from "@ui/primitives";
import { ToolCard } from "@ui/ToolSections";
import { ArrowRightIcon, BoltIcon, CategoryIcon, ShieldIcon } from "@ui/Icons";

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
  <ShieldIcon key="s" size={18} />,
  <BoltIcon key="b" size={18} />,
  <ArrowRightIcon key="a" size={18} />,
];

export default function HomePage() {
  const categories = activeCategories();
  const featured = topTools(8);
  const recent = recentTools(4);
  const count = totalLive();

  return (
    <>
      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="border-b border-line bg-linear-to-b from-brand-soft/60 to-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <Badge tone="brand">{count} tools live · more every week</Badge>

          <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-fg sm:text-5xl">
            Every tool you need, in one bay.
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">
            Fast, free utilities for developers, students and businesses. Most
            of them run entirely in your browser — so your files are never
            uploaded, and there is no sign-up, no quota and no watermark.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/all-tools"
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-brand px-6 text-[15px] font-medium
                         text-fg-onbrand shadow-panel transition-colors hover:bg-brand-hover"
            >
              Browse all tools
              <ArrowRightIcon size={17} />
            </Link>
            <Link
              href="/methodology"
              className="inline-flex h-12 items-center rounded-lg border border-line bg-panel px-6 text-[15px]
                         font-medium text-fg transition-colors hover:border-line-strong hover:bg-sunken"
            >
              How we build these
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        {/* ── Promises ─────────────────────────────────────────── */}
        <ul className="grid gap-4 sm:grid-cols-3">
          {site.promises.map((promise, i) => (
            <Card as="li" key={promise.title} className="px-5 py-4">
              <span className="text-brand">{PROMISE_ICONS[i]}</span>
              <h2 className="mt-2.5 text-sm font-semibold text-fg">
                {promise.title}
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
                {promise.body}
              </p>
            </Card>
          ))}
        </ul>

        {/* ── Divisions ────────────────────────────────────────── */}
        <section className="mt-16">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-semibold tracking-tight text-fg">
              Browse by division
            </h2>
            <Link
              href="/all-tools"
              className="text-sm font-medium text-brand-text hover:underline"
            >
              All tools →
            </Link>
          </div>

          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/${category.slug}`}
                  className="flex h-full flex-col rounded-xl border border-line bg-panel px-4 py-4
                             transition-all hover:border-brand-line hover:bg-brand-soft"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-brand">
                      <CategoryIcon path={category.icon} size={19} />
                    </span>
                    <h3 className="text-sm font-semibold text-fg">
                      {category.name}
                    </h3>
                    <span className="ml-auto font-mono text-[11px] text-fg-subtle">
                      {countInCategory(category.slug)}
                    </span>
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">
                    {category.tagline}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Most used ────────────────────────────────────────── */}
        <section className="mt-16">
          <h2 className="text-xl font-semibold tracking-tight text-fg">
            Start here
          </h2>
          <p className="mt-1 text-sm text-fg-muted">
            The tools people reach for most often.
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((tool) => (
              <li key={`${tool.category}/${tool.slug}`}>
                <ToolCard tool={tool} showCategory />
              </li>
            ))}
          </ul>
        </section>

        {/* ── Recently added ───────────────────────────────────── */}
        <section className="mt-16">
          <h2 className="text-xl font-semibold tracking-tight text-fg">
            Recently added
          </h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map((tool) => (
              <li key={`${tool.category}/${tool.slug}`}>
                <ToolCard tool={tool} showCategory />
              </li>
            ))}
          </ul>
        </section>

        {/* ── The privacy argument, stated plainly ─────────────── */}
        <section className="mt-16 rounded-2xl border border-line bg-sunken px-6 py-8 sm:px-10 sm:py-10">
          <h2 className="text-xl font-semibold tracking-tight text-fg">
            Why “runs in your browser” is not marketing
          </h2>
          <div className="prose-bay mt-4 max-w-3xl">
            <p>
              Most online tools work by uploading your file to a server,
              processing it there, and sending the result back. That means a
              copy of your document existed on someone else’s machine, was
              written to their disk, and passed through their logs.
            </p>
            <p>
              The tools here marked <strong>Offline</strong> do the work in your
              own browser using WebAssembly and the platform’s built-in APIs.
              There is no upload step, because there is nowhere to upload to.
              You can verify it: load a tool page, disconnect from the internet,
              and it keeps working.
            </p>
            <p>
              Some jobs genuinely need a server — large video transcoding, for
              instance. Those tools say so on the page, delete your file within
              two hours, and never log its contents.{" "}
              <Link href="/privacy">The privacy policy</Link> states exactly
              which is which.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
