'use client';

/**
 * Layer 3, on the page.
 *
 * Three properties this panel has to keep, in order of importance:
 *
 *  1. **It never runs on its own.** Sending a CV off the device is a
 *     decision the user makes, once, by pressing a button — not a thing
 *     that happens because they dropped a file. Every other layer has
 *     already produced its result by the time this is even offered.
 *  2. **It says what leaves.** Name, email and phone are removed before
 *     the request, and the panel shows exactly that, before the click
 *     rather than in a footnote after it.
 *  3. **Its failure is visibly local.** Every error message ends by
 *     saying the score and findings are unaffected, because they are.
 */

import { useEffect, useRef, useState } from 'react';
import type { AiReview, ResumeReport } from '@engines/resume/types';
import { CopyButton } from '@ui/Actions';
import { AlertIcon, BoltIcon, CheckIcon, ShieldIcon } from '@ui/Icons';
import { Button, Spinner, cx } from '@ui/primitives';

interface Props {
  report: ResumeReport;
  targetRole: string;
  jobAd: string;
  department: string;
  /** Readable department name, e.g. "Software & IT (CSE)". */
  departmentLabel: string;
  /**
   * Start the review as soon as the panel appears.
   *
   * Safe to do here, and only here, because the panel is mounted by a
   * submit the user pressed — they asked for the check, and the request
   * carries no identifiers. It is not started on file drop, on page
   * load, or on any option change.
   */
  autoRun?: boolean;
}

type State =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; review: AiReview; disclosure: string }
  | { status: 'error'; message: string };

/**
 * Remove the identifiers by exact string, using what layer 1 extracted.
 *
 * Exact replacement rather than a regex sweep: the parser knows the
 * precise name, address and number it found, and a generic phone pattern
 * would eat "2019" and "34%" — the very figures the model is being asked
 * to preserve.
 */
function redact(report: ResumeReport): string {
  const { contact } = report.parsed;
  let text = report.parsed.text;

  for (const value of [contact.name, contact.email, contact.phone]) {
    if (value && value.trim().length > 2) {
      text = text.split(value).join('[removed]');
    }
  }
  return text;
}

