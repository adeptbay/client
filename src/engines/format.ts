/**
 * Structured-data engine — JSON parsing, formatting and inspection.
 *
 * The differentiator for the whole JSON cluster lives here: when input
 * is invalid, competitors print the raw engine message. We resolve the
 * byte offset to a line and column, quote the offending line, and point
 * at the character. That is the "information gain" the page is judged
 * on (Part 5.4), and it is also just a better tool.
 */

export interface JsonParseFailure {
  message: string;
  line: number;
  column: number;
  /** The offending source line, for display. */
  excerpt: string;
  /** Caret row aligned under `excerpt`. */
  pointer: string;
  hint?: string;
}

export class JsonParseError extends Error {
  readonly detail: JsonParseFailure;
  constructor(detail: JsonParseFailure) {
    super(detail.message);
    this.name = 'JsonParseError';
    this.detail = detail;
  }
}

/** Common mistakes, matched against the engine's own wording. */
function hintFor(raw: string, source: string, offset: number): string | undefined {
  const before = source.slice(Math.max(0, offset - 40), offset);
  const char = source[offset];

  if (/single quote|'/.test(raw) || /'\s*$/.test(before)) {
    return 'JSON strings must use double quotes. Single quotes are valid JavaScript but not valid JSON.';
  }
  if (char === '}' || char === ']') {
    return 'There is probably a trailing comma before this bracket. JSON does not allow one.';
  }
  if (/Unexpected token [a-zA-Z]/.test(raw)) {
    return 'Property names must be quoted, and the only bare words JSON allows are true, false and null.';
  }
  if (/Unexpected end/.test(raw)) {
    return 'The input stops early — a bracket or brace was opened and never closed.';
  }
  if (/NaN|Infinity/.test(before)) {
    return 'NaN and Infinity are not valid JSON numbers. Use null or a string.';
  }
  return undefined;
}

export function parseJson(source: string): unknown {
  try {
    return JSON.parse(source);
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);

    // V8, SpiderMonkey and JavaScriptCore all report a byte offset,
    // just in different phrasings.
    const offset = Number(
      raw.match(/at position (\d+)/)?.[1] ?? raw.match(/column (\d+)/)?.[1] ?? -1,
    );

    if (offset < 0 || offset > source.length) {
      throw new JsonParseError({
        message: raw, line: 0, column: 0, excerpt: '', pointer: '',
      });
    }

    const upTo = source.slice(0, offset);
    const line = upTo.split('\n').length;
    const lineStart = upTo.lastIndexOf('\n') + 1;
    const column = offset - lineStart + 1;
    const lineEnd = source.indexOf('\n', offset);
    const excerpt = source.slice(lineStart, lineEnd === -1 ? source.length : lineEnd);

    throw new JsonParseError({
      message: raw.replace(/\s*in JSON at position \d+.*$/, ''),
      line,
      column,
      excerpt: excerpt.length > 120 ? `${excerpt.slice(0, 120)}…` : excerpt,
      pointer: `${' '.repeat(Math.max(0, column - 1))}^`,
      hint: hintFor(raw, source, offset),
    });
  }
}

export type IndentStyle = '2' | '4' | 'tab';

const indentOf = (style: IndentStyle): string | number =>
  style === 'tab' ? '\t' : Number(style);

/** Recursively order object keys. Makes two dumps of the same data comparable. */
export function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sortKeysDeep(v)]),
    );
  }
  return value;
}

export function formatJson(source: string, indent: IndentStyle, sortKeys = false): string {
  const parsed = parseJson(source);
  return JSON.stringify(sortKeys ? sortKeysDeep(parsed) : parsed, null, indentOf(indent));
}

export function minifyJson(source: string, sortKeys = false): string {
  const parsed = parseJson(source);
  return JSON.stringify(sortKeys ? sortKeysDeep(parsed) : parsed);
}

export interface JsonShape {
  bytes: number;
  minifiedBytes: number;
  depth: number;
  keys: number;
  arrays: number;
  objects: number;
  nulls: number;
  rootType: string;
}

/** Structural read-out shown next to the result. Iterative, so a deeply
 *  nested document cannot blow the call stack. */
export function inspectJson(value: unknown, source: string, minified: string): JsonShape {
  const shape: JsonShape = {
    bytes: new TextEncoder().encode(source).length,
    minifiedBytes: new TextEncoder().encode(minified).length,
    depth: 0,
    keys: 0,
    arrays: 0,
    objects: 0,
    nulls: 0,
    rootType: Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value,
  };

  const stack: { node: unknown; depth: number }[] = [{ node: value, depth: 1 }];
  while (stack.length > 0) {
    const { node, depth } = stack.pop()!;
    if (depth > shape.depth) shape.depth = depth;

    if (node === null) {
      shape.nulls++;
    } else if (Array.isArray(node)) {
      shape.arrays++;
      for (const child of node) stack.push({ node: child, depth: depth + 1 });
    } else if (typeof node === 'object') {
      shape.objects++;
      for (const [, v] of Object.entries(node as Record<string, unknown>)) {
        shape.keys++;
        stack.push({ node: v, depth: depth + 1 });
      }
    }
  }

  return shape;
}

export { formatBytes } from './bytes';
