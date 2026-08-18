/**
 * Structural JSON comparison.
 *
 * A text diff answers "which lines differ". On JSON that is the wrong
 * question, and it produces two kinds of false answer every day:
 *
 *   · **False positives.** Reserialise the same object with a different
 *     key order, or two-space indentation instead of four, and a line
 *     diff reports the whole file as changed. Nothing changed.
 *   · **False negatives, in effect.** One added array element shifts
 *     every line below it, so the one real change is buried in three
 *     hundred spurious ones.
 *
 * This compares the parsed values instead. Key order and whitespace are
 * invisible by construction; the output is a list of paths, which is
 * what you paste into a bug report. It also separates a *type* change
 * from a *value* change, because `"1"` becoming `1` is the bug that
 * breaks a strict equality check three services downstream, and a line
 * diff shows it as an ordinary edit.
 */

export type ChangeKind = 'added' | 'removed' | 'changed' | 'type';

export interface JsonChange {
  kind: ChangeKind;
  /** JSONPath-style location, e.g. `$.users[2].email`. */
  path: string;
  left?: string;
  right?: string;
  leftType?: string;
  rightType?: string;
}

export interface JsonDiffOptions {
  /** Compare arrays as multisets, so a reordered list is unchanged. */
  ignoreArrayOrder: boolean;
  /** Compare string values without regard to case. */
  ignoreCase: boolean;
  /** Treat `"5"` and `5` as equal — for APIs that stringify numbers. */
  looseTypes: boolean;
}

export interface JsonDiffReport {
  changes: JsonChange[];
  added: number;
  removed: number;
  changed: number;
  typeChanged: number;
  /** Leaf values that matched. */
  unchanged: number;
  identical: boolean;
  truncated: boolean;
}

/** Past this the list stops being readable and starts being a file. */
const CHANGE_LIMIT = 2000;

const VALUE_MAX = 90;