export function AiReviewPanel({
  report,
  targetRole,
  jobAd,
  department,
  departmentLabel,
  autoRun = false,
}: Props) {
  const [state, setState] = useState<State>({ status: 'idle' });

  // Guards the auto-run against React's double-invoked effects in
  // development, which would otherwise spend two model calls per check.
  const started = useRef(false);

  const run = async () => {
    setState({ status: 'running' });

    const weakBullets = report.parsed.bullets
      .filter((b) => !b.quantified || b.weakOpener !== null || !b.startsWithAction)
      .map((b) => b.text);

    try {
      const response = await fetch('/api/resume-review', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          resumeText: redact(report),
          targetRole,
          jobAd,
          department,
          seniority: report.parsed.seniority,
          score: report.score,
          relevance: report.relevance,
          grade: report.grade,
          knownIssues: report.findings.map((f) => f.title),
          missingKeywords: (report.keywords ?? []).filter((k) => !k.inResume).map((k) => k.term),
          weakBullets,
        }),
      });

      const data = (await response.json()) as {
        review?: AiReview;
        disclosure?: string;
        error?: string;
      };

      if (!response.ok || !data.review) {
        setState({ status: 'error', message: data.error ?? 'The AI review could not be completed.' });
        return;
      }
      setState({ status: 'done', review: data.review, disclosure: data.disclosure ?? '' });
    } catch {
      setState({
        status: 'error',
        message:
          'The AI review could not be reached. Your score and every finding above are unaffected — they were produced on your device.',
      });
    }
  };

  useEffect(() => {
    if (!autoRun || started.current) return;
    started.current = true;
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once, by design
  }, [autoRun]);

  /* ── Running ── */
  if (state.status === 'running') {
    return (
      <div className="rounded-xl border border-line bg-panel p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <Spinner className="text-brand" />
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-fg">
              Reading your CV as {departmentLabel ? `a ${departmentLabel} ` : 'a '}hiring
              manager…
            </p>
            <p className="mt-0.5 text-[12px] text-fg-subtle">
              Name, email and phone were removed before sending. Usually a few seconds.
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-2" aria-hidden="true">
          {[100, 92, 78].map((width) => (
            <div
              key={width}
              className="h-2.5 animate-pulse rounded-full bg-sunken"
              style={{ width: `${width}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  /* ── Idle or failed ── */
  if (state.status !== 'done') {
    return (
      <div className="rounded-xl border border-line bg-panel p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-3">
          <BoltIcon size={18} className="mt-0.5 shrink-0 text-brand" />
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold text-fg">AI recruiter review</h3>
            <p className="mt-1 flex items-start gap-1.5 text-[12.5px] leading-relaxed text-fg-muted">
              <ShieldIcon size={13} className="mt-0.5 shrink-0 text-brand-text" />
              Sends your CV text with name, email and phone removed
              {jobAd.trim() ? ', plus the advert' : ''}. Not the file.
            </p>

            {state.status === 'error' && (
              <p
                role="alert"
                className="mt-3 flex items-start gap-2 rounded-lg border border-danger-line bg-danger-soft px-3 py-2.5 text-[13px] leading-relaxed text-danger"
              >
                <AlertIcon size={14} className="mt-0.5 shrink-0" />
                {state.message}
              </p>
            )}

            <Button variant="primary" size="md" className="mt-3" onClick={() => void run()}>
              {state.status === 'error' ? 'Try again' : 'Run the AI review'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ── The review ── */
  const { review } = state;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-line bg-panel p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold text-fg">
            <BoltIcon size={16} className="text-brand" />
            AI recruiter review
          </h3>
          <span className="font-mono text-[11px] text-fg-subtle">
            {review.model}
            {review.cached && ' · cached'}
          </span>
        </div>

        {/* Who did the reading. Specific beats impressive: "a Software &
            IT hiring manager" is checkable and is the thing the
            department selector actually bought. Keeping "AI" in the
            heading is not a hedge — a label that lets a reader believe a
            person reviewed their CV is the one that destroys trust when
            they work it out. */}
        {departmentLabel && (
          <p className="mt-1 text-[12px] text-fg-subtle">
            Read as a {departmentLabel} hiring manager
            {targetRole.trim() ? ` hiring for ${targetRole.trim()}` : ''}.
          </p>
        )}

        <p className="mt-3 text-[14px] leading-relaxed text-fg">{review.verdict}</p>

        {review.firstImpression && (
          <div className="mt-3 border-l-2 border-brand-line pl-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
              The first six seconds
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{review.firstImpression}</p>
          </div>
        )}

        {(review.strengths.length > 0 || review.gaps.length > 0) && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Column
              title="What is working"
              tone="ok"
              items={review.strengths}
            />
            <Column
              title="What a hiring manager will miss"
              tone="warn"
              items={review.gaps}
            />
          </div>
        )}
      </div>

      {review.rewrites.length > 0 && (
        <div className="rounded-xl border border-line bg-panel p-4 sm:p-5">
          <h4 className="text-[14px] font-semibold text-fg">Rewritten bullets</h4>
          <p className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">
            Each &ldquo;before&rdquo; was matched against your real file — paraphrases were
            discarded. Square brackets are numbers only you have.
          </p>

          <ul className="mt-3 space-y-3">
            {review.rewrites.map((rewrite, i) => (
              <li key={i} className="overflow-hidden rounded-lg border border-line">
                <div className="border-b border-line bg-sunken px-3 py-2">
                  <p className="text-[10.5px] font-medium uppercase tracking-wider text-fg-subtle">
                    Your line
                  </p>
                  <p className="mt-1 font-mono text-[12px] leading-relaxed text-fg-muted line-through decoration-danger/50">
                    {rewrite.before}
                  </p>
                </div>
                <div className="bg-panel px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[10.5px] font-medium uppercase tracking-wider text-brand-text">
                      Rewritten
                    </p>
                    <CopyButton value={rewrite.after} label="Copy" />
                  </div>
                  <p className="mt-1 text-[13px] font-medium leading-relaxed text-fg">{rewrite.after}</p>
                  {rewrite.why && (
                    <p className="mt-1.5 text-[12px] leading-snug text-fg-subtle">{rewrite.why}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {review.summarySuggestion && (
        <div className="rounded-xl border border-line bg-panel p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-[14px] font-semibold text-fg">A summary you could paste in</h4>
            <CopyButton value={review.summarySuggestion} label="Copy summary" />
          </div>
          <p className="mt-2 rounded-lg border border-line bg-sunken px-3 py-2.5 text-[13.5px] leading-relaxed text-fg">
            {review.summarySuggestion}
          </p>
          <p className="mt-2 text-[12px] leading-snug text-fg-subtle">
            Built only from what your CV already claims. Check every word before you use it — this is
            your document, and you are the one who has to defend it in the interview.
          </p>
        </div>
      )}

      {review.nextActions.length > 0 && (
        <div className="rounded-xl border border-line bg-panel p-4 sm:p-5">
          <h4 className="text-[14px] font-semibold text-fg">Do these, in this order</h4>
          <ol className="mt-2.5 space-y-2">
            {review.nextActions.map((action, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-soft font-mono text-[11px] font-semibold text-brand-text">
                  {i + 1}
                </span>
                <span className="text-[13px] leading-relaxed text-fg-muted">{action}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {state.disclosure && (
        <p className="px-1 text-[11.5px] leading-relaxed text-fg-subtle">{state.disclosure}</p>
      )}
    </div>
  );
}

function Column({ title, tone, items }: { title: string; tone: 'ok' | 'warn'; items: string[] }) {
  if (items.length === 0) return null;

  const isOk = tone === 'ok';

  return (
    <div
      className={cx(
        'rounded-lg border p-3',
        isOk ? 'border-brand-line bg-brand-soft' : 'border-warn-line bg-warn-soft',
      )}
    >
      <p
        className={cx(
          'flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider',
          isOk ? 'text-brand-text' : 'text-warn',
        )}
      >
        {isOk ? <CheckIcon size={12} /> : <AlertIcon size={12} />}
        {title}
      </p>
      <ul className="mt-2 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[13.5px] leading-relaxed text-fg-muted">
            <span
              className={cx(
                'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                isOk ? 'bg-brand-text' : 'bg-warn',
              )}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
