import Link from 'next/link';
import type { Metadata } from 'next';
import { pageMetadata } from '@core/seo';
import { site } from '@core/site';
import { totalLive } from '@core/registry';
import { STAGE_LABELS, roadmap, roadmapTotals, type StageStatus } from '@/content/roadmap';
import { PageShell } from '@ui/PageShell';
import { Badge } from '@ui/primitives';

export const metadata: Metadata = pageMetadata({
  title: `Roadmap — what ${site.name} is building next`,
  description: `The full fourteen-stage build plan for ${site.name}, with what is done, what is in progress and what is deliberately deferred.`,
  path: '/roadmap',
  ogTitle: 'Roadmap',
  ogKicker: 'PUBLIC PLAN',
});

const TONE: Record<StageStatus, 'brand' | 'warn' | 'neutral'> = {
  done: 'brand',
  'in-progress': 'warn',
  next: 'neutral',
  later: 'neutral',
};

export default function RoadmapPage() {
  const totals = roadmapTotals();

  return (
    <PageShell
      title="Roadmap"
      lead={`The whole plan, in public: fourteen stages, ${totals.items} tracked items, and an honest marker against each one.`}
      updated="2026-08-08"
      wide
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-panel px-4 py-3.5">
          <div className="font-mono text-2xl font-semibold tabular-nums text-fg">{totalLive()}</div>
          <div className="mt-0.5 text-[13px] text-fg-muted">tools live</div>
        </div>
        <div className="rounded-xl border border-line bg-panel px-4 py-3.5">
          <div className="font-mono text-2xl font-semibold tabular-nums text-fg">1,000</div>
          <div className="mt-0.5 text-[13px] text-fg-muted">the target</div>
        </div>
        <div className="rounded-xl border border-line bg-panel px-4 py-3.5">
          <div className="font-mono text-2xl font-semibold tabular-nums text-fg">{totals.percent}%</div>
          <div className="mt-0.5 text-[13px] text-fg-muted">of the build plan complete</div>
        </div>
      </div>

      <h2>Why this is public</h2>
      <p>
        Two reasons. First, it keeps us honest — a plan nobody can see is a plan that quietly gets
        rewritten after the fact. Second, it tells you whether the tool you need is coming, so you do
        not have to guess.
      </p>
      <p>
        The order is deliberate. Everything that costs money to run — servers, storage, model calls —
        is deferred until there are enough visitors to justify it. Everything that compounds —
        tools, internal links, topical depth — comes first.
      </p>

      <h2>The fourteen stages</h2>

      <ol className="not-prose mt-4 space-y-3 list-none pl-0">
        {roadmap.map((stage) => (
          <li key={stage.n} className="rounded-xl border border-line bg-panel px-5 py-4">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-mono text-[13px] text-fg-subtle">{stage.n}</span>
              <h3 className="text-sm font-semibold text-fg">{stage.title}</h3>
              <Badge tone={TONE[stage.status]}>{STAGE_LABELS[stage.status]}</Badge>
              <span className="ml-auto font-mono text-[11px] text-fg-subtle">{stage.items} items</span>
            </div>

            <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">{stage.summary}</p>

            <ul className="mt-2.5 space-y-1">
              {stage.highlights.map((h) => (
                <li key={h} className="flex gap-2 text-[13px] leading-relaxed text-fg-subtle">
                  <span aria-hidden="true">·</span>
                  {h}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <h2>What is deliberately not on this list</h2>
      <p>
        Media downloaders, DRM circumvention, fake document generators, engagement-farming tools,
        contact scrapers, AI-detection tools claiming an accuracy they cannot have, and medical
        dosage calculators. Several of those would bring significant traffic. None of them will be
        built here — <Link href="/about">the reasoning is on the About page</Link>.
      </p>

      <h2>Requesting a tool</h2>
      <p>
        Requests go through the same 50-point score as everything else. Describe the task rather than
        the tool and send it to{' '}
        <a href={`mailto:${site.contact.support}`}>{site.contact.support}</a> — see{' '}
        <Link href="/contact">the contact page</Link> for what makes a request actionable.
      </p>
    </PageShell>
  );
}
