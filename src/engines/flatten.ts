/**
 * JSON → tabular flattening.
 *
 * The bug in almost every online JSON-to-CSV converter is the header.
 * They read the keys of the first record and use those as the columns,
 * which is correct only when every record has the same shape — and the
 * whole reason JSON is used instead of CSV is that records often do
 * not. A field that appears from record 40 onwards is silently dropped,
 * with no warning, and the export looks complete.
 *
 * Here the header is the union of every key across every record, in
 * first-seen order, and the count of keys that appeared late is
 * reported so the discrepancy is visible rather than lost.
 */

export type ArrayStrategy = 'index' | 'join' | 'json';

export interface FlattenOptions {
  /** How a nested array becomes columns. */
  arrays: ArrayStrategy;
  /** Path separator for nested keys — `user.address.city`. */
  separator: string;
  /** Used by the `join` strategy. */
  joinWith: string;
  /** What an explicit `null` is written as. */
  nullAs: string;
}

export interface TableResult {
  header: string[];
  rows: string[][];
  /** Where the records were found — `$`, or `$.data` when nested. */
  source: string;
  /** Records missing at least one column that exists elsewhere. */
  sparseRows: number;
  /** Columns that first appeared after the first record. */
  lateColumns: string[];
  /** Deepest nesting level flattened. */
  depth: number;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Find the records to tabulate.
 *
 * A REST response is usually `{"data": [...]}` or `{"items": [...]}`
 * rather than a bare array, and pasting the whole response is what
 * people actually do. Descending one level into the first array of
 * objects turns "this tool produced one useless row" into the expected
 * result — and the path taken is reported, so the behaviour is visible
 * rather than magic.
 */
export function findRecords(value: unknown): { records: unknown[]; source: string } {
  if (Array.isArray(value)) return { records: value, source: '$' };

  if (isPlainObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (Array.isArray(child) && child.length > 0 && child.some(isPlainObject)) {
        return { records: child, source: `$.${key}` };
      }
    }
  }

  return { records: [value], source: '$' };
}

export function jsonToTable(value: unknown, o: FlattenOptions): TableResult {
  const { records, source } = findRecords(value);

  const header: string[] = [];
  const seen = new Set<string>();
  const lateColumns: string[] = [];
  const flattened: Record<string, string>[] = [];
  let depth = 1;

  const addColumn = (key: string, recordIndex: number) => {
    if (seen.has(key)) return;
    seen.add(key);
    header.push(key);
    if (recordIndex > 0 && lateColumns.length < 20) lateColumns.push(key);
  };

  const write = (
    node: unknown,
    prefix: string,
    into: Record<string, string>,
    recordIndex: number,
    level: number,
  ): void => {
    if (level > depth) depth = level;

    if (node === null) {
      addColumn(prefix, recordIndex);
      into[prefix] = o.nullAs;
      return;
    }

    if (Array.isArray(node)) {
      if (node.length === 0) {
        addColumn(prefix, recordIndex);
        into[prefix] = o.arrays === 'json' ? '[]' : '';
        return;
      }

      if (o.arrays === 'json') {
        addColumn(prefix, recordIndex);
        into[prefix] = JSON.stringify(node);
        return;
      }

      if (o.arrays === 'join') {
        addColumn(prefix, recordIndex);
        into[prefix] = node
          .map((item) =>
            item === null ? o.nullAs : typeof item === 'object' ? JSON.stringify(item) : String(item),
          )
          .join(o.joinWith);
        return;
      }

      node.forEach((item, i) => write(item, `${prefix}[${i}]`, into, recordIndex, level + 1));
      return;
    }

    if (isPlainObject(node)) {
      const keys = Object.keys(node);
      if (keys.length === 0) {
        addColumn(prefix, recordIndex);
        into[prefix] = o.arrays === 'json' ? '{}' : '';
        return;
      }
      for (const key of keys) {
        write(node[key], prefix === '' ? key : `${prefix}${o.separator}${key}`, into, recordIndex, level + 1);
      }
      return;
    }

    addColumn(prefix, recordIndex);
    into[prefix] = typeof node === 'string' ? node : String(node);
  };

  records.forEach((record, i) => {
    const row: Record<string, string> = {};
    // A record that is a bare scalar still deserves a column; "value" is
    // the conventional name and beats an empty header cell.
    write(record, isPlainObject(record) || Array.isArray(record) ? '' : 'value', row, i, 1);
    flattened.push(row);
  });

  let sparseRows = 0;
  const rows = flattened.map((row) => {
    let missing = false;
    const cells = header.map((key) => {
      if (!(key in row)) missing = true;
      return row[key] ?? '';
    });
    if (missing) sparseRows++;
    return cells;
  });

  return { header, rows, source, sparseRows, lateColumns, depth };
}

/* ── Delimited output ───────────────────────────────────────────── */

/**
 * RFC 4180 quoting, generalised to any delimiter.
 *
 * `csv.ts` has the comma-only version this cannot reuse: the rule is
 * "quote if the field contains the delimiter", and the delimiter is a
 * parameter here. A field is also quoted when it starts with a
 * character Excel would read as a formula, because `=cmd|'…'` in a CSV
 * is a real attack on whoever opens the file, not a formatting quirk.
 */
const FORMULA_LEAD = /^[=+\-@\t\r]/;

export function delimitedField(value: string, delimiter: string, guardFormulas: boolean): string {
  const dangerous = guardFormulas && FORMULA_LEAD.test(value);
  const body = dangerous ? `'${value}` : value;

  return body.includes(delimiter) || /["\n\r]/.test(body)
    ? `"${body.replace(/"/g, '""')}"`
    : body;
}

/** U+FEFF. Named, because a literal one in source is invisible. */
const BOM = '\uFEFF';

export interface DelimitedOptions {
  delimiter: string;
  includeHeader: boolean;
  /** UTF-8 byte order mark, so Excel opens non-ASCII text correctly. */
  bom: boolean;
  crlf: boolean;
  guardFormulas: boolean;
}

export function toDelimited(table: TableResult, o: DelimitedOptions): string {
  const lines: string[] = [];
  if (o.includeHeader) lines.push(table.header.map((h) => delimitedField(h, o.delimiter, false)).join(o.delimiter));
  for (const row of table.rows) {
    lines.push(row.map((cell) => delimitedField(cell, o.delimiter, o.guardFormulas)).join(o.delimiter));
  }

  const body = lines.join(o.crlf ? '\r\n' : '\n');
  // Written as an escape on purpose: a literal U+FEFF in source is
  // invisible, and the next person to touch this line would delete it.
  return o.bom ? `${BOM}${body}` : body;
}
