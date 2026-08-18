/**
 * JSON → TypeScript type inference.
 *
 * Competitor research: nearly every "JSON to TypeScript" converter
 * types an array from its first element. That is wrong on real API
 * responses in a specific and expensive way — the second page of
 * results holds the record where `middleName` is absent and `deletedAt`
 * is a string rather than null, and the generated type says both are
 * guaranteed. The compiler then agrees with the type instead of with
 * the data, and the mistake surfaces at runtime.
 *
 * So every element of every array is merged here:
 *   · a key present in some elements and not others becomes optional
 *   · a key holding different types across elements becomes a union
 *   · `null` seen anywhere widens to `| null` rather than replacing
 *   · structurally identical objects share one named type
 *
 * The result describes the sample that was actually pasted. It is still
 * only a sample, and the page says so.
 */

export interface TypeGenOptions {
  rootName: string;
  style: 'interface' | 'type';
  /** Mark keys missing from some array elements as optional. */
  optionalMissing: boolean;
  /** `unknown` rather than `any` where nothing can be inferred. */
  preferUnknown: boolean;
  readonlyProps: boolean;
  /** Extract nested objects into named types, or nest them inline. */
  nested: 'named' | 'inline';
}

/* ── Shape lattice ──────────────────────────────────────────────── */

type Primitive = 'string' | 'number' | 'boolean' | 'null';

type Shape =
  | { k: 'prim'; t: Primitive }
  | { k: 'arr'; el: Shape | null }
  | { k: 'obj'; props: Map<string, { shape: Shape; count: number }>; samples: number }
  | { k: 'union'; of: Shape[] }
  /** Nothing observed — an empty array, or a value JSON cannot carry. */
  | { k: 'empty' };

function infer(value: unknown): Shape {
  if (value === null) return { k: 'prim', t: 'null' };

  if (Array.isArray(value)) {
    let el: Shape | null = null;
    for (const item of value) el = el === null ? infer(item) : merge(el, infer(item));
    return { k: 'arr', el };
  }

  if (typeof value === 'object') {
    const props = new Map<string, { shape: Shape; count: number }>();
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      props.set(key, { shape: infer(v), count: 1 });
    }
    return { k: 'obj', props, samples: 1 };
  }

  if (typeof value === 'string') return { k: 'prim', t: 'string' };
  if (typeof value === 'number') return { k: 'prim', t: 'number' };
  if (typeof value === 'boolean') return { k: 'prim', t: 'boolean' };
  return { k: 'empty' };
}

/** Canonical form. Drives both deduplication and union membership. */
function signature(shape: Shape): string {
  switch (shape.k) {
    case 'prim':
      return shape.t;
    case 'empty':
      return '?';
    case 'arr':
      return `[${shape.el ? signature(shape.el) : '?'}]`;
    case 'union':
      return `(${shape.of.map(signature).sort().join('|')})`;
    case 'obj':
      return `{${[...shape.props.entries()]
        .map(([k, v]) => `${k}${v.count < shape.samples ? '?' : ''}:${signature(v.shape)}`)
        .sort()
        .join(',')}}`;
  }
}

const members = (shape: Shape): Shape[] => (shape.k === 'union' ? shape.of : [shape]);

function union(shapes: Shape[]): Shape {
  const seen = new Map<string, Shape>();
  for (const s of shapes.flatMap(members)) {
    if (s.k === 'empty') continue;
    const sig = signature(s);
    if (!seen.has(sig)) seen.set(sig, s);
  }
  const of = [...seen.values()];
  if (of.length === 0) return { k: 'empty' };
  if (of.length === 1) return of[0]!;
  return { k: 'union', of };
}

function merge(a: Shape, b: Shape): Shape {
  if (a.k === 'empty') return b;
  if (b.k === 'empty') return a;

  if (a.k === 'obj' && b.k === 'obj') {
    const props = new Map<string, { shape: Shape; count: number }>();
    for (const [key, entry] of a.props) props.set(key, { ...entry });
    for (const [key, entry] of b.props) {
      const existing = props.get(key);
      props.set(
        key,
        existing
          ? { shape: merge(existing.shape, entry.shape), count: existing.count + entry.count }
          : { ...entry },
      );
    }
    return { k: 'obj', props, samples: a.samples + b.samples };
  }

  if (a.k === 'arr' && b.k === 'arr') {
    const el = a.el === null ? b.el : b.el === null ? a.el : merge(a.el, b.el);
    return { k: 'arr', el };
  }

  if (a.k === 'prim' && b.k === 'prim' && a.t === b.t) return a;

  return union([a, b]);
}

/** Structural nesting depth, reported alongside the generated code. */
function shapeDepth(shape: Shape): number {
  switch (shape.k) {
    case 'obj':
      return 1 + Math.max(0, ...[...shape.props.values()].map((p) => shapeDepth(p.shape)));
    case 'arr':
      return shape.el ? shapeDepth(shape.el) : 1;
    case 'union':
      return Math.max(0, ...shape.of.map(shapeDepth));
    default:
      return 1;
  }
}

/* ── Naming ─────────────────────────────────────────────────────── */

const RESERVED = new Set([
  'Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'Function', 'Error',
  'Map', 'Set', 'Promise', 'Record', 'Partial', 'Required', 'Readonly', 'Symbol',
]);

const VALID_IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function pascalCase(input: string): string {
  const words = input
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+|(?<=[a-z0-9])(?=[A-Z])/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');

  if (words === '') return 'Type';
  return /^[A-Za-z_$]/.test(words) ? words : `Type${words}`;
}

