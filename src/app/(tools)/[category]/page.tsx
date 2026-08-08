import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { categories, getCategory } from '@core/categories';
import { activeCategories, toolsInCategory } from '@core/registry';
import { categoryMetadata } from '@core/seo';
import { breadcrumbSchema, itemListSchema, jsonLd } from '@core/schema';
import { Badge } from '@ui/primitives';
import { AdSlot } from '@ui/AdSlot';
import { Breadcrumb, ToolCard } from '@ui/ToolSections';
import { CategoryIcon } from '@ui/Icons';

/**
 * Category hub.
 *
 * Part 5.5 — the hub is the distribution point for link equity inside a
 * division. Every tool links up to it and it links down to every tool,
 * which is what keeps click depth at three and orphan pages at zero.
 *
 * ISR at one hour (Part 6.6): a new tool appears here within the hour
 * without rebuilding the site.
 */

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return categories.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const category = getCategory(slug);
  if (!category) return {};
  return categoryMetadata(category, toolsInCategory(slug).length);
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  const tools = toolsInCategory(slug);
  const siblings = activeCategories().filter((c) => c.slug !== slug);

  // Group by cluster so the hub reads as a map of the division rather
  // than an undifferentiated wall of links.
  const clusters = new Map<string, typeof tools>();
  for (const tool of tools) {
    const list = clusters.get(tool.cluster) ?? [];
    list.push(tool);
    clusters.set(tool.cluster, list);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd([
            itemListSchema(category, tools),
            breadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: category.name, path: `/${category.slug}` },
            ]),
          ]),
        }}
      />

      <Breadcrumb items={[{ name: 'Home', href: '/' }, { name: category.name }]} />

      <header className="mt-4 max-w-3xl">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <CategoryIcon path={category.icon} size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
              {category.title}
            </h1>
            <p className="mt-0.5 text-sm text-fg-muted">{category.tagline}</p>
          </div>
        </div>

        <p className="mt-5 text-[15px] leading-relaxed text-fg-muted">{category.description}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge tone="brand">{tools.length} live</Badge>
          <Badge>{category.target} planned</Badge>
          <Badge>Tier {category.tier}</Badge>
        </div>
      </header>

      {tools.length === 0 ? (
        <p className="mt-10 rounded-xl border border-line bg-panel px-5 py-8 text-center text-sm text-fg-muted">
          This division is planned but nothing has shipped yet.{' '}
          <Link href="/roadmap" className="text-brand-text hover:underline">
            See what is coming
          </Link>
          .
        </p>
      ) : (
        <div className="mt-10 space-y-10">
          {[...clusters.entries()].map(([cluster, list]) => (
            <section key={cluster}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-subtle">
                {cluster.replace(/-/g, ' ')}
              </h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((tool) => (
                  <li key={tool.slug}>
                    <ToolCard tool={tool} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <AdSlot placement="below-content" className="mt-12" />

      {/* Cross-division links. Part 5.5: a division that only links to
          itself becomes an island, and link equity stops circulating. */}
      <section className="mt-14 border-t border-line pt-8">
        <h2 className="text-sm font-semibold text-fg">Other divisions</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {siblings.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/${c.slug}`}
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-1.5
                           text-[13px] text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
              >
                <CategoryIcon path={c.icon} size={15} className="text-fg-subtle" />
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
