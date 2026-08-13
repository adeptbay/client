'use client';

/**
 * Report surfaces for the CV checker.
 *
 * Presentational only — every one of these takes a finished
 * `ResumeReport` slice and renders it. The rules live in
 * `src/engines/resume`, and nothing in this file decides anything about
 * a CV, which is what keeps the scoring auditable in one place.
 *
 * Colour is used as a signal and never as decoration: red means "this
 * costs you the application", amber means "this costs you the read",
 * neutral means "this is a preference". A report that is red all over
 * teaches a reader to ignore red.
 */

import { useState, type ReactNode } from 'react';
import type {
  CategoryResult,
  Finding,
  KeywordMatch,
  ResumeStats,
  Severity,
} from '@engines/resume/types';
import { CopyButton } from '@ui/Actions';
import { AlertIcon, CheckIcon, ChevronDownIcon, CloseIcon, FileIcon, InfoIcon } from '@ui/Icons';
import { Badge, IconButton, Spinner, cx } from '@ui/primitives';
import { formatBytes } from '@engines/bytes';

/* ═══════════════════════════════════════════════════════════════════
   Intake
   ═══════════════════════════════════════════════════════════════════ */

/** The chosen file, held before the user commits to running the check. */
export function FileChip({ file, onRemove }: { file: File; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-brand-line bg-brand-soft px-3.5 py-3">
      <FileIcon size={18} className="shrink-0 text-brand-text" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-medium text-fg">{file.name}</span>
        <span className="font-mono text-[11px] text-fg-subtle">{formatBytes(file.size)}</span>
      </span>
      <IconButton label="Remove this file" onClick={onRemove} className="h-8 w-8 shrink-0">
        <CloseIcon size={15} />
      </IconButton>
    </div>
  );
}

/**
 * Progress while the deterministic layers run.
 *
 * Steps are real — each one is set as that stage begins — but the whole
 * pass is usually under 150ms, so the caller holds the loader open for a
 * moment. That is not a fake progress bar: the work is genuinely done,
 * and a panel that appears and vanishes within one frame reads as a
 * glitch rather than as a result.
 */
