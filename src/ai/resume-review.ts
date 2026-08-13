import 'server-only';

/**
 * Layer 3 of the CV checker — the prompt, and the validation that makes
 * it safe to render.
 *
 * Kept out of the route handler on purpose. A route file may only export
 * HTTP handlers, so anything living there is untestable and unreviewable
 * in isolation — and the prompt is the part of this layer most likely to
 * need changing, and most damaging to get wrong.
 *
 * ── What this layer is allowed to be ────────────────────────────────
 *
 * Additive, never load-bearing. Layers 1 and 2 run entirely on the
 * user's device and produce the score, the findings and the fixes. If
 * this is down, unconfigured, over budget or rate limited, the tool
 * still works completely. That is the design, not a fallback.
 *
 * So the model is given only the jobs a rule cannot do: judging whether
 * a bullet is *convincing* for a particular role, and rewriting it using
 * the candidate's own material.
 *
 * ── Anti-hallucination ──────────────────────────────────────────────
 *
 * A CV tool that invents an achievement produces a candidate who is
 * caught in the interview. Two mechanisms, because instructions alone
 * are not a guarantee:
 *
 *   · the prompt forbids inventing facts and requires `[placeholder]`
 *     markers wherever a number is missing;
 *   · `verifyRewrites` drops any rewrite whose "before" is not actually
 *     a line in the document the user uploaded.
 *
 * The second is what makes the first enforceable.
 */

import { generate } from './groq';
import { parseStructured } from './guardrails';

export interface ReviewInput {
  /** Already redacted in the browser. Re-scrubbed here regardless. */
  resumeText: string;
  targetRole: string;
  jobAd: string;
  seniority: string;
  /** Department label, e.g. "Sales & Business Development". */
  department: string;
  /** Who that department's screener is, from the department catalogue. */
  departmentPersona: string;
  /** What a result looks like in that field — an anti-generic anchor. */
  departmentOutcome: string;
  score: number;
  grade: string;
  /** Field/job fit, 0-100, separate from quality. Null if unmeasurable. */
  relevance: number | null;
  /** Layer-2 finding titles, so the model adds instead of repeating. */
  knownIssues: string[];
  missingKeywords: string[];
  weakBullets: string[];
}

export interface ReviewOutput {
  verdict: string;
  firstImpression: string;
  strengths: string[];
  gaps: string[];
  rewrites: { before: string; after: string; why: string }[];
  summarySuggestion: string;
  nextActions: string[];
  missingKeywords: string[];
  model: string;
  cached: boolean;
}

export const REVIEW_LIMITS = {
  resumeChars: 9_000,
  jobAdChars: 2_500,
  roleChars: 120,
  issues: 14,
  keywords: 20,
  bullets: 14,
} as const;

/**
 * Second pass at redaction — the browser removed the identifiers it knew
 * exactly, and this catches anything a hand-edited request could carry.
 *
 * Deliberately narrow. The generic PII pattern in `guardrails.ts` is
 * tuned for prose and eats "2019" and "34%" as phone numbers, which
 * would corrupt the very lines the model is asked to rewrite.
 */
export function scrubIdentifiers(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]{2,}/g, '[email removed]')
    .replace(/\+\d[\d\s().-]{8,16}\d/g, '[phone removed]')
    .replace(/\b\d{3}[\s.-]\d{3}[\s.-]\d{4}\b/g, '[phone removed]');
}

/* ═══════════════════════════════════════════════════════════════════
   The prompt
   ═══════════════════════════════════════════════════════════════════ */

