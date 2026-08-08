import Link from 'next/link';
import type { Metadata } from 'next';
import { pageMetadata } from '@core/seo';
import { site } from '@core/site';
import { CHANGE_LABELS, changelog, type ChangeKind } from '@/content/changelog';
import { PageShell } from '@ui/PageShell';
import { Badge } from '@ui/primitives';

export const metadata: Metadata = pageMetadata({
  title: `Changelog — every change to ${site.name}`,
  description: `A dated record of every tool added, every fix shipped and every policy change on ${site.name}.`,
  path: '/changelog',
  ogTitle: 'Changelog',
  ogKicker: 'WHAT CHANGED',
});

const TONE: Record<ChangeKind, 'brand' | 'warn' | 'danger' | 'neutral'> = {
  added: 'brand',
  improved: 'neutral',
  fixed: 'warn',
  changed: 'neutral',
};

export default function ChangelogPage() {
  // Group by date so a release reads as one event, not five.
  const byDate = new Map<string, typeof changelog>();
  for (const entry of changelog) {
    const list = byDate.get(entry.date) ?? [];
    list.push(entry);
    byDate.set(entry.date, list);
  }

  const dates = [...byDate.keys()].sort((a, b) => b.localeCompare(a));

  return (
    <PageShell
      title="Changelog"
      lead="Everything that changed, with dates. Correctness fixes are always listed, including what was wrong and for how long."
      updated={dates[0]}
    >
      <div className="not-prose space-y-8">
        {dates.map((date) => (
          <section key={date}>
            <h2 className="font-mono text-[13px] font-semibold uppercase tracking-wider text-fg-subtle">
              {new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'UTC',
              })}
            </h2>

            <ul className="mt-3 space-y-3">
              {byDate.get(date)!.map((entry) => (
                <li key={entry.title} className="rounded-xl border border-line bg-panel px-4 py-3.5">
                  <div className="flex flex-wrap items-baseline gap-2.5">
                    <Badge tone={TONE[entry.kind]}>{CHANGE_LABELS[entry.kind]}</Badge>
                    <h3 className="text-sm font-medium text-fg">{entry.title}</h3>
                  </div>
                  {entry.detail && (
                    <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">{entry.detail}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <h2>Found something wrong?</h2>
      <p>
        A tool giving a wrong answer is the most serious bug this site can have. Report it to{' '}
        <a href={`mailto:${site.contact.support}`}>{site.contact.support}</a> with the input you
        used, and it will appear here with the fix. See{' '}
        <Link href="/methodology">the methodology page</Link> for how corrections are handled.
      </p>
    </PageShell>
  );
}
