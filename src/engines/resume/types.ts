/**
 * The shapes the three layers pass between them.
 *
 * Layer 1 (`parse.ts`) turns a PDF into a `ParsedResume`.
 * Layer 2 (`score.ts`) turns a `ParsedResume` into a `ResumeReport`.
 * Layer 3 (the API route) turns both into an `AiReview`.
 *
 * Layers 1 and 2 never call the network. Layer 3 is optional and always
 * additive: every finding a user acts on exists without it.
 */

import type { PdfExtraction } from '@engines/pdf';
import type { SectionKind } from './vocabulary';

export type { SectionKind };

export type Seniority = 'student' | 'entry' | 'mid' | 'senior' | 'executive';

/* ── Layer 1 output ─────────────────────────────────────────────── */

export interface ContactBlock {
  name: string | null;
  headline: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
  github: string | null;
  website: string | null;
  /** Fields the file carries that most markets advise against. */
  sensitive: string[];
}

export interface DateRange {
  raw: string;
  startYear: number | null;
  startMonth: number | null;
  endYear: number | null;
  endMonth: number | null;
  current: boolean;
  months: number | null;
}

export interface ResumeBullet {
  text: string;
  words: number;
  /** The bullet's opening word, stemmed to base form. */
  verb: string | null;
  verbGroup: string | null;
  tense: 'past' | 'present' | 'gerund' | 'unknown';
  startsWithAction: boolean;
  quantified: boolean;
  metrics: string[];
  weakOpener: string | null;
  cliches: string[];
  hedges: string[];
  firstPerson: boolean;
  /** Which role this bullet sits under, index into `roles`. -1 if loose. */
  roleIndex: number;
}

export interface ResumeRole {
  /**
   * The section this entry was found under.
   *
   * Load-bearing for the dates check: a job without dates is a real
   * omission, and a *project* without dates is normal. Without this the
   * checker penalises a correctly-built CV for a convention that does
   * not exist.
   */
  source: SectionKind;
  header: string;
  title: string | null;
  organisation: string | null;
  dates: DateRange | null;
  bullets: ResumeBullet[];
  /** Body lines that are not bullets — a prose paragraph under the role. */
  proseWords: number;
}

export interface ResumeSection {
  kind: SectionKind;
  heading: string;
  lines: string[];
  text: string;
  words: number;
  /** Order in the document, 0-based. */
  position: number;
}

export interface EmploymentGap {
  afterYear: number;
  afterMonth: number;
  beforeYear: number;
  beforeMonth: number;
  months: number;
}

export interface ParsedResume {
  contact: ContactBlock;
  sections: ResumeSection[];
  roles: ResumeRole[];
  bullets: ResumeBullet[];
  skills: string[];
  degrees: string[];
  lines: string[];
  text: string;
  words: number;
  /** Distinct date formats used across the file. More than one is a flag. */
  dateFormats: string[];
  /** Months covered by dated roles, deduplicated across overlaps. */
  experienceMonths: number;
  gaps: EmploymentGap[];
  seniority: Seniority;
  /** True when the document has no recognisable section headings at all. */
  headingsFound: boolean;
}

/* ── Layer 2 output ─────────────────────────────────────────────── */

export type CategoryId =
  | 'parse'
  | 'contact'
  | 'structure'
  | 'impact'
  | 'keywords'
  | 'language'
  | 'length';

export type Severity = 'critical' | 'important' | 'polish';

export interface Finding {
  id: string;
  category: CategoryId;
  severity: Severity;
  /** One line, states the problem in the user's terms. */
  title: string;
  /** Why it costs them something. Two sentences at most. */
  detail: string;
  /** What to do instead. Imperative, specific. */
  fix: string;
  /** Lines from their own CV. Nothing persuades like their own words. */
  evidence: string[];
  pointsLost: number;
}

export interface CheckOutcome {
  id: string;
  label: string;
  /** 0–1. Partial credit throughout; almost nothing here is binary. */
  ratio: number;
  weight: number;
  finding: Omit<Finding, 'id' | 'category' | 'pointsLost'> | null;
  severity: Severity;
}

/**
 * Which of the two scores a category feeds.
 *
 * A CV can be excellent and still be the wrong CV for the job. Rolling
 * both facts into one number produces a figure that explains neither —
 * the candidate cannot tell whether to rewrite the document or apply
 * somewhere else, which are opposite actions.
 */
export type ScoreScope = 'quality' | 'relevance';

export interface CategoryResult {
  id: CategoryId;
  label: string;
  /** What this category is actually measuring, in one line. */
  description: string;
  /** 0–100 within the category. */
  score: number;
  /** Share of the score it feeds. */
  weight: number;
  points: number;
  maxPoints: number;
  scope: ScoreScope;
  checks: CheckOutcome[];
}

export type Grade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface ResumeStats {
  pages: number;
  words: number;
  bullets: number;
  roles: number;
  quantifiedBullets: number;
  actionBullets: number;
  skills: number;
  readingSeconds: number;
  fileKb: number;
  columns: number;
  images: number;
  unmappedGlyphs: number;
  invisibleRuns: number;
}

export interface KeywordMatch {
  term: string;
  inResume: boolean;
  /** How often the advert repeats it — a proxy for how much it matters. */
  adCount: number;
}

export interface ResumeReport {
  /**
   * CV quality, 0–100 — how good the document is, independent of what
   * it is being sent to. Parsing, structure, evidence, language, length.
   */
  score: number;
  grade: Grade;
  /**
   * How well this CV fits the field and the advert, 0–100. Null only
   * when neither a department nor a job advert was given, since there is
   * then nothing to be relevant *to*.
   */
  relevance: number | null;
  relevanceGrade: Grade | null;
  /** "Job match" once an advert is pasted, "Field match" before that. */
  relevanceLabel: string;
  /** One sentence a person can act on, keyed to the score band. */
  verdict: string;
  /** What the relevance number means, in one sentence. */
  relevanceVerdict: string;
  categories: CategoryResult[];
  findings: Finding[];
  /** What the CV already gets right. A scorer that only nags gets closed. */
  wins: string[];
  stats: ResumeStats;
  keywords: KeywordMatch[] | null;
  keywordCoverage: number | null;
  parsed: ParsedResume;
  /** The parser's own view, for the "what a parser sees" panel. */
  atsText: string;
  document: PdfExtraction;
}

/* ── Layer 3 output ─────────────────────────────────────────────── */

export interface RewrittenBullet {
  before: string;
  after: string;
  why: string;
}

export interface AiReview {
  /** Two or three sentences, addressed to the candidate. */
  verdict: string;
  /** What a recruiter for the target role would notice first. */
  firstImpression: string;
  strengths: string[];
  gaps: string[];
  rewrites: RewrittenBullet[];
  /** A summary/profile paragraph written from what the CV already says. */
  summarySuggestion: string;
  /** Ordered, most valuable first. */
  nextActions: string[];
  /** Terms from the advert the CV should earn the right to claim. */
  missingKeywords: string[];
  model: string;
  cached: boolean;
}