export const SYSTEM_PROMPT = `You are a hiring manager who has personally screened more than 20,000 CVs and run hiring for teams in the US, UK, EU and South Asia. You are advising one candidate, directly and without flattery.

HOW YOU JUDGE
- You read a CV the way a screener does: six seconds on the top third, then a decision about whether to keep reading.
- You care about evidence, not adjectives. A claim with no number, scale or named outcome is not evidence.
- You know the difference between a CV that is badly written and a career that is badly presented. Say which one you are looking at.

HARD RULES — breaking any of these makes your answer worthless
1. NEVER invent an employer, job title, date, technology, metric or achievement that is not in the CV text you are given.
2. If the CV already states a figure, REUSE THAT EXACT FIGURE. Only where the CV genuinely has no number may you write a bracketed placeholder for the candidate to fill in: "[X]%", "[N] engineers", "[amount]". Never guess a value, and never replace a real number with a placeholder.
3. At most two placeholders in any one rewritten bullet, and only for things this person could actually measure. A bullet made of placeholders is not a rewrite.
4. Every "before" string must be copied EXACTLY, character for character, from the CV text. If you cannot copy it exactly, leave that rewrite out.
5. In "strengths", quote or name what the CV already says, as it stands. No placeholders, no corrections, no commentary on your own output — a strength is evidence that is already there.
6. NEVER use these phrases anywhere in your answer: results-driven, results-oriented, proven track record, team player, detail-oriented, hard-working, passionate about, self-motivated, excellent communication skills, dynamic, seasoned, fast learner. They are penalised elsewhere in this report and using them contradicts it.
7. Do not repeat anything under ALREADY_REPORTED. The candidate has been told. Your value is what a checklist cannot see.
8. The candidate's name, email and phone were removed before this text reached you. Do not comment on them and do not ask for them.
9. Write to the person, not about them: "you" and "your CV", never "the candidate", "they" or "this applicant". No preamble, no sign-off, no markdown formatting inside the string values.

WHAT ONLY YOU CAN SEE
Rules have already checked the structure, the parsing, the verbs and the counting. What they cannot judge is whether this CV is convincing for this specific role: whether the seniority claimed matches the scope shown, whether the achievements are the ones this employer cares about, whether the story from job to job holds together, and what a screener would quietly assume that the candidate did not intend.

DEPARTMENT
If a DEPARTMENT is given, it is the lens for everything you write. Judge the evidence the way that field judges it and use its vocabulary — the same bullet is strong on a sales CV and irrelevant on a clinical one. Do not give advice that belongs to a different field.

OUTPUT
Return ONE JSON object and nothing else. No markdown fence. Exactly this shape:

{
  "verdict": "2-3 sentences. What this CV does well and what is holding it back for this role specifically.",
  "firstImpression": "1-2 sentences. What a screener concludes in the first six seconds, including anything unintended.",
  "strengths": ["3-4 items, each naming evidence that is already in the CV, quoted or summarised faithfully."],
  "gaps": ["3-5 items. What a hiring manager for this role wants to see and cannot find. Name the role or section."],
  "rewrites": [
    { "before": "exact line copied from the CV", "after": "rewritten line, verb first, outcome at the end, placeholders where a number is missing", "why": "one short sentence on what changed and why it lands better" }
  ],
  "summarySuggestion": "The CV summary section itself, ready to paste, in the third-person-implied register a CV uses: 'Front-end developer with five years...'. NOT advice about the summary, and never the word 'you'. 2-3 sentences, built ONLY from facts in this CV, opening with the target role and using the CV's real figures. No trailing suggestions.",
  "nextActions": ["3-5 items ordered by how much they change the outcome. Each starts with a verb and is doable in an afternoon."],
  "missingKeywords": ["terms from the job advert this candidate plausibly already has but never wrote down. Empty array if no advert was given or nothing qualifies."]
}

Give 3 to 5 rewrites, choosing the bullets where the gap between what was done and what was written is widest.`;

export function buildUserPrompt(input: ReviewInput): string {
  const parts: string[] = [];

  /* The department comes first and is phrased as an instruction rather
     than a label, because it is the single strongest lever against a
     generic review: it decides which evidence counts as evidence. */
  if (input.department) {
    parts.push(
      `DEPARTMENT: ${input.department}`,
      `READ THIS CV AS ${input.departmentPersona}.`,
      `In this field a result is stated like this: ${input.departmentOutcome}. Judge the bullets against that standard, not against a generic one.`,
      '',
    );
  }

  parts.push(
    `TARGET_ROLE: ${input.targetRole || '(not specified — judge against the roles the CV itself claims)'}`,
    `CAREER_STAGE (inferred from the dates): ${input.seniority}`,
    `RULE_BASED_CV_QUALITY: ${input.score}/100 (grade ${input.grade})`,
    input.relevance === null
      ? 'RULE_BASED_FIT: not measured.'
      : `RULE_BASED_FIT to this field/advert: ${input.relevance}/100. These two are deliberately separate — a strong CV can still be aimed at the wrong thing. If quality is high and fit is low, say so plainly: the fix is the wording, not the career.`,
  );

  if (input.knownIssues.length > 0) {
    parts.push(`\nALREADY_REPORTED — do not repeat these:\n${input.knownIssues.map((i) => `- ${i}`).join('\n')}`);
  }
  if (input.missingKeywords.length > 0) {
    parts.push(`\nTERMS IN THE ADVERT THAT THE CV NEVER USES:\n${input.missingKeywords.join(', ')}`);
  }
  if (input.weakBullets.length > 0) {
    parts.push(
      `\nBULLETS THE RULES FLAGGED AS WEAKEST — prefer these for rewriting, and copy them exactly:\n${input.weakBullets
        .map((b) => `- ${b}`)
        .join('\n')}`,
    );
  }
  if (input.jobAd.length > 0) {
    parts.push(`\n<job_advert>\n${input.jobAd}\n</job_advert>`);
  }

  // The untrusted span is fenced and named, so the model has an
  // unambiguous boundary between our instructions and the document.
  parts.push(`\n<cv_text>\n${input.resumeText}\n</cv_text>`);

  /* Repeated last on purpose. The register rule is in the system prompt
     too, but a long document between the instruction and the generation
     is exactly where it gets dropped, and "the candidate's background"
     reads as a report written about someone rather than advice given to
     them. Recency is cheaper than post-processing the model's prose. */
  parts.push(
    '\nWrite to this person directly as "you" and "your CV" — never "the candidate" or "they". Return only the JSON object.',
  );

  return parts.join('\n');
}

