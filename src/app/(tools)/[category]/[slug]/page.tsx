import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCategory } from '@core/categories';
import { getTool, liveTools } from '@core/registry';
import { crossCategoryTools, nextStepTools, relatedTools } from '@core/related';
import { toolMetadata } from '@core/seo';
import { jsonLd, toolPageSchema } from '@core/schema';
import { scoreTotal } from '@core/tool';
import { ToolShell } from '@ui/ToolShell';

/**
 * The tool page. One route renders all 1000.
 *
 * Part 6.6 — build strategy: the top 200 tools by score are generated
 * at build time, the rest on first request and then cached. A thousand
 * pages generated eagerly is an eight to twenty minute build; this
 * keeps it under two while still serving every popular page from the
 * CDN on the first hit.
 */

export const revalidate = 86_400;

export function generateStaticParams() {
  return liveTools()
    .sort((a, b) => scoreTotal(b.score) - scoreTotal(a.score))
    .slice(0, 200)
    .map((tool) => ({ category: tool.category, slug: tool.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { category, slug } = await params;
  const tool = getTool(category, slug);
  if (!tool) return {};
  return toolMetadata(tool);
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category: categorySlug, slug } = await params;

  const tool = getTool(categorySlug, slug);
  const category = getCategory(categorySlug);
  if (!tool || !category) notFound();

  return (
    <>
      {/* Four schema types in one node: SoftwareApplication,
          BreadcrumbList, FAQPage and HowTo. All generated from the
          registry — never hand-written (Part 5.7). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(toolPageSchema(tool, category.name)) }}
      />

      <ToolShell
        tool={tool}
        category={category}
        nextSteps={nextStepTools(tool, 3)}
        related={relatedTools(tool, 8)}
        crossCategory={crossCategoryTools(tool, 4)}
      />
    </>
  );
}
