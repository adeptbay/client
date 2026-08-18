/**
 * YAML emitter.
 *
 * The reason this is a real engine and not a twenty-line recursive
 * `join` is the Norway problem, and it is not a curiosity — it is the
 * single most common way a JSON → YAML conversion silently changes
 * data.
 *
 * YAML 1.1 resolves the bare words `y`, `yes`, `no`, `on` and `off` to
 * booleans. YAML 1.2 does not. Which one applies depends on the
 * *parser*, not on the document: PyYAML, SnakeYAML 1.x, Ruby's Psych
 * and most Kubernetes manifest readers still resolve the 1.1 set. So
 * `{"country": "NO"}` converted by a naive emitter becomes
 * `country: NO`, which loads back as `country: false`. The country code
 * for Norway is the classic example; `sh` for the Shell language, `on`
 * as a schedule key and a version string like `1.20` all fail the same
 * way.
 *
 * Every scalar that would resolve to a non-string under either YAML
 * version is quoted here. The cost is a few extra quote marks. The
 * alternative is a config file that is wrong in a way nothing reports.
 */

export type QuoteStyle = 'minimal' | 'single' | 'double';

export interface YamlOptions {
  indent: number;
  sortKeys: boolean;
  /** Emit multi-line strings as `|` literal blocks instead of "\n" escapes. */
  blockScalars: boolean;
  quote: QuoteStyle;
  /** Leading `---`, required when several documents share a file. */
  documentStart: boolean;
}

/* ── Scalar resolution ──────────────────────────────────────────── */

/** YAML 1.1 booleans. 1.2 keeps only `true` and `false`; parsers vary. */
const BOOLEAN_LIKE = /^(y|n|yes|no|true|false|on|off)$/i;

/** `~` and `null` both resolve to null, in any capitalisation. */
const NULL_LIKE = /^(~|null)$/i;

/** Integers, floats, and the 0b/0o/0x radices YAML 1.1 accepts. */
const NUMBER_LIKE =
  /^[-+]?(0b[01_]+|0o[0-7_]+|0[0-7_]+|0x[0-9a-fA-F_]+|[0-9][0-9_]*(\.[0-9_]*)?([eE][-+]?[0-9]+)?|\.[0-9_]+([eE][-+]?[0-9]+)?)$/;

/** `.inf`, `-.Inf`, `.NaN`. */
const SPECIAL_FLOAT = /^[-+]?\.(inf|nan)$/i;

/**
 * Sexagesimal — `1:30` is 90 in YAML 1.1. It is how a duration, a score
 * line and a time-of-day string all get eaten.
 */
const SEXAGESIMAL = /^[-+]?[0-9][0-9_]*(:[0-5]?[0-9])+(\.[0-9_]*)?$/;

/** A timestamp resolves to a date object, not to the string you wrote. */
const TIMESTAMP = /^\d{4}-\d{1,2}-\d{1,2}([Tt ][0-9:.+\-Zz ]*)?$/;

