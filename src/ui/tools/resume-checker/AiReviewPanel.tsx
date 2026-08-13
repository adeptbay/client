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

import { useState } from 'react';
import type { AiReview, ResumeReport } from '@engines/resume/types';
import { CopyButton } from '@ui/Actions';
import { AlertIcon, BoltIcon, CheckIcon, ShieldIcon } from '@ui/Icons';
import { Button, Spinner, cx } from '@ui/primitives';

interface Props {
  report: ResumeReport;
  targetRole: string;
  jobAd: string;
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

export function AiReviewPanel({ report, targetRole, jobAd }: Props) {
  const [state, setState] = useState<State>({ status: 'idle' });

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
          seniority: report.parsed.seniority,
          score: report.score,
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

  /* ── Before the click ── */
  if (state.status !== 'done') {
    return (
      <div className="rounded-xl border border-line bg-panel p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <BoltIcon size={20} className="mt-0.5 shrink-0 text-brand" />
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold text-fg">Second opinion from an AI reviewer</h3>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-fg-muted">
              Everything above is a rule: countable, repeatable, and computed on your device. This
              is the other kind of feedback — whether your bullets are actually convincing for the
              role, and how three or four of them would read rewritten. It is the one part of this
              tool that sends anything anywhere.
            </p>

            <div className="mt-3 rounded-lg border border-brand-line bg-brand-soft px-3 py-2.5">
              <p className="flex items-start gap-2 text-[12.5px] leading-relaxed text-fg">
                <ShieldIcon size={14} className="mt-0.5 shrink-0 text-brand-text" />
                <span>
                  <strong className="font-semibold">What gets sent:</strong> the text of your CV with
                  your name, email address and phone number removed first
                  {jobAd.trim() ? ', plus the job advert you pasted' : ''}. Not the file. It is not
                  stored and it is not used for training.
                </span>
              </p>
            </div>

            {state.status === 'error' && (
              <p
                role="alert"
                className="mt-3 flex items-start gap-2 rounded-lg border border-danger-line bg-danger-soft px-3 py-2.5 text-[13px] leading-relaxed text-danger"
              >
                <AlertIcon size={14} className="mt-0.5 shrink-0" />
                {state.message}
              </p>
            )}

            <Button
              variant="primary"
              size="md"
              className="mt-3.5"
              onClick={() => void run()}
              disabled={state.status === 'running'}
            >
              {state.status === 'running' && <Spinner />}
              {state.status === 'running' ? 'Reading your CV…' : 'Run the AI review'}
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
            AI review
          </h3>
          <span className="font-mono text-[11px] text-fg-subtle">
            {review.model}
            {review.cached && ' · cached'}
          </span>
        </div>

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
            Every &ldquo;before&rdquo; below was checked against your actual file — anything the model
            paraphrased rather than quoted was discarded. Square brackets are numbers only you have;
            fill them in rather than guessing.
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

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">{title}</p>
      <ul className="mt-1.5 space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] leading-snug text-fg-muted">
            {tone === 'ok' ? (
              <CheckIcon size={13} className="mt-1 shrink-0 text-brand-text" />
            ) : (
              <span className={cx('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warn')} />
            )}
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
