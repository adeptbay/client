/**
 * Randomness engine.
 *
 * Everything here draws from `crypto.getRandomValues`. Math.random is
 * never acceptable for a password or a token, and a "password generator"
 * that uses it is worse than no tool at all — it looks safe and is not.
 */

const MAX_UINT32 = 0xffff_ffff;

/** Uniform integer in [0, bound). Rejection sampling removes modulo bias. */
export function randomInt(bound: number): number {
  if (bound <= 0) throw new Error('bound must be positive');
  if (bound === 1) return 0;

  const limit = Math.floor((MAX_UINT32 + 1) / bound) * bound;
  const buf = new Uint32Array(1);
  let value: number;
  do {
    crypto.getRandomValues(buf);
    value = buf[0]!;
  } while (value >= limit);

  return value % bound;
}

export function randomPick<T>(items: readonly T[]): T {
  if (items.length === 0) throw new Error('cannot pick from an empty list');
  return items[randomInt(items.length)]!;
}

export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/* ── Character sets ─────────────────────────────────────────────── */

export const CHARSETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>?',
  /** Characters people misread on paper or in a terminal. */
  ambiguous: 'Il1O0oB8S5Z2',
} as const;

export interface PasswordOptions {
  length: number;
  lower: boolean;
  upper: boolean;
  digits: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
  /** Guarantee at least one character from every enabled set. */
  requireEach: boolean;
}

export function generatePassword(o: PasswordOptions): string {
  const pools: string[] = [];
  if (o.lower) pools.push(CHARSETS.lower);
  if (o.upper) pools.push(CHARSETS.upper);
  if (o.digits) pools.push(CHARSETS.digits);
  if (o.symbols) pools.push(CHARSETS.symbols);
  if (pools.length === 0) throw new Error('Select at least one character type.');

  const clean = (s: string) =>
    o.excludeAmbiguous ? [...s].filter((c) => !CHARSETS.ambiguous.includes(c)).join('') : s;

  const cleanPools = pools.map(clean).filter((p) => p.length > 0);
  if (cleanPools.length === 0) {
    throw new Error('Excluding ambiguous characters removed every selected character type.');
  }

  const all = cleanPools.join('');
  const chars: string[] = [];

  if (o.requireEach) {
    if (o.length < cleanPools.length) {
      throw new Error(`Length must be at least ${cleanPools.length} to include one of each type.`);
    }
    for (const pool of cleanPools) chars.push(pool[randomInt(pool.length)]!);
  }

  while (chars.length < o.length) chars.push(all[randomInt(all.length)]!);

  // The guaranteed characters would otherwise always sit at the front.
  return shuffle(chars).join('');
}

/**
 * Entropy in bits: log2(poolSize^length).
 *
 * This measures the generator, not the string. It is the honest number
 * for a randomly generated password and is meaningless for one a human
 * chose — a distinction most "password strength" meters blur.
 */
export function entropyBits(poolSize: number, length: number): number {
  if (poolSize <= 1 || length <= 0) return 0;
  return Math.round(length * Math.log2(poolSize) * 10) / 10;
}

export function crackTimeLabel(bits: number): string {
  // 10^12 guesses/second — an offline attack on a fast GPU cluster
  // against a weak hash. The pessimistic assumption is the useful one.
  const seconds = 2 ** (bits - 1) / 1e12;

  if (seconds < 1) return 'instantly';
  const units: [number, string][] = [
    [60, 'seconds'], [60, 'minutes'], [24, 'hours'], [365, 'days'],
    [1000, 'years'], [1000, 'thousand years'], [1000, 'million years'],
  ];
  let value = seconds;
  let label = 'seconds';
  for (const [divisor, next] of units) {
    if (value < divisor) break;
    value /= divisor;
    label = next;
  }
  if (value > 1000) return 'longer than the age of the universe';
  return `${value < 10 ? value.toFixed(1) : Math.round(value).toLocaleString()} ${label}`;
}

/* ── Identifiers ────────────────────────────────────────────────── */

export function uuidV4(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();

  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6]! & 0x0f) | 0x40; // version 4
  b[8] = (b[8]! & 0x3f) | 0x80; // variant 10
  const hex = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * UUID v7 — RFC 9562. A 48-bit millisecond timestamp followed by
 * randomness, so identifiers sort by creation time. This is what you
 * want for a database primary key; v4 fragments a B-tree index.
 */
export function uuidV7(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);

  const ms = Date.now();
  b[0] = (ms / 2 ** 40) & 0xff;
  b[1] = (ms / 2 ** 32) & 0xff;
  b[2] = (ms / 2 ** 24) & 0xff;
  b[3] = (ms / 2 ** 16) & 0xff;
  b[4] = (ms / 2 ** 8) & 0xff;
  b[5] = ms & 0xff;

  b[6] = (b[6]! & 0x0f) | 0x70; // version 7
  b[8] = (b[8]! & 0x3f) | 0x80; // variant 10

  const hex = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Crockford base32 — no I, L, O or U, so it survives being read aloud. */
const ULID_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function ulid(): string {
  let time = Date.now();
  let out = '';
  for (let i = 9; i >= 0; i--) {
    out = ULID_ALPHABET[time % 32] + out;
    time = Math.floor(time / 32);
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 16; i++) out += ULID_ALPHABET[bytes[i]! % 32];
  return out;
}

export function nanoId(size = 21): string {
  const alphabet = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}