export function StepLoader({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ul className="space-y-2.5 rounded-xl border border-line bg-panel px-4 py-5 sm:px-5">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step} className="flex items-center gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
              {done ? (
                <CheckIcon size={15} className="text-brand-text" />
              ) : active ? (
                <Spinner className="h-4 w-4 text-brand" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-line-strong" />
              )}
            </span>
            <span
              className={cx(
                'text-[13.5px] transition-colors',
                done ? 'text-fg-muted' : active ? 'font-medium text-fg' : 'text-fg-subtle',
              )}
            >
              {step}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Score
   ═══════════════════════════════════════════════════════════════════ */

/** The one place a score maps to a colour. Everything else reads this. */
export function scoreTone(score: number): { css: string; label: string; token: string } {
  if (score >= 80) return { css: 'var(--ok)', label: 'text-ok', token: 'ok' };
  if (score >= 65) return { css: 'var(--brand)', label: 'text-brand-text', token: 'brand' };
  if (score >= 45) return { css: 'var(--warn)', label: 'text-warn', token: 'warn' };
  return { css: 'var(--danger)', label: 'text-danger', token: 'danger' };
}

export function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const tone = scoreTone(score);

  return (
    <div className="relative shrink-0">
      <svg
        viewBox="0 0 128 128"
        className="h-32 w-32 sm:h-36 sm:w-36"
        role="img"
        aria-label={`Score ${score} out of 100, grade ${grade}`}
      >
        <circle cx="64" cy="64" r={radius} fill="none" stroke="var(--line)" strokeWidth="11" />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke={tone.css}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - Math.max(0, Math.min(100, score)) / 100)}
          transform="rotate(-90 64 64)"
          style={{ transition: 'stroke-dashoffset 700ms var(--ease-out-quint), stroke 300ms' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[34px] font-semibold leading-none tabular-nums text-fg sm:text-[38px]">
          {score}
        </span>
        <span className="mt-1 text-[11px] uppercase tracking-wider text-fg-subtle">
          grade {grade}
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Stats
   ═══════════════════════════════════════════════════════════════════ */

export function StatStrip({ stats, coverage }: { stats: ResumeStats; coverage: number | null }) {
  const tiles: { label: string; value: string; hint?: string }[] = [
    { label: 'Pages', value: String(stats.pages) },
    { label: 'Words', value: stats.words.toLocaleString() },
    {
      label: 'Bullets',
      value: String(stats.bullets),
      hint: `${stats.quantifiedBullets} with a number`,
    },
    { label: 'Roles', value: String(stats.roles) },
    { label: 'Skills', value: String(stats.skills) },
    {
      label: 'Scan time',
      value: `${stats.readingSeconds}s`,
      hint: 'a screener gives ~7',
    },
  ];
  if (coverage !== null) {
    tiles.push({ label: 'Advert match', value: `${coverage}%` });
  }

  return (
    <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4 lg:grid-cols-7">
      {tiles.map((tile) => (
        <div key={tile.label} className="bg-panel px-3 py-2.5">
          <div className="font-mono text-lg font-semibold tabular-nums text-fg">{tile.value}</div>
          <div className="mt-0.5 text-[11px] leading-tight text-fg-subtle">{tile.label}</div>
          {tile.hint && <div className="text-[10px] leading-tight text-fg-subtle/80">{tile.hint}</div>}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Categories
   ═══════════════════════════════════════════════════════════════════ */

export function CategoryBars({
  categories,
  active,
  onSelect,
}: {
  categories: CategoryResult[];
  active: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <ul className="space-y-1.5">
      {categories.map((category) => {
        const tone = scoreTone(category.score);
        const isActive = active === category.id;
        const failing = category.checks.filter((c) => c.finding !== null).length;

        return (
          <li key={category.id}>
            <button
              type="button"
              onClick={() => onSelect(isActive ? null : category.id)}
              aria-pressed={isActive}
              className={cx(
                'w-full rounded-lg border px-3 py-2.5 text-left transition-colors',
                isActive
                  ? 'border-brand bg-brand-soft'
                  : 'border-line bg-panel hover:border-line-strong hover:bg-sunken',
              )}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] font-medium text-fg">{category.label}</span>
                <span className="shrink-0 font-mono text-[13px] tabular-nums text-fg-muted">
                  {category.points}
                  <span className="text-fg-subtle">/{category.maxPoints}</span>
                </span>
              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunken">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${category.score}%`,
                    backgroundColor: tone.css,
                    transition: 'width 600ms var(--ease-out-quint)',
                  }}
                />
              </div>

              <p className="mt-1.5 text-[11px] leading-snug text-fg-subtle">
                {failing === 0 ? 'Everything here passes.' : `${failing} to fix · ${category.description}`}
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Findings
   ═══════════════════════════════════════════════════════════════════ */

const SEVERITY: Record<Severity, { label: string; tone: 'danger' | 'warn' | 'neutral'; blurb: string }> = {
  critical: { label: 'Critical', tone: 'danger', blurb: 'stops it before a human reads it' },
  important: { label: 'Important', tone: 'warn', blurb: 'costs you the read' },
  polish: { label: 'Polish', tone: 'neutral', blurb: 'consistency' },
};

function FindingCard({ finding, defaultOpen }: { finding: Finding; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const severity = SEVERITY[finding.severity];

  return (
    <li
      className={cx(
        'overflow-hidden rounded-xl border bg-panel',
        finding.severity === 'critical' ? 'border-danger-line' : 'border-line',
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-3.5 py-3 text-left transition-colors hover:bg-sunken"
      >
        <span className="mt-0.5 shrink-0">
          {finding.severity === 'critical' ? (
            <AlertIcon size={16} className="text-danger" />
          ) : finding.severity === 'important' ? (
            <AlertIcon size={16} className="text-warn" />
          ) : (
            <InfoIcon size={16} className="text-fg-subtle" />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-medium leading-snug text-fg">{finding.title}</span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge tone={severity.tone}>{severity.label}</Badge>
            {finding.pointsLost >= 0.5 && (
              <span className="font-mono text-[11px] text-fg-subtle">
                −{finding.pointsLost} pts
              </span>
            )}
          </span>
        </span>

        <ChevronDownIcon
          size={16}
          className={cx('mt-1 shrink-0 text-fg-subtle transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="border-t border-line px-3.5 py-3">
          {finding.detail && (
            <p className="text-[13px] leading-relaxed text-fg-muted">{finding.detail}</p>
          )}

          {finding.fix && (
            <div className="mt-3 rounded-lg border border-brand-line bg-brand-soft px-3 py-2.5">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-text">
                  What to do
                </span>
                <CopyButton value={finding.fix} label="Copy" />
              </div>
              <p className="text-[13px] leading-relaxed text-fg">{finding.fix}</p>
            </div>
          )}

          {finding.evidence.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
                From your CV
              </p>
              <ul className="space-y-1">
                {finding.evidence.map((line, i) => (
                  <li
                    key={i}
                    className="scroll-slim overflow-x-auto rounded-md border border-line bg-sunken px-2.5 py-1.5 font-mono text-[12px] leading-relaxed text-fg-muted"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export function FindingList({ findings }: { findings: Finding[] }) {
  if (findings.length === 0) {
    return (
      <div className="rounded-xl border border-brand-line bg-brand-soft px-4 py-8 text-center">
        <CheckIcon size={22} className="mx-auto text-brand-text" />
        <p className="mt-2 text-sm font-medium text-fg">Every check here passed.</p>
      </div>
    );
  }

  const groups: Severity[] = ['critical', 'important', 'polish'];

  return (
    <div className="space-y-5">
      {groups.map((severity) => {
        const group = findings.filter((f) => f.severity === severity);
        if (group.length === 0) return null;

        return (
          <section key={severity}>
            <h3 className="mb-2 flex flex-wrap items-baseline gap-x-2 text-[13px] font-semibold text-fg">
              {SEVERITY[severity].label}
              <span className="font-mono text-[11px] font-normal text-fg-subtle">
                {group.length}
              </span>
              <span className="text-[11px] font-normal text-fg-subtle">
                · {SEVERITY[severity].blurb}
              </span>
            </h3>
            <ul className="space-y-2">
              {group.map((finding) => (
                <FindingCard
                  key={finding.id}
                  finding={finding}
                  // Critical items open by default; nobody should have to
                  // click to discover that their CV is unreadable.
                  defaultOpen={severity === 'critical'}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Wins
   ═══════════════════════════════════════════════════════════════════ */

export function WinList({ wins }: { wins: string[] }) {
  if (wins.length === 0) return null;

  return (
    <ul className="grid gap-1.5 sm:grid-cols-2">
      {wins.map((win, i) => (
        <li key={i} className="flex items-start gap-2 rounded-lg border border-line bg-panel px-3 py-2">
          <CheckIcon size={14} className="mt-0.5 shrink-0 text-brand-text" />
          <span className="text-[13px] leading-snug text-fg-muted">{win}</span>
        </li>
      ))}
    </ul>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Keywords
   ═══════════════════════════════════════════════════════════════════ */

export function KeywordGrid({ keywords, coverage }: { keywords: KeywordMatch[]; coverage: number }) {
  const missing = keywords.filter((k) => !k.inResume);
  const matched = keywords.filter((k) => k.inResume);

  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[14px] font-semibold text-fg">Terms the advert repeats</h3>
        <span className="font-mono text-[13px] tabular-nums text-fg-muted">
          {matched.length}/{keywords.length} covered ({coverage}%)
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sunken">
        <div
          className="h-full rounded-full"
          style={{
            width: `${coverage}%`,
            backgroundColor: scoreTone(coverage).css,
            transition: 'width 600ms var(--ease-out-quint)',
          }}
        />
      </div>

      {missing.length > 0 && (
        <>
          <p className="mt-4 text-[12px] font-medium uppercase tracking-wider text-fg-subtle">
            Never mentioned in your CV
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {missing.map((k) => (
              <li key={k.term}>
                <span className="inline-flex items-center gap-1 rounded-full border border-warn-line bg-warn-soft px-2.5 py-1 text-[12px] text-warn">
                  {k.term}
                  <span className="font-mono text-[10px] opacity-70">×{k.adCount}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-[12px] leading-relaxed text-fg-subtle">
            Add only what you genuinely meet, in the advert&rsquo;s spelling, inside the bullet
            that proves it.
          </p>
        </>
      )}

      {matched.length > 0 && (
        <>
          <p className="mt-4 text-[12px] font-medium uppercase tracking-wider text-fg-subtle">
            Already covered
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {matched.map((k) => (
              <li key={k.term}>
                <span className="inline-flex items-center gap-1 rounded-full border border-brand-line bg-brand-soft px-2.5 py-1 text-[12px] text-brand-text">
                  <CheckIcon size={11} />
                  {k.term}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Parser view
   ═══════════════════════════════════════════════════════════════════ */

/**
 * The demonstration the whole tool is built around.
 *
 * On a two-column CV the right-hand pane is visibly scrambled — a skills
 * list spliced line by line into a job description — because that is
 * genuinely what a parser without layout analysis receives. No amount of
 * describing the problem lands the way seeing it does.
 */
export function ParserPreview({
  readable,
  asParsed,
  scrambled,
}: {
  readable: string;
  asParsed: string;
  scrambled: boolean;
}) {
  const [open, setOpen] = useState(scrambled);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-sunken"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-fg">
            {scrambled ? 'What a parser sees — and it is not what you see' : 'What a parser extracts'}
          </span>
          <span className="mt-0.5 block text-[12px] text-fg-muted">
            {scrambled
              ? 'Two columns, so a parser reads straight across the gutter. Compare the panes.'
              : 'If a line is missing here, it is missing for them too.'}
          </span>
        </span>
        <ChevronDownIcon size={16} className={cx('shrink-0 text-fg-subtle transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className={cx('grid gap-px border-t border-line bg-line', scrambled && 'lg:grid-cols-2')}>
          {scrambled && (
            <div className="bg-panel p-3">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
                Your layout
              </p>
              <pre className="scroll-slim max-h-80 overflow-auto whitespace-pre-wrap break-words font-mono text-[11.5px] leading-relaxed text-fg-muted">
                {readable}
              </pre>
            </div>
          )}
          <div className="bg-panel p-3">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
              {scrambled && <AlertIcon size={12} className="text-danger" />}
              {scrambled ? 'What the parser gets' : 'Extracted text'}
            </p>
            <pre
              className={cx(
                'scroll-slim max-h-80 overflow-auto whitespace-pre-wrap break-words font-mono text-[11.5px] leading-relaxed',
                scrambled ? 'text-danger' : 'text-fg-muted',
              )}
            >
              {asParsed}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Shared chrome
   ═══════════════════════════════════════════════════════════════════ */

export function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-fg">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[12.5px] leading-snug text-fg-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
