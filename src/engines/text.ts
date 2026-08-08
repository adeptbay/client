/**
 * Text engine — pure, dependency-free string primitives.
 *
 * Part 6.3 rule 2: nothing here knows about a specific tool. These are
 * the reusable pieces; a tool composes them and adds nothing but
 * options handling.
 */

/* ── Counting ───────────────────────────────────────────────────── */

export interface TextCounts {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  /** Average adult silent reading speed, 238 wpm (Brysbaert 2019 meta-analysis). */
  readingSeconds: number;
  /** Average speaking rate, 150 wpm. */
  speakingSeconds: number;
  longestWord: string;
}

/**
 * Word segmentation uses Intl.Segmenter where available, which counts
 * CJK, Thai and Devanagari correctly. A whitespace split does not, and
 * a "word counter" that is wrong for half the planet is not a word
 * counter. Falls back to a Unicode-aware regex on older engines.
 */
export function countText(input: string): TextCounts {
  const characters = [...input].length;
  const charactersNoSpaces = [...input.replace(/\s/g, '')].length;

  const words = segmentWords(input);
  const longestWord = words.reduce((a, b) => (b.length > a.length ? b : a), '');

  // A sentence ends at . ! ? … or a CJK full stop, optionally quoted.
  const sentences = input.trim() ? (input.match(/[^.!?…。！？]+[.!?…。！？]*/g)?.length ?? 0) : 0;

  const paragraphs = input.trim() ? input.split(/\n\s*\n/).filter((p) => p.trim()).length : 0;
  const lines = input === '' ? 0 : input.split(/\r\n|\r|\n/).length;

  return {
    characters,
    charactersNoSpaces,
    words: words.length,
    sentences,
    paragraphs,
    lines,
    readingSeconds: Math.round((words.length / 238) * 60),
    speakingSeconds: Math.round((words.length / 150) * 60),
    longestWord,
  };
}

export function segmentWords(input: string): string[] {
  if (!input.trim()) return [];

  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const seg = new Intl.Segmenter(undefined, { granularity: 'word' });
    const out: string[] = [];
    for (const s of seg.segment(input)) if (s.isWordLike) out.push(s.segment);
    return out;
  }

  return input.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) ?? [];
}

/* ── Case conversion ────────────────────────────────────────────── */

export type CaseMode =
  | 'upper'
  | 'lower'
  | 'title'
  | 'sentence'
  | 'camel'
  | 'pascal'
  | 'snake'
  | 'kebab'
  | 'constant'
  | 'dot'
  | 'toggle'
  | 'alternating';

/** Words that stay lowercase inside a title, per Chicago style. */
const MINOR_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'into',
  'nor', 'of', 'off', 'on', 'onto', 'or', 'over', 'per', 'so', 'the', 'to',
  'up', 'via', 'vs', 'with', 'yet',
]);

const tokenize = (s: string): string[] =>
  s
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[\s_\-.]+/)
    .filter(Boolean);

const cap = (w: string): string => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

export function convertCase(input: string, mode: CaseMode): string {
  switch (mode) {
    case 'upper':
      return input.toUpperCase();
    case 'lower':
      return input.toLowerCase();

    case 'title':
      // Applied per line so a list of headings all get treated as titles.
      return input
        .split('\n')
        .map((line) => {
          const words = line.split(/(\s+)/);
          let seenWord = false;
          return words
            .map((w, i) => {
              if (!w.trim()) return w;
              const isLast = words.slice(i + 1).every((x) => !x.trim());
              const lower = w.toLowerCase();
              const minor = MINOR_WORDS.has(lower.replace(/[^a-z]/g, ''));
              const result = !seenWord || isLast || !minor ? cap(w) : lower;
              seenWord = true;
              return result;
            })
            .join('');
        })
        .join('\n');

    case 'sentence':
      return input
        .toLowerCase()
        .replace(/(^\s*\w|[.!?…]\s+\w|\n\s*\w)/g, (m) => m.toUpperCase());

    case 'camel': {
      const t = tokenize(input);
      return t.map((w, i) => (i === 0 ? w.toLowerCase() : cap(w))).join('');
    }
    case 'pascal':
      return tokenize(input).map(cap).join('');
    case 'snake':
      return tokenize(input).map((w) => w.toLowerCase()).join('_');
    case 'kebab':
      return tokenize(input).map((w) => w.toLowerCase()).join('-');
    case 'constant':
      return tokenize(input).map((w) => w.toUpperCase()).join('_');
    case 'dot':
      return tokenize(input).map((w) => w.toLowerCase()).join('.');

    case 'toggle':
      return [...input]
        .map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()))
        .join('');

    case 'alternating': {
      let i = 0;
      return [...input]
        .map((c) => {
          if (!/\p{L}/u.test(c)) return c;
          return i++ % 2 === 0 ? c.toLowerCase() : c.toUpperCase();
        })
        .join('');
    }
  }
}

/* ── Line operations ────────────────────────────────────────────── */

export interface LineOptions {
  caseSensitive?: boolean;
  trim?: boolean;
  ignoreEmpty?: boolean;
}