/** Characters that mean something structural at the start of a scalar. */
const LEADING_INDICATOR = /^[,[\]{}#&*!|>'"%@`]/;

/** C0 controls and DEL, excluding tab, newline and carriage return. */
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

/** Whitespace a plain scalar cannot carry safely. */
const HARD_WHITESPACE = /[\n\r\t]/;

/**
 * Would this string be read back as something other than a string?
 *
 * Exported because the tool page lists the categories it covers, and a
 * documented rule that the code does not actually apply is worse than
 * no documentation at all.
 */
export function isAmbiguousScalar(s: string): boolean {
  return (
    BOOLEAN_LIKE.test(s) ||
    NULL_LIKE.test(s) ||
    NUMBER_LIKE.test(s) ||
    SPECIAL_FLOAT.test(s) ||
    SEXAGESIMAL.test(s) ||
    TIMESTAMP.test(s)
  );
}

/** Would this string break the document, rather than merely change type? */
function isStructurallyUnsafe(s: string): boolean {
  if (s === '') return true;
  if (/^\s|\s$/.test(s)) return true;
  if (LEADING_INDICATOR.test(s)) return true;
  // `-`, `?` and `:` are indicators only when a space follows them.
  if (/^[-?:]($|\s)/.test(s)) return true;
  // A colon-space anywhere turns one scalar into a nested mapping.
  if (s.includes(': ') || s.endsWith(':')) return true;
  // ` #` starts a comment.
  if (/\s#/.test(s)) return true;
  return HARD_WHITESPACE.test(s) || CONTROL.test(s);
}

export function needsQuotes(s: string): boolean {
  return isStructurallyUnsafe(s) || isAmbiguousScalar(s);
}

function doubleQuote(s: string): string {
  let out = '"';
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if (ch === '"') out += '\\"';
    else if (ch === '\\') out += '\\\\';
    else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\t') out += '\\t';
    else if (code < 0x20 || code === 0x7f) out += `\\x${code.toString(16).padStart(2, '0')}`;
    else out += ch;
  }
  return `${out}"`;
}

const singleQuote = (s: string): string => `'${s.replace(/'/g, "''")}'`;

/**
 * A literal block needs no escaping at all, which is what keeps a
 * pasted script, certificate or SQL statement readable in the output.
 * It is only available when no line carries leading or trailing
 * whitespace: YAML resolves the block's indentation from its first
 * line, and trailing spaces are invisible to whoever edits the file
 * next.
 */
function blockEligible(s: string): boolean {
  if (!s.includes('\n')) return false;
  if (/[\r\t]/.test(s) || CONTROL.test(s)) return false;
  return s.split('\n').every((line) => !/^[ \t]/.test(line) && !/[ \t]$/.test(line));
}

interface Scalar {
  inline?: string;
  /** `|`, `|-` or `|+`. */
  blockHeader?: string;
  blockLines?: string[];
}

function renderString(s: string, o: YamlOptions): Scalar {
  if (o.quote === 'minimal' && o.blockScalars && blockEligible(s)) {
    /**
     * Chomping indicator. `|` keeps one trailing newline, `|-` strips
     * them all, `|+` keeps every one. Choosing by counting the actual
     * trailing newlines is what makes the round trip exact — the common
     * shortcut of always emitting `|` adds or removes a newline.
     */
    const trailing = /\n*$/.exec(s)![0].length;
    const lines = s.split('\n');
    if (lines[lines.length - 1] === '') lines.pop();
    return {
      blockHeader: trailing === 0 ? '|-' : trailing === 1 ? '|' : '|+',
      blockLines: lines,
    };
  }

  if (o.quote === 'double') return { inline: doubleQuote(s) };

  // A single-quoted scalar cannot express an escape, so anything with a
  // newline or a control character has to be double-quoted whatever the
  // preference says.
  const mustEscape = HARD_WHITESPACE.test(s) || CONTROL.test(s);

  if (o.quote === 'single') return { inline: mustEscape ? doubleQuote(s) : singleQuote(s) };
  if (!needsQuotes(s)) return { inline: s };
  return { inline: mustEscape ? doubleQuote(s) : singleQuote(s) };
}

function renderScalar(value: unknown, o: YamlOptions): Scalar {
  if (value === null || value === undefined) return { inline: 'null' };
  if (typeof value === 'boolean') return { inline: value ? 'true' : 'false' };
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return { inline: '.nan' };
    if (!Number.isFinite(value)) return { inline: value > 0 ? '.inf' : '-.inf' };
    return { inline: String(value) };
  }
  if (typeof value === 'string') return renderString(value, o);
  return { inline: doubleQuote(String(value)) };
}

/**
 * Keys take the same treatment as values. A key is a scalar too, so
 * `{"yes": 1}` emitted bare produces a mapping whose key is the boolean
 * true — and a later lookup for "yes" finds nothing.
 */
function renderKey(key: string, o: YamlOptions): string {
  if (o.quote === 'double') return doubleQuote(key);
  if (HARD_WHITESPACE.test(key) || CONTROL.test(key)) return doubleQuote(key);
  /**
   * A key is held to one rule a value is not: any colon at all forces
   * quoting. `{"x:y": 3}` emitted bare is `x:y: 3`, which a YAML 1.1
   * parser is entitled to read as the key `x` — and the ones that do
   * not simply differ, so the document means different things in
   * different loaders. Values are safe unquoted because a colon only
   * separates when a space follows it.
   */
  if (o.quote === 'single' || key.includes(':') || needsQuotes(key)) return singleQuote(key);
  return key;
}

