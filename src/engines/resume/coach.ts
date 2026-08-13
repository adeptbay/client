/**
 * Inline coaching for the builder.
 *
 * ── Why this shares the checker's vocabulary ────────────────────────
 *
 * The builder and the checker are one product with two doors. If the
 * builder accepted a bullet that the checker then marked down, the user
 * would be told to fix something the same site had just helped them
 * write — which is worse than either tool alone, because it destroys
 * trust in both numbers.
 *
 * So this imports the identical word lists and the identical bullet
 * analysis. There is no second opinion here: it is the checker's rules,
 * applied one field at a time, while the field is still being typed.
 *
 * ── What it deliberately does not do ────────────────────────────────
 *
 * It never blocks, never auto-corrects and never scores. A hint sits
 * next to the input and can be ignored — this is someone's career
 * history, and a builder that refuses input it disagrees with is a
 * builder that loses the true thing the user was trying to say.
 */

import { analyseBullet } from './parse';
import { CLICHE_CLAIMS, HEDGE_WORDS } from './vocabulary';

export interface Hint {
  /** `warn` is worth fixing; `tip` is a nudge. Nothing here is an error. */
  level: 'warn' | 'tip';
  text: string;
}

/**
 * Hints for one achievement bullet, most valuable first, capped at two.
 *
 * Two is the limit because a field wearing four warnings is a field
 * people delete rather than improve.
 */
export function bulletHints(text: string): Hint[] {
  const trimmed = text.trim();
  if (trimmed.length < 12) return [];

  const bullet = analyseBullet(trimmed, -1);
  const hints: Hint[] = [];

  if (bullet.weakOpener !== null) {
    hints.push({
      level: 'warn',
      text: `"${bullet.weakOpener}" describes the job, not what you did. Start at the verb.`,
    });
  } else if (!bullet.startsWithAction) {
    hints.push({
      level: 'warn',
      text: 'Open with a past-tense verb — Led, Built, Cut, Shipped, Negotiated.',
    });
  }

  if (!bullet.quantified) {
    hints.push({
      level: 'warn',
      text: 'No number. Add how many, how much, how fast, or from what to what.',
    });
  }

  if (hints.length < 2) {
    if (bullet.firstPerson) {
      hints.push({ level: 'tip', text: 'Drop "I" and "my" — CV convention omits the pronoun.' });
    } else if (bullet.words > 34) {
      hints.push({ level: 'tip', text: `${bullet.words} words. Aim for 12–28, one idea each.` });
    } else if (bullet.hedges.length > 0) {
      hints.push({
        level: 'tip',
        text: `"${bullet.hedges[0]}" is doing a number's job. Replace it with the figure.`,
      });
    }
  }

  return hints.slice(0, 2);
}

/** Hints for the summary paragraph. */
export function summaryHints(text: string): Hint[] {
  const trimmed = text.trim();
  if (trimmed.length < 30) return [];

  const lower = ` ${trimmed.toLowerCase()} `;
  const hints: Hint[] = [];

  const cliche = CLICHE_CLAIMS.find((c) => lower.includes(c));
  if (cliche !== undefined) {
    hints.push({
      level: 'warn',
      text: `"${cliche}" appears on almost every CV, so it carries no information. Put the evidence there instead.`,
    });
  }

  if (!/\d/.test(trimmed)) {
    hints.push({
      level: 'warn',
      text: 'No figure anywhere. One number here is what makes the first three lines land.',
    });
  }

  if (hints.length < 2) {
    const words = trimmed.split(/\s+/).length;
    if (words > 90) {
      hints.push({ level: 'tip', text: `${words} words. Three sentences is the most that gets read.` });
    } else if (/^i\b|\bmy\b/i.test(trimmed)) {
      hints.push({ level: 'tip', text: 'Drop "I" and "my".' });
    } else {
      const hedge = HEDGE_WORDS.find((h) => lower.includes(` ${h} `));
      if (hedge !== undefined) {
        hints.push({ level: 'tip', text: `"${hedge}" weakens the claim without shortening it.` });
      }
    }
  }

  return hints.slice(0, 2);
}
