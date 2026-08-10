/**
 * Whitespace and invisible-character engine.
 *
 * Competitor research: every "remove extra spaces" tool collapses runs
 * of U+0020 and stops there. The characters that actually break things
 * are the ones you cannot see — a non-breaking space pasted from Word
 * that stops a CSV parser splitting, a zero-width space from a CMS that
 * makes two identical-looking strings compare unequal, a BOM at the top
 * of a file that shows as "ï»¿" in the wrong reader.
 *
 * So this engine does not just strip. It classifies, counts, and can
 * render every offender visibly. That is the information gain, and it
 * is also just the more useful tool.
 */

export interface InvisibleChar {
  /** Code point, e.g. 0x00a0 */
  code: number;
  /** "U+00A0" */
  hex: string;
  name: string;
  /** Short marker used in reveal mode. */
  marker: string;
  /** Why it matters, in one line. */
  effect: string;
}

/**
 * The characters worth naming. Sourced from the Unicode general
 * categories Zs (space separator), Cf (format) and the specific control
 * characters that survive a copy-paste.
 */
export const INVISIBLE_CATALOGUE: InvisibleChar[] = [
  { code: 0x0009, hex: 'U+0009', name: 'Tab', marker: '→', effect: 'Indentation. Mixes badly with spaces in code and YAML.' },
  { code: 0x00a0, hex: 'U+00A0', name: 'Non-breaking space', marker: '⍽', effect: 'Looks like a space. Word and PDF paste it constantly; it breaks CSV splitting and URL slugs.' },
  { code: 0x200b, hex: 'U+200B', name: 'Zero-width space', marker: '·', effect: 'Completely invisible. Makes two identical-looking strings compare unequal.' },
  { code: 0x200c, hex: 'U+200C', name: 'Zero-width non-joiner', marker: '·', effect: 'Legitimate in Persian, Hindi and Bangla. Usually an artefact anywhere else.' },
  { code: 0x200d, hex: 'U+200D', name: 'Zero-width joiner', marker: '·', effect: 'Builds emoji sequences. Stray ones corrupt text silently.' },
  { code: 0x200e, hex: 'U+200E', name: 'Left-to-right mark', marker: '⇥', effect: 'Directional control. Pasted from RTL documents; reorders text unexpectedly.' },
  { code: 0x200f, hex: 'U+200F', name: 'Right-to-left mark', marker: '⇤', effect: 'Directional control. Same problem, opposite direction.' },
  { code: 0x2028, hex: 'U+2028', name: 'Line separator', marker: '¶', effect: 'Historically an unescaped-literal hazard in JavaScript string parsing.' },
  { code: 0x2029, hex: 'U+2029', name: 'Paragraph separator', marker: '¶', effect: 'Same family as U+2028.' },
  { code: 0x202f, hex: 'U+202F', name: 'Narrow no-break space', marker: '⍽', effect: 'French typography and some spreadsheets. Not a normal space.' },
  { code: 0x2060, hex: 'U+2060', name: 'Word joiner', marker: '·', effect: 'Invisible. Prevents line breaking where you did not ask for it.' },
  { code: 0x00ad, hex: 'U+00AD', name: 'Soft hyphen', marker: '-', effect: 'Invisible until the line wraps, then a hyphen appears from nowhere.' },
  { code: 0x3000, hex: 'U+3000', name: 'Ideographic space', marker: '⍽', effect: 'Full-width space from CJK input methods. Not U+0020.' },
  { code: 0xfeff, hex: 'U+FEFF', name: 'Byte order mark', marker: '⌐', effect: 'Shows as "ï»¿" in readers that expect no BOM. Breaks the first CSV header.' },
];

const BY_CODE = new Map(INVISIBLE_CATALOGUE.map((c) => [c.code, c]));

/** Every space-like character, including the exotic ones. */
const SPACE_LIKE = new Set([
  0x0020, 0x00a0, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005,
  0x2006, 0x2007, 0x2008, 0x2009, 0x200a, 0x202f, 0x205f, 0x3000,
]);

/** Truly invisible: removing them never changes rendered width. */
const ZERO_WIDTH = new Set([0x200b, 0x200c, 0x200d, 0x2060, 0xfeff, 0x00ad, 0x200e, 0x200f]);

export interface DetectedChar {
  char: InvisibleChar;
  count: number;
  /** 1-based line numbers, first five occurrences. */
  lines: number[];
}