/* ── Structure ──────────────────────────────────────────────────── */

const isContainer = (v: unknown): boolean =>
  Array.isArray(v) || (typeof v === 'object' && v !== null);

const isEmptyContainer = (v: unknown): boolean =>
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v).length === 0);

export interface YamlStats {
  lines: number;
  quotedScalars: number;
  /** Strings quoted purely because they would change type — the Norway set. */
  ambiguousScalars: string[];
  blockScalars: number;
  maxDepth: number;
}

export function toYaml(value: unknown, o: YamlOptions): { yaml: string; stats: YamlStats } {
  const out: string[] = [];
  const stats: YamlStats = {
    lines: 0,
    quotedScalars: 0,
    ambiguousScalars: [],
    blockScalars: 0,
    maxDepth: 0,
  };

  const noteScalar = (raw: unknown, rendered: Scalar) => {
    if (rendered.blockLines) stats.blockScalars++;
    if (typeof raw !== 'string') return;
    if (rendered.inline !== undefined && rendered.inline !== raw) {
      stats.quotedScalars++;
      if (
        isAmbiguousScalar(raw) &&
        !stats.ambiguousScalars.includes(raw) &&
        stats.ambiguousScalars.length < 12
      ) {
        stats.ambiguousScalars.push(raw);
      }
    }
  };

  /**
   * `- ` at indent 2, `-   ` at indent 4. Padding the dash to the full
   * indent width is what lets a nested item's first line be hoisted onto
   * it without the rest of that item ending up in a different column.
   */
  const dash = '-'.padEnd(o.indent, ' ');

  const pushBlockScalar = (prefix: string, s: Scalar, childPad: string) => {
    out.push(`${prefix}${s.blockHeader}`);
    for (const line of s.blockLines!) out.push(line === '' ? '' : `${childPad}${line}`);
  };

  const emit = (node: unknown, depth: number): void => {
    if (depth + 1 > stats.maxDepth) stats.maxDepth = depth + 1;

    const pad = ' '.repeat(depth * o.indent);
    const childPad = ' '.repeat((depth + 1) * o.indent);

    if (Array.isArray(node)) {
      for (const item of node) {
        if (isEmptyContainer(item)) {
          out.push(`${pad}${dash}${Array.isArray(item) ? '[]' : '{}'}`);
          continue;
        }
        if (isContainer(item)) {
          const start = out.length;
          emit(item, depth + 1);
          out[start] = `${pad}${dash}${out[start]!.slice(childPad.length)}`;
          continue;
        }
        const s = renderScalar(item, o);
        noteScalar(item, s);
        if (s.blockLines) pushBlockScalar(`${pad}${dash}`, s, childPad);
        else out.push(`${pad}${dash}${s.inline}`);
      }
      return;
    }

    const record = node as Record<string, unknown>;
    const keys = Object.keys(record);
    if (o.sortKeys) keys.sort((a, b) => a.localeCompare(b));

    for (const key of keys) {
      const item = record[key];
      const label = renderKey(key, o);

      if (isEmptyContainer(item)) {
        out.push(`${pad}${label}: ${Array.isArray(item) ? '[]' : '{}'}`);
        continue;
      }
      if (isContainer(item)) {
        out.push(`${pad}${label}:`);
        emit(item, depth + 1);
        continue;
      }

      const s = renderScalar(item, o);
      noteScalar(item, s);
      if (s.blockLines) pushBlockScalar(`${pad}${label}: `, s, childPad);
      else out.push(`${pad}${label}: ${s.inline}`);
    }
  };

  if (isEmptyContainer(value)) {
    out.push(Array.isArray(value) ? '[]' : '{}');
    stats.maxDepth = 1;
  } else if (isContainer(value)) {
    emit(value, 0);
  } else {
    const s = renderScalar(value, o);
    noteScalar(value, s);
    if (s.blockLines) pushBlockScalar('', s, '');
    else out.push(s.inline!);
  }

  if (o.documentStart) out.unshift('---');

  stats.lines = out.length;
  return { yaml: `${out.join('\n')}\n`, stats };
}