const lineKey = (line: string, o: LineOptions): string => {
  const s = o.trim === false ? line : line.trim();
  return o.caseSensitive ? s : s.toLowerCase();
};

export const splitLines = (input: string): string[] => input.split(/\r\n|\r|\n/);

export function dedupeLines(
  input: string,
  o: LineOptions & { keep?: 'first' | 'last' } = {},
): { lines: string[]; removed: number } {
  const lines = splitLines(input);
  const seen = new Map<string, number>();
  const out: string[] = [];

  for (const line of lines) {
    if (o.ignoreEmpty && !line.trim()) {
      out.push(line);
      continue;
    }
    const key = lineKey(line, o);
    if (!seen.has(key)) {
      seen.set(key, out.length);
      out.push(line);
    } else if (o.keep === 'last') {
      out[seen.get(key)!] = line;
    }
  }

  return { lines: out, removed: lines.length - out.length };
}

export type SortMode = 'alpha' | 'alpha-desc' | 'numeric' | 'numeric-desc' | 'length' | 'length-desc' | 'shuffle';

export function sortLines(input: string, mode: SortMode, o: LineOptions = {}): string[] {
  const lines = splitLines(input);
  const body = o.ignoreEmpty ? lines.filter((l) => l.trim()) : lines;
  const key = (l: string) => (o.caseSensitive ? l : l.toLowerCase());

  // Intl.Collator handles accents and non-Latin scripts the way a human
  // expects; String.localeCompare without options does not, reliably.
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'variant' });
  const num = (l: string) => {
    const m = l.match(/-?\d+(?:\.\d+)?/);
    return m ? parseFloat(m[0]) : Number.NaN;
  };

  const sorted = [...body];
  switch (mode) {
    case 'alpha':
      sorted.sort((a, b) => collator.compare(key(a), key(b)));
      break;
    case 'alpha-desc':
      sorted.sort((a, b) => collator.compare(key(b), key(a)));
      break;
    case 'numeric':
    case 'numeric-desc': {
      const dir = mode === 'numeric' ? 1 : -1;
      sorted.sort((a, b) => {
        const na = num(a);
        const nb = num(b);
        // Lines with no number sink to the bottom instead of scrambling.
        if (Number.isNaN(na) && Number.isNaN(nb)) return collator.compare(a, b);
        if (Number.isNaN(na)) return 1;
        if (Number.isNaN(nb)) return -1;
        return (na - nb) * dir;
      });
      break;
    }
    case 'length':
      sorted.sort((a, b) => a.length - b.length || collator.compare(a, b));
      break;
    case 'length-desc':
      sorted.sort((a, b) => b.length - a.length || collator.compare(a, b));
      break;
    case 'shuffle':
      for (let i = sorted.length - 1; i > 0; i--) {
        const j = secureIndex(i + 1);
        [sorted[i], sorted[j]] = [sorted[j]!, sorted[i]!];
      }
      break;
  }
  return sorted;
}

function secureIndex(bound: number): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0]! % bound;
  }
  return Math.floor(Math.random() * bound);
}

/* ── Slugs ──────────────────────────────────────────────────────── */

export interface SlugOptions {
  separator?: string;
  lowercase?: boolean;
  maxLength?: number;
  /** Strip English stop words — shorter, more keyword-dense URLs. */
  stripStopWords?: boolean;
}

const SLUG_STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'of', 'in', 'on', 'at', 'to', 'for',
  'with', 'is', 'are', 'was', 'were', 'be', 'by', 'from', 'as', 'that', 'this',
]);

export function slugify(input: string, o: SlugOptions = {}): string {
  const sep = o.separator ?? '-';
  // NFD splits "é" into "e" + combining accent, so the accent can be dropped
  // rather than the whole character. Keeps "café" → "cafe", not "caf".
  let s = input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[øØ]/g, 'o')
    .replace(/[ßẞ]/g, 'ss')
    .replace(/[æÆ]/g, 'ae');

  if (o.lowercase !== false) s = s.toLowerCase();

  let words = s.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  if (o.stripStopWords) {
    const kept = words.filter((w) => !SLUG_STOPWORDS.has(w.toLowerCase()));
    if (kept.length > 0) words = kept;
  }

  let slug = words.join(sep);
  if (o.maxLength && slug.length > o.maxLength) {
    slug = slug.slice(0, o.maxLength);
    const lastSep = slug.lastIndexOf(sep);
    if (lastSep > 0) slug = slug.slice(0, lastSep);
  }
  return slug;
}

/* ── Readability ────────────────────────────────────────────────── */

export interface Readability {
  fleschReadingEase: number;
  fleschKincaidGrade: number;
  gunningFog: number;
  syllables: number;
  complexWords: number;
  avgWordsPerSentence: number;
  avgSyllablesPerWord: number;
  label: string;
}

/** Heuristic English syllable count. Accurate to roughly ±1 on normal prose. */
export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length === 0) return 0;
  if (w.length <= 3) return 1;

  const trimmed = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
    .replace(/^y/, '');

  return trimmed.match(/[aeiouy]{1,2}/g)?.length || 1;
}