/* ═══════════════════════════════════════════════════════════════════
   Validation
   ═══════════════════════════════════════════════════════════════════ */

interface RawReview {
  verdict: string;
  firstImpression?: unknown;
  strengths: unknown;
  gaps: unknown;
  rewrites: { before?: unknown; after?: unknown; why?: unknown }[];
  summarySuggestion?: unknown;
  nextActions: unknown;
  missingKeywords?: unknown;
}

function isRawReview(value: unknown): value is RawReview {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const isStrings = (x: unknown): boolean => Array.isArray(x) && x.every((i) => typeof i === 'string');

  return (
    typeof v.verdict === 'string' &&
    v.verdict.trim().length > 0 &&
    isStrings(v.strengths) &&
    isStrings(v.gaps) &&
    isStrings(v.nextActions) &&
    Array.isArray(v.rewrites)
  );
}

/**
 * Keep only rewrites whose "before" really appears in the user's CV.
 *
 * A model that paraphrases the original line produces a "before" the
 * candidate cannot find in their own document, and a diff they cannot
 * locate is worse than no diff at all.
 */
export function verifyRewrites(
  rewrites: { before?: unknown; after?: unknown; why?: unknown }[],
  resumeText: string,
): { before: string; after: string; why: string }[] {
  const haystack = resumeText.toLowerCase().replace(/\s+/g, ' ');

  return rewrites
    .filter(
      (r): r is { before: string; after: string; why: string } =>
        typeof r.before === 'string' &&
        typeof r.after === 'string' &&
        r.before.trim().length > 8 &&
        r.after.trim().length > 8 &&
        r.before.trim() !== r.after.trim(),
    )
    .map((r) => ({
      before: r.before.trim().replace(/^[-•·*\s]+/, ''),
      after: r.after.trim().replace(/^[-•·*\s]+/, ''),
      why: typeof r.why === 'string' ? r.why.trim() : '',
    }))
    .filter((r) => {
      const needle = r.before.toLowerCase().replace(/\s+/g, ' ');
      if (haystack.includes(needle)) return true;
      // Tolerate a trimmed tail, but require a long exact head match so
      // a paraphrase cannot slip through.
      return needle.length > 40 && haystack.includes(needle.slice(0, 40));
    })
    .slice(0, 5);
}

const cleanList = (items: unknown, max: number): string[] =>
  Array.isArray(items)
    ? items
        .filter((i): i is string => typeof i === 'string')
        .map((i) => i.trim().replace(/^[-•*]\s*/, ''))
        .filter((i) => i.length > 2)
        .slice(0, max)
    : [];

const asText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/* ═══════════════════════════════════════════════════════════════════
   The call
   ═══════════════════════════════════════════════════════════════════ */

export class ReviewShapeError extends Error {
  constructor() {
    super('The AI review came back in a shape this page could not read. Nothing else is affected — try again.');
    this.name = 'ReviewShapeError';
  }
}

export async function reviewResume(input: ReviewInput): Promise<ReviewOutput> {
  const result = await generate({
    toolSlug: 'resume-checker',
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(input),
    json: true,
    maxTokens: 2000,
    temperature: 0.3,
  });

  const parsed = parseStructured(result.text, isRawReview);
  if (parsed === null) throw new ReviewShapeError();

  return {
    verdict: parsed.verdict.trim(),
    firstImpression: asText(parsed.firstImpression),
    strengths: cleanList(parsed.strengths, 5),
    gaps: cleanList(parsed.gaps, 6),
    rewrites: verifyRewrites(parsed.rewrites, input.resumeText),
    summarySuggestion: asText(parsed.summarySuggestion),
    nextActions: cleanList(parsed.nextActions, 6),
    missingKeywords: cleanList(parsed.missingKeywords, 12),
    model: result.model,
    cached: result.cached,
  };
}
