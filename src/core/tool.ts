/**
 * ═══════════════════════════════════════════════════════════════════
 * Part 6.2 — "A tool is a data record, not a page."
 *
 * Adding a tool means adding ONE file that exports `defineTool({...})`.
 * Everything below is then generated automatically:
 *
 *   page render · title/meta/canonical · OG image · 7 schema types
 *   sitemap entry · breadcrumbs · related tools · category hub listing
 *   search index · API route · FAQ section · How-to section
 *
 * The only part written fresh each time is `run()`.
 * ═══════════════════════════════════════════════════════════════════
 */

/** Where the work happens. Default to `client` — Part 4.4, "the golden rule". */
export type ToolRuntime = 'client' | 'edge' | 'server' | 'queue';

export type ToolStatus = 'draft' | 'live' | 'deprecated';

/* ── Options schema ─────────────────────────────────────────────────
   OptionsForm renders these into a real form — label, control,
   validation and URL state — with no per-tool UI code. Part 6.5 calls
   this the single biggest time saver across 1000 tools.               */

export type EnumChoice = string | { value: string; label: string };

interface OptionBase {
  key: string;
  label: string;
  /** Shown under the control. Use it for the non-obvious, not the obvious. */
  help?: string;
  /** Hide this option unless another boolean option is on. */
  showIf?: { key: string; equals: string | number | boolean };
}

export type ToolOption =
  | (OptionBase & { type: 'text'; default: string; placeholder?: string; maxLength?: number })
  /** Multi-line option — rule lists, templates, a second body of text. */
  | (OptionBase & {
      type: 'textarea';
      default: string;
      placeholder?: string;
      rows?: number;
      mono?: boolean;
      /** Span the full width of the options grid. */
      wide?: boolean;
    })
  | (OptionBase & { type: 'number'; default: number; min?: number; max?: number; step?: number })
  | (OptionBase & { type: 'range'; default: number; min: number; max: number; step?: number; unit?: string })
  | (OptionBase & { type: 'bool'; default: boolean })
  | (OptionBase & { type: 'enum'; default: string; values: EnumChoice[] });

export type OptionValue = string | number | boolean;

/* ── Input / output shapes ──────────────────────────────────────── */

export type ToolInputSpec =
  | { type: 'text'; label?: string; placeholder?: string; rows?: number; mono?: boolean; sample?: string }
  /** Two panes side by side — comparison tools. run() receives [a, b]. */
  | {
      type: 'text-pair';
      labelA: string;
      labelB: string;
      placeholder?: string;
      rows?: number;
      mono?: boolean;
      sampleA?: string;
      sampleB?: string;
    }
  | { type: 'files'; label?: string; accept: string[]; max: number; maxSizeMB: number }
  /** Generators and calculators — the options are the input. */
  | { type: 'form' };

export type ToolOutputSpec =
  | { type: 'text'; mono?: boolean; language?: string; label?: string }
  | { type: 'stats'; label?: string }
  | { type: 'table'; label?: string }
  | { type: 'diff'; label?: string }
  | { type: 'file'; ext: string; label?: string };

/* ── Run contract ───────────────────────────────────────────────── */

export interface StatItem {
  label: string;
  value: string | number;
  hint?: string;
  /** Pull one or two numbers forward as the headline result. */
  primary?: boolean;
}

export interface DiffLine {
  kind: 'same' | 'add' | 'remove';
  left?: string;
  right?: string;
  leftNo?: number;
  rightNo?: number;
}

export interface ResultTable {
  caption?: string;
  head: string[];
  rows: (string | number)[][];
  /**
   * Column index to render as a proportional bar, 0–1. Turns a frequency
   * list into something scannable instead of a wall of numbers.
   */
  barColumn?: number;
}

export interface ToolRunResult {
  /** Primary textual result. Rendered in ResultBox, copyable, downloadable. */
  output?: string;
  /** Suggested download filename, extension included. */
  filename?: string;
  /** Numeric read-outs. Used alone by counters, alongside `output` by others. */
  stats?: StatItem[];
  /** Line-level comparison, rendered by DiffViewer. */
  diff?: DiffLine[];
  /** Tabular result — frequencies, parsed columns, detected characters. */
  table?: ResultTable;
  /** Short neutral remarks — "3 lines were empty and were skipped". */
  notes?: string[];
}

