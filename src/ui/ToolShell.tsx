import Link from 'next/link';
import type { Category } from '@core/categories';
import type { AnyTool } from '@core/registry';
import { flags } from '@core/flags';
import { guidePath, toMeta } from '@core/tool';
import { AdSlot } from './AdSlot';
import { Badge } from './primitives';
import { ToolRunner } from './ToolRunner';
import {
  Breadcrumb,
  FaqSection,
  FeatureList,
  HowToSection,
  InfoGainBlock,
  NextStepStrip,
  RelatedTools,
} from './ToolSections';
import { ArrowRightIcon, ShieldIcon } from './Icons';

/**
 * ToolShell — the eleven-section anatomy from Part 5.4, in order.
 *
 *    1  H1, exact target keyword
 *    2  one-line sub-heading: value + differentiator
 *    3  ★ the tool itself, above the fold, no intro paragraph
 *    4  output + copy / download / share      (inside ToolRunner)
 *    5  "next step" — three related tools
 *    6  how to use, 3–5 steps
 *    7  features — why this one is different
 *    8  technical notes — ★ information gain ★
 *    9  FAQ, 5–8 questions
 *   10  related tools, 6–10 from the same cluster
 *   11  breadcrumb + SoftwareApplication schema
 *
 * Every tool page on the platform renders through this component. When
 * the anatomy improves, 1000 pages improve at once.
 */
export function ToolShell({
  tool,
  category,
  nextSteps,
  related,
  crossCategory,
}: {
  tool: AnyTool;
  category: Category;
  nextSteps: AnyTool[];
  related: AnyTool[];
  crossCategory: AnyTool[];
}) {
  return (
    <article className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      {/* 11 · Breadcrumb (rendered first, listed last in the anatomy) */}
      <Breadcrumb
        items={[
          { name: 'Home', href: '/' },
          { name: category.name, href: `/${category.slug}` },
          { name: tool.name },
        ]}
      />

      <header className="mt-4">
        {/* 1 · H1 — close to the <title> but never identical */}
        <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-[28px]">{tool.name}</h1>

        {/* 2 · Value proposition + differentiator, one line */}
        <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">{tool.tagline}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {tool.runtime === 'client' && (
            <Badge tone="brand">
              <ShieldIcon size={12} className="mr-1" />
              Runs in your browser
            </Badge>
          )}
          <Badge>No sign-up</Badge>
          <Badge>No file limit</Badge>
          {/* `apiEnabled` says the tool is *eligible* for the public API.
              The API itself ships behind a flag (Part 10), so until that
              flag is on this badge would advertise an endpoint that 404s
              on 20 of the 22 live pages. Both conditions, or no badge. */}
          {flags.api && tool.apiEnabled && <Badge>API available</Badge>}
        </div>
      </header>

      {/* 3 + 4 · The tool, immediately usable. No ad above this point. */}
      <div className="mt-6">
        <ToolRunner tool={toMeta(tool)} />
      </div>

      {/* 5 · Next step */}
      <div className="mt-5">
        <NextStepStrip tools={nextSteps} />
      </div>

      <AdSlot placement="in-content" className="mt-8" />

      <div className="mt-10 space-y-10">
        {/* 6 · How to use */}
        <HowToSection tool={toMeta(tool)} />

        {/* 7 · Features */}
        <FeatureList tool={toMeta(tool)} />

        {/* 8 · Information gain — the block that makes this page worth having */}
        <InfoGainBlock tool={toMeta(tool)} />

        {/* 9 · FAQ */}
        <FaqSection tool={toMeta(tool)} />

        {/* Supporting article — Part 5.5, the article sits under the tool */}
        <Link
          href={guidePath(tool)}
          className="flex items-center justify-between gap-4 rounded-xl border border-line bg-panel px-4 py-3.5
                     transition-colors hover:border-line-strong hover:bg-sunken"
        >
          <span>
            <span className="block text-sm font-medium text-fg">
              Guide: how to use the {tool.name}, step by step
            </span>
            <span className="mt-0.5 block text-[13px] text-fg-muted">
              The longer version — alternatives, trade-offs, and the mistakes that waste the most time.
            </span>
          </span>
          <ArrowRightIcon size={18} className="shrink-0 text-brand" />
        </Link>

        {/* 10 · Related tools */}
        <RelatedTools tools={related} />

        {crossCategory.length > 0 && (
          <RelatedTools tools={crossCategory} title="People also use" />
        )}
      </div>

      <AdSlot placement="below-content" className="mt-10" />

      {/* No byline date here — deliberately.

          A tool page is evergreen and transactional: someone searching
          "word counter" wants a working word counter, not its release
          history. A visible "last updated 2026-08-09" adds nothing on
          the day it ships and decays into a reason not to click while
          the tool itself remains correct and unchanged. Google treats
          freshness as query-dependent and shows byline dates mostly on
          newsy queries; its own guidance also asks that a page not
          carry competing date signals, and this line duplicated the
          "last verified" date under the technical notes.

          What survives is the date that earns its place: this site
          dates its *claims*, not its pages. The verification date on
          the InfoGain block scopes the benchmarks, which is the part a
          reader — or a retrieval engine — has reason to check. The
          machine-readable dates stay in the SoftwareApplication schema
          and the sitemap, so Google and AI retrieval keep the full
          signal at no cost in the SERP. */}
      <footer className="mt-10 border-t border-line pt-5 text-xs text-fg-subtle">
        <p>
          <Link href={`/${category.slug}`} className="text-brand-text hover:underline">
            more {category.name.toLowerCase()} tools
          </Link>
        </p>
      </footer>
    </article>
  );
}
