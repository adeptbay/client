import Link from 'next/link';
import type { AnyTool } from '@core/registry';
import type { ToolMeta } from '@core/tool';
import { scoreTotal } from '@core/tool';
import { Badge, Card, Section, cx } from './primitives';
import { ArrowRightIcon, BoltIcon, ChevronRightIcon, ShieldIcon } from './Icons';

/**
 * The server-rendered sections of a tool page.
 *
 * Every one of these is plain HTML in the initial response — no
 * client JavaScript. Part 5.9: "the tool's main content (H1,
 * description, FAQ) must be in the HTML, not only in JS", or an AI
 * crawler that does not execute scripts sees an empty page.
 */

/* ── 11 · Breadcrumb ───────────────────────────────────────────── */

export function Breadcrumb({ items }: { items: { name: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-[13px] text-fg-subtle">
        {items.map((item, i) => (
          <li key={item.name} className="flex items-center gap-1">
            {i > 0 && <ChevronRightIcon size={13} className="text-fg-subtle/60" />}
            {item.href ? (
              <Link href={item.href} className="transition-colors hover:text-brand-text">
                {item.name}
              </Link>
            ) : (
              <span className="text-fg-muted" aria-current="page">
                {item.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ── 6 · How to use ────────────────────────────────────────────── */

export function HowToSection({ tool }: { tool: ToolMeta }) {
  return (
    <Section id="how-to" title={`How to use ${tool.name}`}>
      <ol className="space-y-3">
        {tool.howTo.map((step, i) => (
          <li key={step.title} id={`step-${i + 1}`} className="flex gap-3.5 scroll-mt-20">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full
                         bg-brand-soft font-mono text-xs font-semibold text-brand-text"
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-fg">{step.title}</h3>
              <p className="mt-0.5 text-[13px] leading-relaxed text-fg-muted">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/* ── 7 · Features ──────────────────────────────────────────────── */

export function FeatureList({ tool }: { tool: ToolMeta }) {
  const features = [
    {
      icon: <ShieldIcon size={17} />,
      title: tool.runtime === 'client' ? 'Runs on your device' : 'Processed and deleted within the hour',
      body:
        tool.runtime === 'client'
          ? 'Your input is handled entirely in this browser tab. Nothing is uploaded, so there is nothing for us to store, log or leak.'
          : 'This tool needs a server. Your file is deleted automatically within two hours and its contents are never logged.',
    },
    {
      icon: <BoltIcon size={17} />,
      title: 'No sign-up, no quota',
      body: 'No account, no daily limit, no watermark and no email wall. Use it once or two hundred times a day.',
    },
    {
      icon: <ArrowRightIcon size={17} />,
      title: 'Built to be linked',
      body: 'Options are stored in the URL, so a configured tool is a link you can send to a colleague or bookmark.',
    },
  ];

  return (
    <Section id="features" title={`Why use this ${tool.name.toLowerCase()}`}>
      <ul className="grid gap-3 sm:grid-cols-3">
        {features.map((f) => (
          <Card as="li" key={f.title} className="px-4 py-3.5">
            <span className="text-brand">{f.icon}</span>
            <h3 className="mt-2 text-sm font-medium text-fg">{f.title}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{f.body}</p>
          </Card>
        ))}
      </ul>
    </Section>
  );
}

/* ── 8 · Information gain ──────────────────────────────────────────
   The most important block on the page (Part 5.4). It is what makes
   this page different from a competitor's, what keeps it clear of
   Google's scaled-content policy, and what gives an LLM a specific,
   dated, verifiable fact to cite.                                   */

export function InfoGainBlock({ tool }: { tool: ToolMeta }) {
  const g = tool.infoGain;

  return (
    <Section id="technical-notes" title="Technical notes">
      <div className="space-y-5 rounded-xl border border-line bg-panel px-5 py-5">
        <p className="text-[13px] leading-relaxed text-fg-muted">{g.summary}</p>

        {g.benchmarks && g.benchmarks.length > 0 && (
          <div>
            <h3 className="text-[13px] font-semibold text-fg">Measured on our own test set</h3>
            <dl className="mt-2 grid gap-2 sm:grid-cols-2">
              {g.benchmarks.map((b) => (
                <div key={b.label} className="rounded-lg bg-sunken px-3 py-2">
                  <dt className="text-xs text-fg-subtle">{b.label}</dt>
                  <dd className="font-mono text-sm tabular-nums text-fg">{b.value}</dd>
                  {b.note && <p className="mt-0.5 text-xs text-fg-subtle">{b.note}</p>}
                </div>
              ))}
            </dl>
          </div>
        )}

        {g.table && (
          <div>
            {g.table.caption && <h3 className="text-[13px] font-semibold text-fg">{g.table.caption}</h3>}
            <div className="scroll-slim mt-2 overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    {g.table.head.map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="border border-line bg-sunken px-3 py-2 text-left font-semibold text-fg"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {g.table.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j} className="border border-line px-3 py-2 text-fg-muted">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          {g.supports && g.supports.length > 0 && (
            <div>
              <h3 className="text-[13px] font-semibold text-fg">Supported</h3>
              <ul className="mt-2 space-y-1.5">
                {g.supports.map((s) => (
                  <li key={s} className="flex gap-2 text-[13px] leading-relaxed text-fg-muted">
                    <span aria-hidden="true" className="text-ok">
                      ✓
                    </span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {g.limits && g.limits.length > 0 && (
            <div>
              <h3 className="text-[13px] font-semibold text-fg">Limits and trade-offs</h3>
              <ul className="mt-2 space-y-1.5">
                {g.limits.map((l) => (
                  <li key={l} className="flex gap-2 text-[13px] leading-relaxed text-fg-muted">
                    <span aria-hidden="true" className="text-warn">
                      !
                    </span>
                    {l}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {g.errors && g.errors.length > 0 && (
          <div>
            <h3 className="text-[13px] font-semibold text-fg">If something goes wrong</h3>
            <dl className="mt-2 space-y-2">
              {g.errors.map((e) => (
                <div key={e.cause} className="rounded-lg border border-line px-3 py-2">
                  <dt className="text-[13px] font-medium text-fg">{e.cause}</dt>
                  <dd className="mt-0.5 text-[13px] leading-relaxed text-fg-muted">{e.fix}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {g.verified && (
          // Part 5.10 tactic 5: an explicit date is one of the strongest
          // signals a retrieval engine uses when choosing what to cite.
          <p className="border-t border-line pt-3 text-xs text-fg-subtle">
            Last verified {formatMonth(g.verified)} · benchmarks re-run each quarter.
          </p>
        )}
      </div>
    </Section>
  );
}

function formatMonth(iso: string): string {
  const [year, month] = iso.split('-');
  const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const index = Number(month) - 1;
  return names[index] ? `${names[index]} ${year}` : iso;
}

/* ── 9 · FAQ ───────────────────────────────────────────────────────
   Native <details>. An accordion built in React would cost client
   JavaScript on every page and hide the answers from a crawler that
   does not run scripts — the exact audience this section is for.    */

export function FaqSection({ tool }: { tool: ToolMeta }) {
  return (
    <Section id="faq" title="Frequently asked questions">
      <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-panel">
        {tool.faq.map((item) => (
          <details key={item.q} className="group">
            <summary
              className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5
                         text-sm font-medium text-fg transition-colors hover:bg-sunken"
            >
              {/* The question is an h3 so the page outline is navigable. */}
              <h3 className="text-sm font-medium">{item.q}</h3>
              <ChevronRightIcon
                size={16}
                className="shrink-0 text-fg-subtle transition-transform group-open:rotate-90"
              />
            </summary>
            <p className="px-4 pb-4 text-[13px] leading-relaxed text-fg-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

/* ── 5 · Next step ─────────────────────────────────────────────────
   Part 4.6 — the most undervalued tactic in the book. Suggesting the
   obvious follow-up moves pages/session from ~1.3 to ~2.8.          */

export function NextStepStrip({ tools }: { tools: AnyTool[] }) {
  if (tools.length === 0) return null;

  return (
    <div className="rounded-xl border border-brand-line bg-brand-soft px-4 py-3.5">
      <p className="text-[13px] font-medium text-fg">Next step</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {tools.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/${t.category}/${t.slug}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-line bg-panel
                         px-3 py-1.5 text-[13px] font-medium text-fg transition-colors hover:border-brand"
            >
              {t.name}
              <ArrowRightIcon size={14} className="text-brand" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── 10 · Related tools ────────────────────────────────────────── */

export function RelatedTools({ tools, title = 'Related tools' }: { tools: AnyTool[]; title?: string }) {
  if (tools.length === 0) return null;

  return (
    <Section id="related" title={title}>
      <ul className="grid gap-2 sm:grid-cols-2">
        {tools.map((t) => (
          <li key={`${t.category}/${t.slug}`}>
            <Link
              href={`/${t.category}/${t.slug}`}
              // Anchor text is the tool's real name — Part 5.5.
              className="flex h-full items-start gap-3 rounded-lg border border-line bg-panel px-3.5 py-3
                         transition-colors hover:border-line-strong hover:bg-sunken"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-fg">{t.name}</span>
                <span className="mt-0.5 block text-[13px] leading-snug text-fg-muted">{t.tagline}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ── Tool card — hubs, homepage, /all-tools ────────────────────── */

export function ToolCard({ tool, showCategory = false }: { tool: AnyTool; showCategory?: boolean }) {
  return (
    <Link
      href={`/${tool.category}/${tool.slug}`}
      className="group flex h-full flex-col rounded-xl border border-line bg-panel px-4 py-3.5
                 transition-all hover:border-brand-line hover:bg-brand-soft"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-fg">{tool.name}</h3>
        {tool.runtime === 'client' && (
          <Badge tone="brand" className="shrink-0">
            Offline
          </Badge>
        )}
      </div>
      <p className="mt-1 flex-1 text-[13px] leading-relaxed text-fg-muted">{tool.tagline}</p>
      {showCategory && (
        <span className="mt-2.5 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
          {tool.category}
        </span>
      )}
    </Link>
  );
}

/** Compact row for dense lists. Used by /all-tools. */
export function ToolRow({ tool }: { tool: AnyTool }) {
  return (
    <Link
      href={`/${tool.category}/${tool.slug}`}
      className={cx(
        'flex items-baseline gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-sunken',
      )}
    >
      <span className="text-sm font-medium text-fg">{tool.name}</span>
      <span className="min-w-0 flex-1 truncate text-[13px] text-fg-subtle">{tool.tagline}</span>
      <span className="shrink-0 font-mono text-[11px] text-fg-subtle" title="50-point priority score">
        {scoreTotal(tool.score)}
      </span>
    </Link>
  );
}
