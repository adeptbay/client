/**
 * Numeric engine.
 *
 * Calculators here always return the working alongside the answer.
 * Someone using a percentage calculator usually has to justify the
 * number to a boss, a teacher or a client — showing the formula is the
 * information gain, and it costs nothing.
 */

export interface Solved {
  value: number;
  formatted: string;
  /** Human-readable substitution, e.g. "18 ÷ 200 × 100 = 9%". */
  working: string;
}

export type PercentMode =
  | 'of'          // What is X% of Y?
  | 'is-what'     // X is what percent of Y?
  | 'change'      // From X to Y, what is the change?
  | 'add'         // Increase X by Y%
  | 'subtract'    // Decrease X by Y%
  | 'total';      // X is Y% of what?

export const PERCENT_QUESTIONS: Record<PercentMode, string> = {
  of: 'What is A% of B?',
  'is-what': 'A is what percent of B?',
  change: 'What is the percentage change from A to B?',
  add: 'Increase A by B%',
  subtract: 'Decrease A by B%',
  total: 'A is B% of what number?',
};

const fmt = (n: number, places = 4): string => {
  if (!Number.isFinite(n)) return '—';
  const rounded = Number(n.toFixed(places));
  return rounded.toLocaleString('en-US', { maximumFractionDigits: places });
};

export function percent(mode: PercentMode, a: number, b: number): Solved {
  switch (mode) {
    case 'of': {
      const value = (a / 100) * b;
      return { value, formatted: fmt(value), working: `${fmt(a)}% × ${fmt(b)} = ${fmt(a)} ÷ 100 × ${fmt(b)} = ${fmt(value)}` };
    }
    case 'is-what': {
      if (b === 0) throw new Error('B cannot be zero — nothing is a percentage of nothing.');
      const value = (a / b) * 100;
      return { value, formatted: `${fmt(value)}%`, working: `${fmt(a)} ÷ ${fmt(b)} × 100 = ${fmt(value)}%` };
    }
    case 'change': {
      if (a === 0) throw new Error('A cannot be zero — percentage change from zero is undefined.');
      const value = ((b - a) / Math.abs(a)) * 100;
      const dir = value >= 0 ? 'increase' : 'decrease';
      return {
        value,
        formatted: `${fmt(Math.abs(value))}% ${dir}`,
        working: `(${fmt(b)} − ${fmt(a)}) ÷ |${fmt(a)}| × 100 = ${fmt(value)}%`,
      };
    }
    case 'add': {
      const value = a * (1 + b / 100);
      return { value, formatted: fmt(value), working: `${fmt(a)} × (1 + ${fmt(b)} ÷ 100) = ${fmt(value)}` };
    }
    case 'subtract': {
      const value = a * (1 - b / 100);
      return { value, formatted: fmt(value), working: `${fmt(a)} × (1 − ${fmt(b)} ÷ 100) = ${fmt(value)}` };
    }
    case 'total': {
      if (b === 0) throw new Error('B cannot be zero — you cannot solve for a total from 0%.');
      const value = (a / b) * 100;
      return { value, formatted: fmt(value), working: `${fmt(a)} ÷ ${fmt(b)} × 100 = ${fmt(value)}` };
    }
  }
}

/**
 * Percentage points versus percent — the mistake that costs people the
 * most. Going from 5% to 6% is +1 percentage point and +20 percent.
 */
export function percentagePointDelta(from: number, to: number): { points: number; relative: number } {
  return {
    points: to - from,
    relative: from === 0 ? Number.NaN : ((to - from) / Math.abs(from)) * 100,
  };
}

export const formatNumber = fmt;