export function typeName(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

export function renderValue(v: unknown): string {
  if (v === undefined) return '—';
  const raw = typeof v === 'string' ? JSON.stringify(v) : JSON.stringify(v) ?? String(v);
  return raw.length > VALUE_MAX ? `${raw.slice(0, VALUE_MAX - 1)}…` : raw;
}

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

const childPath = (parent: string, key: string): string =>
  IDENTIFIER.test(key) ? `${parent}.${key}` : `${parent}[${JSON.stringify(key)}]`;

/**
 * Order-independent form, used both to compare leaves under
 * `ignoreArrayOrder` and to test deep equality cheaply. Keys are sorted,
 * so `{a:1,b:2}` and `{b:2,a:1}` produce the same string.
 */
function canonical(value: unknown, o: JsonDiffOptions): string {
  if (value === null || typeof value !== 'object') return leafKey(value, o);
  if (Array.isArray(value)) {
    const parts = value.map((v) => canonical(v, o));
    if (o.ignoreArrayOrder) parts.sort();
    return `[${parts.join(',')}]`;
  }
  return `{${Object.keys(value as Record<string, unknown>)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k], o)}`)
    .join(',')}}`;
}

function leafKey(value: unknown, o: JsonDiffOptions): string {
  if (o.looseTypes && (typeof value === 'number' || typeof value === 'boolean')) {
    return JSON.stringify(String(value));
  }
  if (typeof value === 'string') {
    return JSON.stringify(o.ignoreCase ? value.toLowerCase() : value);
  }
  return JSON.stringify(value) ?? 'undefined';
}

function leavesEqual(a: unknown, b: unknown, o: JsonDiffOptions): boolean {
  return leafKey(a, o) === leafKey(b, o);
}

export function diffJson(left: unknown, right: unknown, o: JsonDiffOptions): JsonDiffReport {
  const changes: JsonChange[] = [];
  let unchanged = 0;
  let truncated = false;

  const record = (change: JsonChange): void => {
    if (changes.length >= CHANGE_LIMIT) {
      truncated = true;
      return;
    }
    changes.push(change);
  };

  const walk = (a: unknown, b: unknown, path: string): void => {
    if (truncated) return;

    const ta = typeName(a);
    const tb = typeName(b);

    // A type change is reported once, at the point it happens, rather
    // than as a cascade of additions and removals underneath it.
    if (ta !== tb) {
      if (o.looseTypes && leavesEqual(a, b, o)) {
        unchanged++;
        return;
      }
      record({ kind: 'type', path, left: renderValue(a), right: renderValue(b), leftType: ta, rightType: tb });
      return;
    }

    if (ta === 'object') {
      const objA = a as Record<string, unknown>;
      const objB = b as Record<string, unknown>;
      const keys = new Set([...Object.keys(objA), ...Object.keys(objB)]);

      for (const key of keys) {
        const at = childPath(path, key);
        if (!(key in objA)) record({ kind: 'added', path: at, right: renderValue(objB[key]), rightType: typeName(objB[key]) });
        else if (!(key in objB)) record({ kind: 'removed', path: at, left: renderValue(objA[key]), leftType: typeName(objA[key]) });
        else walk(objA[key], objB[key], at);
      }
      return;
    }

    if (ta === 'array') {
      const arrA = a as unknown[];
      const arrB = b as unknown[];

      if (o.ignoreArrayOrder) {
        /**
         * Multiset comparison. Elements are matched by canonical form,
         * so a reordered list is silent and a genuinely added element
         * still reports — but without an index, because under this
         * option an index is not a meaningful location.
         */
        const pool = new Map<string, number>();
        for (const item of arrB) {
          const key = canonical(item, o);
          pool.set(key, (pool.get(key) ?? 0) + 1);
        }

        const surplus: unknown[] = [];
        for (const item of arrA) {
          const key = canonical(item, o);
          const held = pool.get(key) ?? 0;
          if (held > 0) {
            pool.set(key, held - 1);
            unchanged++;
          } else {
            surplus.push(item);
          }
        }

        for (const item of surplus) {
          record({ kind: 'removed', path: `${path}[]`, left: renderValue(item), leftType: typeName(item) });
        }
        for (const [key, count] of pool) {
          for (let i = 0; i < count; i++) {
            record({ kind: 'added', path: `${path}[]`, right: key.length > VALUE_MAX ? `${key.slice(0, VALUE_MAX - 1)}…` : key });
          }
        }
        return;
      }

      const shared = Math.min(arrA.length, arrB.length);
      for (let i = 0; i < shared; i++) walk(arrA[i], arrB[i], `${path}[${i}]`);

      for (let i = shared; i < arrA.length; i++) {
        record({ kind: 'removed', path: `${path}[${i}]`, left: renderValue(arrA[i]), leftType: typeName(arrA[i]) });
      }
      for (let i = shared; i < arrB.length; i++) {
        record({ kind: 'added', path: `${path}[${i}]`, right: renderValue(arrB[i]), rightType: typeName(arrB[i]) });
      }
      return;
    }

    if (leavesEqual(a, b, o)) unchanged++;
    else record({ kind: 'changed', path, left: renderValue(a), right: renderValue(b), leftType: ta, rightType: tb });
  };

  walk(left, right, '$');

  const count = (kind: ChangeKind) => changes.filter((c) => c.kind === kind).length;

  return {
    changes,
    added: count('added'),
    removed: count('removed'),
    changed: count('changed'),
    typeChanged: count('type'),
    unchanged,
    identical: changes.length === 0,
    truncated,
  };
}

/** One line per change, in the shape people paste into a review comment. */
export function formatChanges(changes: JsonChange[]): string {
  const symbol: Record<ChangeKind, string> = {
    added: '+',
    removed: '−',
    changed: '~',
    type: '!',
  };

  return changes
    .map((c) => {
      switch (c.kind) {
        case 'added':
          return `${symbol.added} ${c.path}: ${c.right}`;
        case 'removed':
          return `${symbol.removed} ${c.path}: ${c.left}`;
        case 'type':
          return `${symbol.type} ${c.path}: ${c.left} (${c.leftType}) → ${c.right} (${c.rightType})`;
        default:
          return `${symbol.changed} ${c.path}: ${c.left} → ${c.right}`;
      }
    })
    .join('\n');
}