/**
 * A tool failed in a way the user can act on.
 * Throw this (not a bare Error) so ErrorPanel can show a fix, not a stack.
 */
export class ToolError extends Error {
  readonly hint?: string;
  constructor(message: string, hint?: string) {
    super(message);
    this.name = 'ToolError';
    this.hint = hint;
  }
}

export type ToolRun<TInput, TOptions> = (
  input: TInput,
  options: TOptions,
) => ToolRunResult | Promise<ToolRunResult>;

/* ── Information gain (Part 5.4) ────────────────────────────────────
   The block that keeps a page out of "scaled content abuse" and gives
   an LLM a reason to cite it. Every tool must supply at least one of
   these fields — `validateTool()` enforces it.                       */

export interface ToolInfoGain {
  /** 40–60 words, directly under the heading. This is what AI lifts. */
  summary: string;
  benchmarks?: { label: string; value: string; note?: string }[];
  supports?: string[];
  limits?: string[];
  errors?: { cause: string; fix: string }[];
  table?: { caption?: string; head: string[]; rows: string[][] };
  /** ISO month, e.g. "2026-08". Rendered as "Last verified". */
  verified?: string;
}

export interface ToolFaq {
  /** Phrase as the literal question a person types. Part 5.10 tactic 1. */
  q: string;
  /** Complete the answer in the first 40–60 words. Tactic 2. */
  a: string;
}

export interface ToolHowToStep {
  title: string;
  detail: string;
}

/* ── The 50-point score (Part 3.3) ──────────────────────────────── */

export interface ToolScore {
  /** 10 = 100k+ monthly searches · 5 = 5k+ · 1 = under 200 */
  demand: number;
  /** 10 = needed in 2010 and in 2035 · 1 = this year's hype */
  evergreen: number;
  /** 10 = weak sites in the top 5 · 2 = all big brands + AI Overview */
  serp: number;
  /** 10 = converts to Premium/API · 4 = display ads only */
  money: number;
  /** 10 = two hours, client-side · 1 = a week */
  ease: number;
}

export const scoreTotal = (s: ToolScore): number =>
  s.demand + s.evergreen + s.serp + s.money + s.ease;

export type ScoreVerdict = 'build-now' | 'backlog' | 'cluster-only' | 'skip';

export function scoreVerdict(s: ToolScore): ScoreVerdict {
  const t = scoreTotal(s);
  if (t >= 40) return 'build-now';
  if (t >= 30) return 'backlog';
  if (t >= 20) return 'cluster-only';
  return 'skip';
}

/* ── The definition ─────────────────────────────────────────────── */

export interface ToolDefinition<TInput = string, TOptions = Record<string, OptionValue>> {
  /** URL segment. Permanent — Part 3.2, "a URL never changes". */
  slug: string;
  /** Division slug; becomes the first URL segment. */
  category: string;
  /** Fine-grained group used for internal linking. Part 4.6. */
  cluster: string;

  name: string;
  /** One line, benefit + differentiator. Becomes the H1 sub-heading. */
  tagline: string;
  /** 140–155 characters. Becomes the meta description. */
  description: string;
  /** Target queries. Feeds the search index and the keyword sheet export. */
  keywords: string[];

  runtime: ToolRuntime;
  status: ToolStatus;
  premium: boolean;
  apiEnabled: boolean;

  score: ToolScore;

  input: ToolInputSpec;
  options: ToolOption[];
  output: ToolOutputSpec;

  /**
   * Wait for an explicit click instead of running as the user types.
   *
   * Set it when a run is expensive enough that debounced auto-run would
   * hurt — the encryptor's 600,000-round key derivation costs ~400 ms,
   * and doing that per keystroke would peg a core and wreck INP.
   */
  manualRun?: boolean;
  /** Label for the manual run button. Defaults to the tool name. */
  runLabel?: string;

  howTo: ToolHowToStep[];
  faq: ToolFaq[];
  infoGain: ToolInfoGain;

  /** Hand-picked siblings. The algorithm fills the rest — see related.ts. */
  related: string[];
  /** "Next step" strip: what the user probably wants to do with this output. */
  nextSteps?: string[];

