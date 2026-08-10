/**
 * Frequency-analysis engine.
 *
 * Two audiences use this tool and every competitor serves only one:
 *
 *   · Cryptography and puzzle solvers, who need letter frequency
 *     compared against the English baseline to break a substitution
 *     cipher. The baseline comparison is the whole job, and no online
 *     counter provides it.
 *   · SEO and writers, who need word and phrase frequency with a
 *     density percentage.
 *
 * Both get the Unicode category breakdown, which is what tells you the
 * text contains 4 emoji and 12 pieces of punctuation you did not expect.
 */

import { graphemes, segmentWords } from './text';

/**
 * Relative letter frequency in English text, as a percentage.
 *
 * From Robert Lewand's *Cryptological Mathematics* (2000), the figures
 * conventionally used in classical cryptanalysis. Sums to ~100.
 */
export const ENGLISH_LETTER_FREQUENCY: Record<string, number> = {
  e: 12.02, t: 9.10, a: 8.12, o: 7.68, i: 7.31, n: 6.95, s: 6.28, r: 6.02,
  h: 5.92, d: 4.32, l: 3.98, u: 2.88, c: 2.71, m: 2.61, f: 2.30, y: 2.11,
  w: 2.09, g: 2.03, p: 1.82, b: 1.49, v: 1.11, k: 0.69, x: 0.17, q: 0.11,
  j: 0.10, z: 0.07,
};

export interface FrequencyRow {
  item: string;
  count: number;
  percent: number;
  /** Percentage points above or below the English baseline. Letters only. */
  deviation?: number;
}

export interface CategoryBreakdown {
  letters: number;
  digits: number;
  punctuation: number;
  whitespace: number;
  symbols: number;
  emoji: number;
  other: number;
}

const round = (n: number, places = 2): number => {
  const f = 10 ** places;
  return Math.round(n * f) / f;
};

/** Classify by Unicode property, not by an ASCII range. */
export function categorise(input: string): CategoryBreakdown {
  const out: CategoryBreakdown = {
    letters: 0, digits: 0, punctuation: 0, whitespace: 0, symbols: 0, emoji: 0, other: 0,
  };

  for (const g of graphemes(input)) {
    // Emoji first: many also match \p{S}, so testing symbols first would
    // swallow them.
    if (/\p{Extended_Pictographic}/u.test(g)) out.emoji++;
    else if (/^\p{L}$/u.test(g) || /^\p{L}\p{M}*$/u.test(g)) out.letters++;
    else if (/^\p{Nd}$/u.test(g)) out.digits++;
    else if (/^\s$/u.test(g)) out.whitespace++;
    else if (/^\p{P}$/u.test(g)) out.punctuation++;
    else if (/^\p{S}$/u.test(g)) out.symbols++;
    else out.other++;
  }

  return out;
}

export interface CharFrequencyOptions {
  caseSensitive: boolean;
  /** Count only letters — the mode you want for cipher analysis. */
  lettersOnly: boolean;
  includeWhitespace: boolean;
}

export function characterFrequency(input: string, o: CharFrequencyOptions): FrequencyRow[] {
  const counts = new Map<string, number>();
  let total = 0;

  for (const g of graphemes(input)) {
    if (!o.includeWhitespace && /^\s$/u.test(g)) continue;
    if (o.lettersOnly && !/^\p{L}/u.test(g)) continue;

    const key = o.caseSensitive ? g : g.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
    total++;
  }

  return [...counts.entries()]
    .map(([item, count]) => {
      const percent = total === 0 ? 0 : round((count / total) * 100);
      const baseline = ENGLISH_LETTER_FREQUENCY[item.toLowerCase()];
      return {
        item,
        count,
        percent,
        deviation: baseline === undefined ? undefined : round(percent - baseline),
      };
    })
    .sort((a, b) => b.count - a.count || a.item.localeCompare(b.item));
}

export interface WordFrequencyOptions {
  caseSensitive: boolean;
  minLength: number;
  removeStopWords: boolean;
  /** 1 = words, 2 = two-word phrases, 3 = three-word phrases. */
  ngram: number;
}

/** The words that dominate any English frequency list and mean nothing. */
const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for',
  'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his',
  'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my',
  'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if',
  'about', 'who', 'get', 'which', 'go', 'me', 'is', 'was', 'are', 'been',
  'has', 'had', 'were', 'can', 'said', 'use', 'its', 'our', 'am', 'no',
]);

export function wordFrequency(input: string, o: WordFrequencyOptions): FrequencyRow[] {
  let words = segmentWords(input).map((w) => (o.caseSensitive ? w : w.toLowerCase()));

  if (o.removeStopWords) words = words.filter((w) => !STOP_WORDS.has(w.toLowerCase()));
  if (o.minLength > 1) words = words.filter((w) => w.length >= o.minLength);

  const n = Math.max(1, Math.min(3, o.ngram));
  const items: string[] = [];

  if (n === 1) {
    items.push(...words);
  } else {
    for (let i = 0; i + n <= words.length; i++) items.push(words.slice(i, i + n).join(' '));
  }

  const counts = new Map<string, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);

  const total = items.length;

  return [...counts.entries()]
    .map(([item, count]) => ({
      item,
      count,
      percent: total === 0 ? 0 : round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count || a.item.localeCompare(b.item));
}

/**
 * Index of coincidence.
 *
 * The probability that two letters drawn at random from the text are
 * the same. English prose sits near 0.067; uniformly random text near
 * 0.038. It is the standard first test for whether a ciphertext came
 * from a simple substitution (IC stays near English) or a polyalphabetic
 * cipher like Vigenère (IC drops toward random).
 */
export function indexOfCoincidence(input: string): number {
  const letters = input.toLowerCase().replace(/[^a-z]/g, '');
  const n = letters.length;
  if (n < 2) return 0;

  const counts = new Map<string, number>();
  for (const ch of letters) counts.set(ch, (counts.get(ch) ?? 0) + 1);

  let sum = 0;
  for (const c of counts.values()) sum += c * (c - 1);

  return round(sum / (n * (n - 1)), 4);
}

export const IC_ENGLISH = 0.0667;
export const IC_RANDOM = 0.0385;
