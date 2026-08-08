import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCategory } from '@core/categories';
import { getTool, liveTools } from '@core/registry';
import { relatedTools } from '@core/related';
import { guideMetadata } from '@core/seo';
import { articleSchema, breadcrumbSchema, jsonLd } from '@core/schema';
import { scoreTotal } from '@core/tool';
import { Breadcrumb, RelatedTools } from '@ui/ToolSections';
import { ArrowRightIcon } from '@ui/Icons';

/**
 * Supporting article — Part 5.3, "eight to fifteen articles per
 * category, each attached to a main tool", and Part 5.5, which puts the
 * article under the tool at /{category}/{slug}/guide rather than in a
 * separate blog silo.
 *
 * The structure below follows the Appendix D.4 article template:
 * TL;DR box (the part an AI lifts), why it matters, our method, the
 * honest alternative, a comparison table, common problems, and a
 * verification date.
 *
 * ── STATUS ──────────────────────────────────────────────────────────
 * This route is live and correct, but the prose is generated from the
 * tool's own metadata. That is deliberate for launch: a template that
 * says true things beats fourteen hand-written articles that do not
 * exist yet. Part 5.6 is explicit that programmatic pages are fine when
 * each carries real, page-specific information and are a policy problem
 * when they are the same words with the nouns swapped.
 *
 * The 90-day plan (Appendix C, days 57–77) allocates three hand-written
 * guides per week. As each is written it replaces this template for
 * that tool. Until then every guide here is anchored to that tool's own
 * benchmarks, limits and failure modes, so no two are interchangeable.
 * ────────────────────────────────────────────────────────────────────
 */

export const revalidate = 86_400;

export function generateStaticParams() {
  return liveTools()
    .sort((a, b) => scoreTotal(b.score) - scoreTotal(a.score))
    .slice(0, 100)
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
  return guideMetadata(tool);
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category: categorySlug, slug } = await params;

  const tool = getTool(categorySlug, slug);
  const category = getCategory(categorySlug);
  if (!tool || !category) notFound();

  const toolHref = `/${tool.category}/${tool.slug}`;
  // "How to use the X", not "How to X" — tool names are nouns.
  const headline = `How to use the ${tool.name}`;

  return (
    <article className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd([
            articleSchema({
              headline,
              description: tool.description,
              path: `${toolHref}/guide`,
              published: tool.added,
              modified: tool.updated,
            }),
            breadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: category.name, path: `/${category.slug}` },
              { name: tool.name, path: toolHref },
              { name: 'Guide', path: `${toolHref}/guide` },
            ]),
          ]),
        }}
      />

      <Breadcrumb
        items={[
          { name: 'Home', href: '/' },
          { name: category.name, href: `/${category.slug}` },
          { name: tool.name, href: toolHref },
          { name: 'Guide' },
        ]}
      />

      <header className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">{headline}</h1>
        <p className="mt-2 text-sm text-fg-subtle">
          Last verified {tool.updated} · about {Math.max(2, tool.faq.length)} minutes to read
        </p>
      </header>

      {/* TL;DR — Appendix D.4. This is the block a retrieval engine
          lifts, so it has to be complete on its own. */}
      <div className="mt-6 rounded-xl border border-brand-line bg-brand-soft px-5 py-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-brand-text">
          The short version
        </h2>
        <ul className="mt-2 space-y-1.5">
          {tool.howTo.slice(0, 3).map((step, i) => (
            <li key={step.title} className="flex gap-2 text-[13px] leading-relaxed text-fg-muted">
              <span className="font-mono text-brand-text">{i + 1}.</span>
              <span>
                <strong className="font-medium text-fg">{step.title}.</strong> {step.detail}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="prose-bay mt-8">
        <h2>Why this is worth getting right</h2>
        <p>{tool.infoGain.summary}</p>

        <h2>Method 1 — use the {tool.name} on this site</h2>
        <p>
          The fastest route.{' '}
          {tool.runtime === 'client'
            ? 'It runs entirely in your browser, so nothing is uploaded and there is no queue to wait in.'
            : 'It runs on our servers, and your file is deleted automatically within two hours.'}{' '}
          No account is needed and there is no daily limit.
        </p>
        <ol>
          {tool.howTo.map((step) => (
            <li key={step.title}>
              <strong>{step.title}.</strong> {step.detail}
            </li>
          ))}
        </ol>
        <p>
          <Link href={toolHref}>Open the {tool.name} →</Link>
        </p>

        <h2>Method 2 — do it without this site</h2>

        <p>
          Worth knowing, because a tool you cannot replace is a dependency rather than a convenience.
          Most tasks in the {category.name.toLowerCase()} division have a command-line or built-in
          equivalent; it is usually more setup and less convenient, but it works offline and it is
          scriptable, which matters once you are doing something a hundred times instead of once.
        </p>

        {tool.infoGain.limits && tool.infoGain.limits.length > 0 && (
          <>
            <h2>What this tool will not do</h2>
            <p>
              Every tool has an edge. These are ours for {tool.name.toLowerCase()}, stated up front
              so you find out here rather than halfway through a deadline:
            </p>
            <ul>
              {tool.infoGain.limits.map((limit) => (
                <li key={limit}>{limit}</li>
              ))}
            </ul>
          </>
        )}

        {tool.infoGain.errors && tool.infoGain.errors.length > 0 && (
          <>
            <h2>Common problems and how to fix them</h2>
            <dl>
              {tool.infoGain.errors.map((error) => (
                <div key={error.cause}>
                  <dt>
                    <strong>{error.cause}</strong>
                  </dt>
                  <dd>{error.fix}</dd>
                </div>
              ))}
            </dl>
          </>
        )}

        <h2>Questions people ask</h2>
        {tool.faq.map((item) => (
          <div key={item.q}>
            <h3>{item.q}</h3>
            <p>{item.a}</p>
          </div>
        ))}
      </div>

      <Link
        href={toolHref}
        className="mt-10 flex items-center justify-between gap-4 rounded-xl border border-brand-line
                   bg-brand-soft px-5 py-4 transition-colors hover:border-brand"
      >
        <span>
          <span className="block text-sm font-semibold text-fg">Open the {tool.name}</span>
          <span className="mt-0.5 block text-[13px] text-fg-muted">{tool.tagline}</span>
        </span>
        <ArrowRightIcon size={20} className="shrink-0 text-brand" />
      </Link>

      <div className="mt-10">
        <RelatedTools tools={relatedTools(tool, 6)} />
      </div>
    </article>
  );
}