  /** ISO dates. `updated` drives sitemap lastmod — never fake it (Part 5.9). */
  added: string;
  updated: string;

  run: ToolRun<TInput, TOptions>;
}

/** A definition with `run` stripped — safe to hand to a client component. */
export type ToolMeta = Omit<ToolDefinition<never, never>, 'run'>;

/**
 * Identity function that pins the type. The value it returns is what the
 * registry indexes; the generics let each tool type its own run().
 */
export function defineTool<TInput = string, TOptions = Record<string, OptionValue>>(
  def: ToolDefinition<TInput, TOptions>,
): ToolDefinition<TInput, TOptions> {
  return def;
}

/** Strip the executable half so the definition can cross to the client. */
export function toMeta<I, O>(tool: ToolDefinition<I, O>): ToolMeta {
  const { run: _run, ...meta } = tool;
  return meta as unknown as ToolMeta;
}

export const toolPath = (t: { category: string; slug: string }): string =>
  `/${t.category}/${t.slug}`;

export const guidePath = (t: { category: string; slug: string }): string =>
  `/${t.category}/${t.slug}/guide`;

/**
 * Build-time quality gate. Runs when the registry is first read, so a
 * definition that would produce a thin page fails the build rather than
 * quietly shipping. This is the CI check from Part 6.10 done in-process,
 * with no extra test tooling.
 */
export function validateTool(t: ToolDefinition<never, never>): string[] {
  const errors: string[] = [];
  const at = `${t.category}/${t.slug}`;

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(t.slug)) errors.push(`${at}: slug must be kebab-case`);
  if (!/^[a-z0-9-]+$/.test(t.category)) errors.push(`${at}: category must be kebab-case`);
  if (t.description.length < 80 || t.description.length > 170) {
    errors.push(`${at}: description is ${t.description.length} chars, needs 80–170`);
  }
  if (t.keywords.length < 2) errors.push(`${at}: needs at least 2 target keywords`);
  if (t.faq.length < 4) errors.push(`${at}: needs at least 4 FAQ entries (Part 5.4 wants 5–8)`);
  if (t.howTo.length < 3) errors.push(`${at}: needs 3–5 how-to steps`);
  if (!t.infoGain.summary || t.infoGain.summary.trim().length < 60) {
    errors.push(`${at}: infoGain.summary must be a real 40–60 word paragraph`);
  }

  const hasEvidence =
    (t.infoGain.benchmarks?.length ?? 0) > 0 ||
    (t.infoGain.supports?.length ?? 0) > 0 ||
    (t.infoGain.limits?.length ?? 0) > 0 ||
    (t.infoGain.errors?.length ?? 0) > 0 ||
    t.infoGain.table !== undefined;
  if (!hasEvidence) {
    errors.push(`${at}: infoGain needs at least one of benchmarks/supports/limits/errors/table`);
  }

  if (scoreTotal(t.score) < 20) {
    errors.push(`${at}: score ${scoreTotal(t.score)}/50 — below the build threshold`);
  }

  const keys = new Set<string>();
  for (const o of t.options) {
    if (keys.has(o.key)) errors.push(`${at}: duplicate option key "${o.key}"`);
    keys.add(o.key);
  }

  /**
   * Scaffold placeholders must never reach a live page. Length checks
   * alone do not catch this: the generated TODO text is long enough to
   * pass every other rule in here, so without this a tool could be
   * flipped to `live` with nothing but instructions on it.
   *
   * Drafts are exempt — that is what draft is for.
   */
  if (t.status === 'live') {
    const copy = [
      t.name,
      t.tagline,
      t.description,
      t.cluster,
      ...t.keywords,
      ...t.howTo.flatMap((s) => [s.title, s.detail]),
      ...t.faq.flatMap((f) => [f.q, f.a]),
      t.infoGain.summary,
      ...(t.infoGain.supports ?? []),
      ...(t.infoGain.limits ?? []),
    ];
    if (copy.some((s) => s.startsWith('TODO') || s.includes('TODO-'))) {
      errors.push(`${at}: still contains scaffold placeholders — fill them in or set status to 'draft'`);
    }
  }

  return errors;
}
