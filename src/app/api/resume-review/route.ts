/**
 * POST /api/resume-review — layer 3 of the CV checker.
 *
 * HTTP concerns only: the flag, the rate limit, input bounds, and the
 * mapping from a failure to a sentence a person can act on. The prompt,
 * the model call and the validation live in `@ai/resume-review`, which
 * is where they can be tested and reviewed on their own.
 *
 * Every failure path here returns a message that says the same thing in
 * different words: the score and the findings are unaffected, because
 * they were produced on the user's device before this route was called.
 * That is true, and it is the difference between a degraded panel and a
 * broken tool.
 */

import { AiUnavailableError, groqConfigured } from '@ai/groq';
import { AI_DISCLOSURE } from '@ai/guardrails';
import {
  REVIEW_LIMITS,
  ReviewShapeError,
  reviewResume,
  scrubIdentifiers,
  type ReviewInput,
} from '@ai/resume-review';
import { getDepartment } from '@engines/resume/departments';
import { flags } from '@core/flags';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/* ═══════════════════════════════════════════════════════════════════
   Rate limiting

   In-process and per-instance, matching the response cache. It stops one
   tab from looping the endpoint; it is not a defence against a
   distributed caller, and Redis is the documented upgrade (Part 6.8).
   ═══════════════════════════════════════════════════════════════════ */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 12;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);

  // Bound the map so a long-lived instance cannot grow it without limit.
  if (hits.size > 5_000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }
  return recent.length > MAX_PER_WINDOW;
}

const clientIp = (request: Request): string =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
  request.headers.get('x-real-ip') ??
  'unknown';

/* ── Input coercion ─────────────────────────────────────────────── */

const str = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.slice(0, max).trim() : '';

const strList = (value: unknown, max: number, itemMax = 220): string[] =>
  Array.isArray(value)
    ? value
        .filter((v): v is string => typeof v === 'string')
        .slice(0, max)
        .map((v) => v.slice(0, itemMax).trim())
        .filter(Boolean)
    : [];

/* ── Handler ────────────────────────────────────────────────────── */

export async function POST(request: Request): Promise<Response> {
  if (!flags.ai || !groqConfigured()) {
    return Response.json(
      {
        error:
          'The AI review is switched off on this deployment. Your score and every finding above are unaffected — they are produced on your device.',
      },
      { status: 503 },
    );
  }

  if (rateLimited(clientIp(request))) {
    return Response.json(
      { error: 'That is a lot of reviews in a short time. Try again in a few minutes.' },
      { status: 429, headers: { 'retry-after': '300' } },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: 'The request could not be read.' }, { status: 400 });
  }

  const body = raw as Record<string, unknown>;
  const resumeText = scrubIdentifiers(str(body.resumeText, REVIEW_LIMITS.resumeChars));

  if (resumeText.length < 200) {
    return Response.json(
      {
        error:
          'There is not enough readable text in this CV for a review. Fix the parsing findings above first — they are the reason.',
      },
      { status: 400 },
    );
  }

  /* Resolved from the catalogue by id, never taken from the request.
     The persona and the outcome example go straight into the prompt, so
     accepting them as free text would hand any caller a way to rewrite
     the system instructions from the client. */
  const department = getDepartment(str(body.department, 32));

  const input: ReviewInput = {
    resumeText,
    targetRole: str(body.targetRole, REVIEW_LIMITS.roleChars),
    jobAd: scrubIdentifiers(str(body.jobAd, REVIEW_LIMITS.jobAdChars)),
    seniority: str(body.seniority, 24) || 'unknown',
    department: department?.label ?? '',
    departmentPersona: department?.persona ?? '',
    departmentOutcome: department?.outcomeExample ?? '',
    score: typeof body.score === 'number' ? Math.round(body.score) : 0,
    relevance: typeof body.relevance === 'number' ? Math.round(body.relevance) : null,
    grade: str(body.grade, 3),
    knownIssues: strList(body.knownIssues, REVIEW_LIMITS.issues, 160),
    missingKeywords: strList(body.missingKeywords, REVIEW_LIMITS.keywords, 40),
    weakBullets: strList(body.weakBullets, REVIEW_LIMITS.bullets),
  };

  try {
    const review = await reviewResume(input);
    return Response.json(
      { review, disclosure: AI_DISCLOSURE },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof ReviewShapeError) {
      return Response.json({ error: error.message }, { status: 502 });
    }
    if (error instanceof AiUnavailableError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json(
      { error: 'The AI review could not be completed. Your score and findings above are unaffected.' },
      { status: 503 },
    );
  }
}
