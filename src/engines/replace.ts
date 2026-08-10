/**
 * Find-and-replace engine.
 *
 * Competitor research: regex, capture groups and live preview are
 * table stakes — a dozen tools have them. Two things none of them do:
 *
 *   1. **Rule chains.** Real cleanup is never one substitution. It is
 *      "strip the prefix, then collapse the separators, then fix the
 *      casing" — three rules, in order, each seeing the previous one's
 *      output. Every tool found makes you run them one at a time.
 *   2. **A backtracking guard.** JavaScript regex has no timeout. Paste
 *      `(a+)+$` and a long string into any of those tools and the tab
 *      locks up with no explanation. We refuse the pattern instead.
 */

export interface ReplaceRule {
  find: string;
  replace: string;
}

export interface ReplaceOptions {
  regex: boolean;
  caseSensitive: boolean;
  wholeWord: boolean;
  /** Replace only the first match rather than all of them. */
  firstOnly: boolean;
}

export class RegexRiskError extends Error {
  readonly hint: string;
  constructor(message: string, hint: string) {
    super(message);
    this.name = 'RegexRiskError';
    this.hint = hint;
  }
}

/**
 * Heuristic check for catastrophic backtracking.
 *
 * It looks for a quantifier applied to a group that itself contains an
 * unbounded quantifier or an alternation — the shape behind almost
 * every real-world ReDoS. This is a heuristic, not a proof: it will
 * miss exotic constructions and can occasionally refuse a safe pattern.
 * Refusing to run is still the right default, because the failure mode
 * it prevents is an unrecoverable frozen tab.
 */
export function assessRegexRisk(pattern: string): string | null {
  // (x+)+  (x*)*  (x+)*  (x*)+  and the {n,} equivalents
  if (/\([^()]*[+*]\s*\)\s*[+*{]/.test(pattern)) {
    return 'a quantifier applied to a group that already repeats — for example (a+)+';
  }
  // (a|a)* — alternation under a quantifier, the other classic shape
  if (/\([^()]*\|[^()]*\)\s*[+*]/.test(pattern) && /[+*]/.test(pattern.replace(/\([^()]*\)/, ''))) {
    return 'an alternation inside a repeated group, which can backtrack exponentially';
  }
  // Nested unbounded quantifiers without a group, e.g. .*.*.*
  if (/(\.\*){3,}|(\.\+){3,}/.test(pattern)) {
    return 'several unbounded wildcards in sequence';
  }
  return null;
}

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Build the RegExp for one rule, validating it first. */
export function buildPattern(rule: ReplaceRule, o: ReplaceOptions): RegExp {
  let source: string;

  if (o.regex) {
    const risk = assessRegexRisk(rule.find);
    if (risk) {
      throw new RegexRiskError(
        `This pattern is unsafe to run: it contains ${risk}.`,
        'On a long input it can take exponential time and freeze the page. Rewrite it with a bounded quantifier — for example (a+) instead of (a+)+ — or turn regex mode off.',
      );
    }
    source = rule.find;
  } else {
    source = escapeRegex(rule.find);
  }

  if (o.wholeWord) {
    // \b is wrong for scripts without ASCII word boundaries, so anchor on
    // "not a letter or digit" instead, which behaves for Unicode text.
    source = `(?<![\\p{L}\\p{N}])(?:${source})(?![\\p{L}\\p{N}])`;
  }

  const flags = `u${o.firstOnly ? '' : 'g'}${o.caseSensitive ? '' : 'i'}`;

  try {
    return new RegExp(source, flags);
  } catch (err) {
    // The `u` flag rejects some legacy escapes; retry without it rather
    // than failing a pattern that would have worked.
    try {
      return new RegExp(source, flags.replace('u', ''));
    } catch {
      throw new RegexRiskError(
        `Not a valid regular expression: ${err instanceof Error ? err.message : 'unknown error'}`,
        'Check for an unclosed bracket or parenthesis, or an unescaped special character.',
      );
    }
  }
}

export interface RuleOutcome {
  rule: ReplaceRule;
  matches: number;
  error?: string;
}

export interface ReplaceResult {
  output: string;
  outcomes: RuleOutcome[];
  totalMatches: number;
  /** Line numbers where at least one replacement happened, first 20. */
  changedLines: number[];
}

const MAX_INPUT = 5_000_000; // 5 MB of text — well past any paste

/**
 * Apply rules in order. Each rule sees the previous rule's output,
 * which is what makes a chain useful and also what makes rule order
 * matter — the tool says so on the page.
 */
export function applyRules(
  input: string,
  rules: ReplaceRule[],
  o: ReplaceOptions,
): ReplaceResult {
  if (input.length > MAX_INPUT) {
    throw new RegexRiskError(
      'That input is larger than 5 MB.',
      'Split it into smaller pieces. Browser regex on a file this size will stall the page whatever the pattern is.',
    );
  }

  const before = input.split('\n');
  let output = input;
  const outcomes: RuleOutcome[] = [];
  let totalMatches = 0;

  for (const rule of rules) {
    if (rule.find === '') {
      outcomes.push({ rule, matches: 0, error: 'empty search' });
      continue;
    }

    try {
      const pattern = buildPattern(rule, o);
      const matches = (output.match(pattern) ?? []).length;

      // Reset lastIndex: a /g/ RegExp is stateful and reusing one after
      // .match() would start the replace from the wrong offset.
      pattern.lastIndex = 0;
      output = output.replace(pattern, rule.replace);

      outcomes.push({ rule, matches });
      totalMatches += matches;
    } catch (err) {
      outcomes.push({
        rule,
        matches: 0,
        error: err instanceof Error ? err.message : 'invalid pattern',
      });
      if (err instanceof RegexRiskError) throw err;
    }
  }

  const after = output.split('\n');
  const changedLines: number[] = [];
  for (let i = 0; i < Math.max(before.length, after.length) && changedLines.length < 20; i++) {
    if (before[i] !== after[i]) changedLines.push(i + 1);
  }

  return { output, outcomes, totalMatches, changedLines };
}

/**
 * Parse a rule list. One rule per line, `find => replace`.
 *
 * `=>` rather than a tab or a comma because both of those appear inside
 * the strings people are actually replacing.
 */
export function parseRuleList(source: string): ReplaceRule[] {
  return source
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map((line) => {
      const at = line.indexOf('=>');
      if (at === -1) return { find: line, replace: '' };
      return {
        find: line.slice(0, at).trim(),
        replace: line.slice(at + 2).trim(),
      };
    });
}
