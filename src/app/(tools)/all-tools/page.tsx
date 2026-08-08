import Link from 'next/link';
import type { Metadata } from 'next';
import { activeCategories, liveTools, toolsInCategory, totalLive } from '@core/registry';
import { pageMetadata } from '@core/seo';
import { site } from '@core/site';
import { Badge } from '@ui/primitives';
import { Breadcrumb, ToolRow } from '@ui/ToolSections';
import { CategoryIcon } from '@ui/Icons';

/**
 * The full index. Part 5.5 — "no page more than three clicks from the
 * homepage". This page is what guarantees that as the registry grows:
 * home → all tools → any tool, whatever else changes.
 *
 * Server-rendered as a plain list of links rather than a filtered
 * client grid, because its main job is to be crawlable.
 */

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: `All Tools — every utility on ${site.name}`,
  description: `The complete index of every tool on ${site.name}, grouped by division. Free, no sign-up, and most of them run entirely in your browser.`,
  path: '/all-tools',
  ogTitle: 'All tools',
  ogKicker: 'INDEX',
});

export default function AllToolsPage() {
  const categories = activeCategories();
  const count = totalLive();
  const clientSide = liveTools().filter((t) => t.runtime === 'client').length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <Breadcrumb items={[{ name: 'Home', href: '/' }, { name: 'All tools' }]} />

      <header className="mt-4 max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">All tools</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">
          Every tool on the site, grouped by division. Press{' '}
          <kbd className="rounded border border-line bg-sunken px-1.5 py-0.5 font-mono text-[11px]">
            ⌘K
          </kbd>{' '}
          anywhere to search instead.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone="brand">{count} live</Badge>
          <Badge>{clientSide} run in your browser</Badge>
          <Badge>{categories.length} divisions</Badge>
        </div>
      </header>

      {/* Jump nav — keeps the page usable once it holds a thousand rows. */}
      <nav aria-label="Jump to division" className="mt-8 flex flex-wrap gap-2">
        {categories.map((category) => (
          <a
            key={category.slug}
            href={`#${category.slug}`}
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-1.5
                       text-[13px] text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
          >
            <CategoryIcon path={category.icon} size={15} className="text-fg-subtle" />
            {category.name}
            <span className="font-mono text-[11px] text-fg-subtle">
              {toolsInCategory(category.slug).length}
            </span>
          </a>
        ))}
      </nav>

      <div className="mt-10 space-y-10">
        {categories.map((category) => {
          const tools = toolsInCategory(category.slug);
          return (
            <section key={category.slug} id={category.slug} className="scroll-mt-20">
              <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2">
                <h2 className="text-lg font-semibold tracking-tight text-fg">
                  <Link href={`/${category.slug}`} className="hover:text-brand-text">
                    {category.name}
                  </Link>
                </h2>
                <Link
                  href={`/${category.slug}`}
                  className="shrink-0 text-[13px] font-medium text-brand-text hover:underline"
                >
                  Division hub →
                </Link>
              </div>

              <ul className="mt-2 grid gap-0.5 lg:grid-cols-2">
                {tools.map((tool) => (
                  <li key={tool.slug}>
                    <ToolRow tool={tool} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="mt-14 rounded-xl border border-line bg-sunken px-5 py-4 text-[13px] leading-relaxed text-fg-muted">
        The number beside each tool is its 50-point priority score — search demand, how evergreen it
        is, how weak the current search results are, how it might earn, and how long it took to
        build.{' '}
        <Link href="/methodology" className="text-brand-text hover:underline">
          The methodology page
        </Link>{' '}
        explains how it is calculated and why it is public.
      </p>
    </div>
  );
}