/** Find every non-plain whitespace and invisible character, with locations. */
export function detectInvisible(input: string): DetectedChar[] {
  const found = new Map<number, DetectedChar>();
  let line = 1;

  for (const ch of input) {
    const code = ch.codePointAt(0)!;

    if (ch === '\n') {
      line++;
      continue;
    }

    const known = BY_CODE.get(code);
    if (!known) continue;

    const entry = found.get(code) ?? { char: known, count: 0, lines: [] };
    entry.count++;
    if (entry.lines.length < 5 && !entry.lines.includes(line)) entry.lines.push(line);
    found.set(code, entry);
  }

  return [...found.values()].sort((a, b) => b.count - a.count);
}

export type LineEnding = 'lf' | 'crlf' | 'cr' | 'mixed' | 'none';

export function detectLineEnding(input: string): LineEnding {
  const crlf = (input.match(/\r\n/g) ?? []).length;
  const lf = (input.match(/(?<!\r)\n/g) ?? []).length;
  const cr = (input.match(/\r(?!\n)/g) ?? []).length;

  const kinds = [crlf, lf, cr].filter((n) => n > 0).length;
  if (kinds === 0) return 'none';
  if (kinds > 1) return 'mixed';
  if (crlf > 0) return 'crlf';
  if (lf > 0) return 'lf';
  return 'cr';
}

export interface CleanOptions {
  /** Collapse runs of spaces and tabs to a single space. */
  collapseSpaces: boolean;
  /** Strip leading and trailing whitespace from every line. */
  trimLines: boolean;
  /** Collapse three or more newlines to two (one blank line). */
  collapseBlankLines: boolean;
  /** Remove blank lines entirely. */
  removeBlankLines: boolean;
  /** Convert exotic spaces (NBSP, ideographic, narrow) to a plain space. */
  normaliseSpaces: boolean;
  /** Delete zero-width and directional characters. */
  removeZeroWidth: boolean;
  /** Convert tabs to spaces. 0 leaves tabs alone. */
  tabsToSpaces: number;
  /** Straighten curly quotes, em/en dashes and ellipsis to ASCII. */
  normalisePunctuation: boolean;
  /** Normalise every line ending to \n. */
  normaliseLineEndings: boolean;
}

/** Smart punctuation that arrives with a Word or Google Docs paste. */
const PUNCTUATION: [RegExp, string][] = [
  [/[‘’‚‛]/g, "'"],
  [/[“”„‟]/g, '"'],
  [/[–—]/g, '-'],
  [/…/g, '...'],
  [/ /g, ' '],
];

export function cleanWhitespace(input: string, o: CleanOptions): string {
  let text = input;

  if (o.normaliseLineEndings) text = text.replace(/\r\n|\r/g, '\n');

  if (o.removeZeroWidth) {
    text = [...text].filter((ch) => !ZERO_WIDTH.has(ch.codePointAt(0)!)).join('');
  }

  if (o.normaliseSpaces) {
    text = [...text]
      .map((ch) => (SPACE_LIKE.has(ch.codePointAt(0)!) && ch !== ' ' ? ' ' : ch))
      .join('');
  }

  if (o.normalisePunctuation) {
    for (const [pattern, replacement] of PUNCTUATION) text = text.replace(pattern, replacement);
  }

  if (o.tabsToSpaces > 0) text = text.replace(/\t/g, ' '.repeat(o.tabsToSpaces));

  // Collapse before trimming: "a  \n  b" should become "a\nb", and doing
  // it in the other order leaves a stray space at each line end.
  if (o.collapseSpaces) text = text.replace(/[^\S\r\n]{2,}/g, ' ');

  if (o.trimLines) {
    text = text
      .split('\n')
      .map((l) => l.trim())
      .join('\n');
  }

  if (o.removeBlankLines) {
    text = text
      .split('\n')
      .filter((l) => l.trim() !== '')
      .join('\n');
  } else if (o.collapseBlankLines) {
    text = text.replace(/\n{3,}/g, '\n\n');
  }

  return text;
}

/**
 * Render invisible characters as visible markers.
 *
 * The single most useful mode in this tool: it turns "why does this
 * line not match" into something you can see. Markers are chosen to be
 * distinguishable from ordinary text in a monospace face.
 */
export function reveal(input: string, showSpaces: boolean): string {
  let out = '';

  for (const ch of input) {
    const code = ch.codePointAt(0)!;

    if (ch === '\n') {
      out += '¶\n';
    } else if (ch === '\r') {
      out += '␍';
    } else if (ch === ' ') {
      out += showSpaces ? '·' : ' ';
    } else if (BY_CODE.has(code)) {
      // Name the character inline; a bare marker tells you something is
      // there but not what, and "what" is the whole question.
      out += `⟦${BY_CODE.get(code)!.hex}⟧`;
    } else {
      out += ch;
    }
  }

  return out;
}