export function readability(input: string): Readability {
  const words = segmentWords(input).filter((w) => /[a-zA-Z]/.test(w));
  const sentences = Math.max(1, input.match(/[^.!?…]+[.!?…]+/g)?.length ?? 1);

  if (words.length === 0) {
    return {
      fleschReadingEase: 0, fleschKincaidGrade: 0, gunningFog: 0,
      syllables: 0, complexWords: 0, avgWordsPerSentence: 0,
      avgSyllablesPerWord: 0, label: 'No text',
    };
  }

  let syllables = 0;
  let complexWords = 0;
  for (const w of words) {
    const s = countSyllables(w);
    syllables += s;
    if (s >= 3) complexWords++;
  }

  const wps = words.length / sentences;
  const spw = syllables / words.length;

  const ease = 206.835 - 1.015 * wps - 84.6 * spw;
  const grade = 0.39 * wps + 11.8 * spw - 15.59;
  const fog = 0.4 * (wps + 100 * (complexWords / words.length));

  return {
    fleschReadingEase: round(ease, 1),
    fleschKincaidGrade: round(grade, 1),
    gunningFog: round(fog, 1),
    syllables,
    complexWords,
    avgWordsPerSentence: round(wps, 1),
    avgSyllablesPerWord: round(spw, 2),
    label: easeLabel(ease),
  };
}

function easeLabel(score: number): string {
  if (score >= 90) return 'Very easy — 5th grade';
  if (score >= 80) return 'Easy — 6th grade';
  if (score >= 70) return 'Fairly easy — 7th grade';
  if (score >= 60) return 'Plain English — 8th–9th grade';
  if (score >= 50) return 'Fairly difficult — 10th–12th grade';
  if (score >= 30) return 'Difficult — university';
  return 'Very difficult — postgraduate';
}

const round = (n: number, places: number): number => {
  const f = 10 ** places;
  return Math.round(n * f) / f;
};

/* ── Line diff ──────────────────────────────────────────────────── */

export interface DiffRow {
  kind: 'same' | 'add' | 'remove';
  left?: string;
  right?: string;
  leftNo?: number;
  rightNo?: number;
}

/**
 * Line-level diff via longest common subsequence.
 *
 * Common prefix and suffix are trimmed first. On real edits that
 * collapses the DP table by an order of magnitude, which is what keeps
 * a 5,000-line comparison inside a browser tab. Beyond the cell budget
 * the changed middle is reported as a whole-block replacement rather
 * than freezing the main thread.
 */
export function diffLines(a: string, b: string, maxCells = 4_000_000): DiffRow[] {
  const A = splitLines(a);
  const B = splitLines(b);

  let start = 0;
  while (start < A.length && start < B.length && A[start] === B[start]) start++;

  let endA = A.length;
  let endB = B.length;
  while (endA > start && endB > start && A[endA - 1] === B[endB - 1]) {
    endA--;
    endB--;
  }

  const rows: DiffRow[] = [];
  for (let i = 0; i < start; i++) {
    rows.push({ kind: 'same', left: A[i], right: B[i], leftNo: i + 1, rightNo: i + 1 });
  }

  const midA = A.slice(start, endA);
  const midB = B.slice(start, endB);

  if (midA.length * midB.length > maxCells) {
    midA.forEach((l, i) => rows.push({ kind: 'remove', left: l, leftNo: start + i + 1 }));
    midB.forEach((l, i) => rows.push({ kind: 'add', right: l, rightNo: start + i + 1 }));
  } else {
    rows.push(...lcsDiff(midA, midB, start));
  }

  for (let i = 0; i < A.length - endA; i++) {
    rows.push({
      kind: 'same',
      left: A[endA + i],
      right: B[endB + i],
      leftNo: endA + i + 1,
      rightNo: endB + i + 1,
    });
  }

  return rows;
}

function lcsDiff(A: string[], B: string[], offset: number): DiffRow[] {
  const n = A.length;
  const m = B.length;
  if (n === 0 && m === 0) return [];

  // (n+1) × (m+1) table of LCS lengths, flattened.
  const dp = new Uint32Array((n + 1) * (m + 1));
  const at = (i: number, j: number) => i * (m + 1) + j;

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[at(i, j)] =
        A[i] === B[j]
          ? dp[at(i + 1, j + 1)]! + 1
          : Math.max(dp[at(i + 1, j)]!, dp[at(i, j + 1)]!);
    }
  }

  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      rows.push({ kind: 'same', left: A[i], right: B[j], leftNo: offset + i + 1, rightNo: offset + j + 1 });
      i++;
      j++;
    } else if (dp[at(i + 1, j)]! >= dp[at(i, j + 1)]!) {
      rows.push({ kind: 'remove', left: A[i], leftNo: offset + i + 1 });
      i++;
    } else {
      rows.push({ kind: 'add', right: B[j], rightNo: offset + j + 1 });
      j++;
    }
  }
  for (; i < n; i++) rows.push({ kind: 'remove', left: A[i], leftNo: offset + i + 1 });
  for (; j < m; j++) rows.push({ kind: 'add', right: B[j], rightNo: offset + j + 1 });

  return rows;
}