/** `users` → `User`, `addresses` → `Address`, `entries` → `Entry`. */
function singular(name: string): string {
  if (/ies$/i.test(name) && name.length > 4) return `${name.slice(0, -3)}y`;
  if (/(s|x|z|ch|sh)es$/i.test(name)) return name.slice(0, -2);
  if (/[^su]s$/i.test(name)) return name.slice(0, -1);
  return name;
}

/** The name a nested array's element type should take. */
const elementHint = (hint: string): string => {
  const one = singular(hint);
  return one.toLowerCase() === hint.toLowerCase() ? `${hint}Item` : one;
};

/* ── Emission ───────────────────────────────────────────────────── */

export interface TypeGenResult {
  code: string;
  typeCount: number;
  propertyCount: number;
  optionalCount: number;
  unionCount: number;
  depth: number;
  /** Keys absent from some array elements, qualified by the type they sit in. */
  optionalKeys: string[];
}

export function jsonToTypeScript(value: unknown, o: TypeGenOptions): TypeGenResult {
  const root = infer(value);
  const inline = o.nested === 'inline';
  const unknownType = o.preferUnknown ? 'unknown' : 'any';

  const blocks: string[] = [];
  /** signature → emitted type name, so identical shapes share one type. */
  const bySignature = new Map<string, string>();
  const usedNames = new Set<string>();

  let typeCount = 0;
  let propertyCount = 0;
  let optionalCount = 0;
  let unionCount = 0;
  const optionalKeys: string[] = [];

  const uniqueName = (base: string): string => {
    let name = pascalCase(base);
    if (RESERVED.has(name)) name = `${name}Type`;
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }
    let n = 2;
    while (usedNames.has(`${name}${n}`)) n++;
    usedNames.add(`${name}${n}`);
    return `${name}${n}`;
  };

  /**
   * `depth` is the indentation level the expression is written at, which
   * only matters in inline mode; named mode always emits at column zero.
   */
  const render = (shape: Shape, hint: string, depth: number): string => {
    switch (shape.k) {
      case 'empty':
        return unknownType;

      case 'prim':
        return shape.t;

      case 'arr': {
        if (shape.el === null) return `${unknownType}[]`;
        const el = render(shape.el, elementHint(hint), depth);
        /**
         * `(A | B)[]` — a union at the top of an array type needs the
         * parentheses. Testing the shape rather than searching the
         * rendered string for a pipe matters in inline mode, where a
         * union nested inside an object literal is not a union at this
         * level and the parentheses would be noise.
         */
        return shape.el.k === 'union' ? `(${el})[]` : `${el}[]`;
      }

      case 'union': {
        unionCount++;
        // `string | null` reads better than `null | string`.
        const ordered = [...shape.of].sort(
          (a, b) =>
            Number(a.k === 'prim' && a.t === 'null') - Number(b.k === 'prim' && b.t === 'null'),
        );
        return ordered.map((s) => render(s, hint, depth)).join(' | ');
      }

      case 'obj': {
        if (inline) return renderBody(shape, hint, depth);

        const sig = signature(shape);
        const existing = bySignature.get(sig);
        if (existing) return existing;

        // Claim the name before recursing, so a shape that contains
        // itself resolves to this type rather than emitting a twin.
        const name = uniqueName(hint);
        bySignature.set(sig, name);

        const body = renderBody(shape, hint, 0);
        typeCount++;
        blocks.push(
          o.style === 'interface'
            ? `export interface ${name} ${body}`
            : `export type ${name} = ${body};`,
        );
        return name;
      }
    }
  };

  const renderBody = (
    shape: Extract<Shape, { k: 'obj' }>,
    hint: string,
    depth: number,
  ): string => {
    const inner = '  '.repeat(depth + 1);
    const close = '  '.repeat(depth);

    if (shape.props.size === 0) {
      return o.style === 'interface'
        ? `{\n${inner}[key: string]: ${unknownType};\n${close}}`
        : `Record<string, ${unknownType}>`;
    }

    const lines: string[] = [];

    for (const [key, entry] of shape.props) {
      propertyCount++;

      const optional = o.optionalMissing && entry.count < shape.samples;
      if (optional) {
        optionalCount++;
        if (optionalKeys.length < 12) optionalKeys.push(`${pascalCase(hint)}.${key}`);
      }

      const type = render(entry.shape, key, depth + 1);
      const label = VALID_IDENTIFIER.test(key) ? key : JSON.stringify(key);
      lines.push(`${inner}${o.readonlyProps ? 'readonly ' : ''}${label}${optional ? '?' : ''}: ${type};`);
    }

    return `{\n${lines.join('\n')}\n${close}}`;
  };

  const rootName = o.rootName.trim() === '' ? 'Root' : o.rootName.trim();
  let code: string;

  if (root.k === 'obj' && !inline) {
    render(root, rootName, 0);
    // Children are pushed before the parent's own block closes, so the
    // root lands last. Readers expect the entry point first.
    blocks.unshift(blocks.pop()!);
    code = blocks.join('\n\n');
  } else {
    // Reserve the root's name before anything nested can take it.
    const name = uniqueName(rootName);
    const expression = render(root, rootName, 0);
    typeCount++;
    code = [...blocks, `export type ${name} = ${expression};`].join('\n\n');
  }

  return {
    code: `${code}\n`,
    typeCount,
    propertyCount,
    optionalCount,
    unionCount,
    depth: shapeDepth(root),
    optionalKeys,
  };
}
