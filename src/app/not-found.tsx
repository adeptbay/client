import Link from 'next/link';
import { activeCategories, topTools } from '@core/registry';
import { CategoryIcon, SearchIcon } from '@ui/Icons';
import { ToolCard } from '@ui/ToolSections';

/**
 * 404 — Appendix A step 03 item 17: "helpful, with search".
 *
 * A dead end on a site with a thousand entry points is a wasted arrival.
 * Most people who land here followed a stale link from somewhere else,
 * so this page's job is to get them to the tool they wanted rather than
 * to apologise.
 */
export default function NotFound() {
  const categories = activeCategories();

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
      <p className="font-mono text-sm text-fg-subtle">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
        That page does not exist
      </h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-fg-muted">
        Either the link was wrong, or the tool moved. Tool URLs on this site are permanent, so a
        broken one usually means it was mistyped — or that it has not been built yet.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <p className="inline-flex items-center gap-2 rounded-lg border border-line bg-panel px-3.5 py-2 text-sm text-fg-muted">
          <SearchIcon size={16} className="text-fg-subtle" />
          Press
          <kbd className="rounded border border-line bg-sunken px-1.5 py-0.5 font-mono text-[11px]">
            ⌘K
          </kbd>
          to search every tool
        </p>
        <Link
          href="/all-tools"
          className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-medium text-fg-onbrand
                     transition-colors hover:bg-brand-hover"
        >
          Browse all tools
        </Link>
      </div>

      <section className="mt-12">
        <h2 className="text-sm font-semibold text-fg">Divisions</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/${category.slug}`}
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-1.5
                           text-[13px] text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
              >
                <CategoryIcon path={category.icon} size={15} className="text-fg-subtle" />
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-fg">Most used tools</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {topTools(4).map((tool) => (
            <li key={`${tool.category}/${tool.slug}`}>
              <ToolCard tool={tool} showCategory />
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-12 text-[13px] text-fg-subtle">
        Landed here from a link on another site?{' '}
        <Link href="/contact" className="text-brand-text hover:underline">
          Tell us where it was
        </Link>{' '}
        and we will add a redirect.
      </p>
    </div>
  );
}
