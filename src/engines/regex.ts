/**
 * Regular-expression engine.
 *
 * Competitor research: every online regex tester found runs the pattern
 * straight against the input. That is fine until someone pastes
 * `(a+)+$` — JavaScript's engine has no timeout, so the tab locks with
 * no message and no way out except closing it. The backtracking guard
 * written for the replace engine is reused here rather than copied, so
 * both tools refuse exactly the same set of patterns.
 *
 * The second difference is the read-out. A tester that reports "index
 * 4182" has told you a number, not a place. Every match here carries a
 * line and column resolved against the input, because that is what you
 * type into an editor's go-to-line box.
 */

import { assessRegexRisk, RegexRiskError } from './replace';

export interface RegexFlagSet {
  global: boolean;
  ignoreCase: boolean;
  multiline: boolean;
  dotAll: boolean;
  unicode: boolean;
}

export interface RegexCapture {
  /** 1-based position in the pattern; 0 is the whole match. */
  index: number;
  name?: string;
  /** `undefined` when the group took part in no alternative. */
  value?: string;
}

export interface RegexMatch {
  /** 1-based ordinal across the whole input. */
  n: number;
  /** Character offset from the start of the input. */
  index: number;
  line: number;
  column: number;
  text: string;
  captures: RegexCapture[];
}

export interface RegexReport {
  matches: RegexMatch[];
  /** Total found, which can exceed `matches.length` — see MATCH_LIMIT. */
  total: number;
  truncated: boolean;
  /** Capture groups the pattern declares, named and numbered, in order. */
  groups: GroupSpec[];
  /** True when at least one match consumed no characters. */
  hasEmptyMatch: boolean;
  flags: string;
}

/**
 * Rendering ten thousand rows is slower than finding them, and nobody
 * reads past the first screen. Matching continues past the limit so the
 * total count stays honest; only the collected rows stop.
 */
export const MATCH_LIMIT = 500;

/** Bigger than any paste, small enough that a bad pattern cannot stall. */
const MAX_INPUT = 2_000_000;

export function flagString(f: RegexFlagSet): string {
  return (
    (f.global ? 'g' : '') +
    (f.ignoreCase ? 'i' : '') +
    (f.multiline ? 'm' : '') +
    (f.dotAll ? 's' : '') +
    (f.unicode ? 'u' : '')
  );
}

/**
 * The capture groups a pattern declares, in source order, read out of
 * the pattern rather than out of a match.
 *
 * Reading them from results instead would silently drop the columns
 * that matter most. A group that took part in no alternative is absent
 * from `match.groups` and `undefined` in the positional array, so
 * `(?<protocol>https)|(?<scheme>ftp)` would look like a one-group
 * pattern on every line — and the empty column is exactly the signal
 * someone is debugging.
 *
 * Scanning the source is also the only way to bind a name to its
 * number. JavaScript gives named and numbered groups one shared
 * numbering, but `match.groups` is keyed by name only, so pairing them
 * up by value would mis-assign any two groups that matched the same
 * text.
 */
export interface GroupSpec {
  /** 1-based, matching the positional index in an exec() result. */
  index: number;
  name?: string;
}

export function groupSpecs(pattern: string): GroupSpec[] {
  const groups: GroupSpec[] = [];
  let inClass = false;

  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i]!;

    if (ch === '\\') {
      i++;
      continue;
    }
    if (inClass) {
      if (ch === ']') inClass = false;
      continue;
    }
    if (ch === '[') {
      inClass = true;
      continue;
    }
    if (ch !== '(') continue;

    if (pattern[i + 1] !== '?') {
      groups.push({ index: groups.length + 1 });
      continue;
    }

    // `(?<name>` captures. `(?<=` and `(?<!` are look-behind and do not,
    // and neither do `(?:`, `(?=` or `(?!`.
    const named = /^\(\?<([A-Za-z_$][\w$]*)>/.exec(pattern.slice(i));
    if (named) groups.push({ index: groups.length + 1, name: named[1] });
  }

  return groups;
}

export function compileRegex(pattern: string, flags: RegexFlagSet): RegExp {
  const risk = assessRegexRisk(pattern);
  if (risk) {
    throw new RegexRiskError(
      `This pattern is unsafe to run: it contains ${risk}.`,
      'On a long input it can take exponential time and freeze the page — JavaScript has no way to interrupt a running match. Rewrite it with a bounded quantifier, for example (a+) instead of (a+)+.',
    );
  }

  try {
    return new RegExp(pattern, flagString(flags));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    throw new RegexRiskError(
      `Not a valid regular expression: ${message}`,
      /Unterminated|Unmatched|nothing to repeat/i.test(message)
        ? 'Check for an unclosed bracket, brace or parenthesis, or a quantifier with nothing in front of it.'
        : 'Check the escapes. Inside a character class, "-" must be first, last or escaped; with the u flag, "\\d" and "\\w" are the only shorthand escapes allowed.',
    );
  }
}

/** Offsets at which each line starts, for turning an index into line:column. */
function lineStarts(input: string): number[] {
  const starts = [0];
  for (let i = 0; i < input.length; i++) if (input[i] === '\n') starts.push(i + 1);
  return starts;
}

/** Binary search — linear scanning per match is O(n·m) on a big file. */
function lineOf(starts: number[], index: number): number {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid]! <= index) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export function runRegex(
  input: string,
  pattern: string,
  flags: RegexFlagSet,
  limit = MATCH_LIMIT,
): RegexReport {
  if (input.length > MAX_INPUT) {
    throw new RegexRiskError(
      'That input is larger than 2 MB.',
      'Split it into smaller pieces. Browser regex on a file this size will stall the page whatever the pattern is.',
    );
  }

  const specs = groupSpecs(pattern);
  const report: RegexReport = {
    matches: [],
    total: 0,
    truncated: false,
    groups: specs,
    hasEmptyMatch: false,
    flags: flagString(flags),
  };

  if (pattern === '') return report;

  const re = compileRegex(pattern, flags);
  const starts = lineStarts(input);

  /**
   * `exec` in a loop rather than `matchAll`, for two reasons: a
   * non-global pattern must yield exactly one match rather than throw,
   * and a zero-width match needs `lastIndex` advanced by hand or the
   * loop never terminates. `/^/gm` against a 10,000-line file is the
   * everyday version of that, not a contrived one.
   */
  let match: RegExpExecArray | null;
  re.lastIndex = 0;

  while ((match = re.exec(input)) !== null) {
    report.total++;

    if (match[0] === '') report.hasEmptyMatch = true;

    if (report.matches.length < limit) {
      const line = lineOf(starts, match.index);
      const captures: RegexCapture[] = specs.map((spec) => ({
        index: spec.index,
        name: spec.name,
        value: match![spec.index],
      }));

      report.matches.push({
        n: report.matches.length + 1,
        index: match.index,
        line: line + 1,
        column: match.index - starts[line]! + 1,
        text: match[0],
        captures,
      });
    } else {
      report.truncated = true;
    }

    if (!re.global) break;
    if (match.index === re.lastIndex) re.lastIndex++;
    if (re.lastIndex > input.length) break;
  }

  return report;
}

export { RegexRiskError };
