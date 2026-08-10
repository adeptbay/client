/**
 * Delimited-text engine.
 *
 * Competitor research: almost every "text to columns" tool online is
 * `line.split(delimiter)`. That is correct until a field contains the
 * delimiter, which in real data is immediately — `"Smith, John"` and
 * every address, product name and CSV export from Excel.
 *
 * This is a real RFC 4180 parser: quoted fields, escaped quotes
 * (`""` inside a quoted field), and newlines inside quotes. It also
 * detects the delimiter rather than making you guess.
 */

export type Delimiter = ',' | '\t' | ';' | '|' | ' ';

export interface DelimiterGuess {
  delimiter: Delimiter;
  /** 0–1. How consistent the column count is across lines. */
  confidence: number;
  columns: number;
}

const CANDIDATES: Delimiter[] = [',', '\t', ';', '|', ' '];

/**
 * Guess the delimiter by consistency, not by frequency.
 *
 * Counting occurrences picks whichever character is most common, which
 * on prose is the space. What actually identifies a delimiter is that
 * it produces the *same* number of fields on every line.
 */
export function detectDelimiter(input: string): DelimiterGuess {
  const lines = input.split(/\r\n|\r|\n/).filter((l) => l.trim() !== '').slice(0, 50);

  if (lines.length === 0) return { delimiter: ',', confidence: 0, columns: 0 };

  let best: DelimiterGuess = { delimiter: ',', confidence: 0, columns: 0 };

  for (const delimiter of CANDIDATES) {
    const counts = lines.map((line) => parseLine(line, delimiter).length);
    const first = counts[0]!;

    if (first < 2) continue;

    const consistent = counts.filter((c) => c === first).length;
    const confidence = consistent / counts.length;

    // Prefer the delimiter that both splits consistently and produces
    // more columns; a tie on consistency should not pick the weaker split.
    if (confidence > best.confidence || (confidence === best.confidence && first > best.columns)) {
      best = { delimiter, confidence, columns: first };
    }
  }

  return best;
}

/** Parse one line into fields, honouring RFC 4180 quoting. */
export function parseLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;

    if (inQuotes) {
      if (ch === '"') {
        // A doubled quote inside a quoted field is one literal quote.
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"' && field === '') {
      inQuotes = true;
    } else if (ch === delimiter) {
      fields.push(field);
      field = '';
    } else {
      field += ch;
    }
  }

  fields.push(field);
  return fields;
}

/**
 * Parse a whole document. Handles newlines inside quoted fields, which
 * is why this cannot simply split on \n first.
 */
export function parseDelimited(input: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const text = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"' && field === '') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/* ── Output formats ─────────────────────────────────────────────── */

export type OutputFormat = 'csv' | 'tsv' | 'json' | 'json-objects' | 'markdown' | 'sql';

/** Quote a CSV field only when it needs it — RFC 4180 §2. */
function csvField(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

const sqlIdentifier = (s: string): string =>
  s.trim().replace(/[^a-zA-Z0-9_]+/g, '_').replace(/^(\d)/, '_$1').toLowerCase() || 'column';

const sqlValue = (s: string): string => {
  if (s === '') return 'NULL';
  if (/^-?\d+(\.\d+)?$/.test(s)) return s;
  return `'${s.replace(/'/g, "''")}'`;
};

export interface FormatOptions {
  format: OutputFormat;
  hasHeader: boolean;
  trimFields: boolean;
  tableName: string;
}

export function formatRows(rows: string[][], o: FormatOptions): string {
  if (rows.length === 0) return '';

  const clean = o.trimFields ? rows.map((r) => r.map((f) => f.trim())) : rows;
  const header = o.hasHeader ? clean[0]! : clean[0]!.map((_, i) => `column_${i + 1}`);
  const body = o.hasHeader ? clean.slice(1) : clean;

  switch (o.format) {
    case 'csv':
      return clean.map((r) => r.map(csvField).join(',')).join('\n');

    case 'tsv':
      // Tabs inside fields would corrupt the output; a space is the
      // conventional substitution and is lossless enough to be honest.
      return clean.map((r) => r.map((f) => f.replace(/\t/g, ' ')).join('\t')).join('\n');

    case 'json':
      return JSON.stringify(clean, null, 2);

    case 'json-objects':
      return JSON.stringify(
        body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? '']))),
        null,
        2,
      );

    case 'markdown': {
      const widths = header.map((h, i) =>
        Math.max(h.length, ...body.map((r) => (r[i] ?? '').length), 3),
      );
      const line = (cells: string[]) =>
        `| ${cells.map((c, i) => (c ?? '').padEnd(widths[i]!)).join(' | ')} |`;

      return [
        line(header),
        `| ${widths.map((w) => '-'.repeat(w)).join(' | ')} |`,
        ...body.map((r) => line(header.map((_, i) => r[i] ?? ''))),
      ].join('\n');
    }

    case 'sql': {
      const table = sqlIdentifier(o.tableName);
      const columns = header.map(sqlIdentifier);
      return body
        .map(
          (r) =>
            `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns
              .map((_, i) => sqlValue(r[i] ?? ''))
              .join(', ')});`,
        )
        .join('\n');
    }
  }
}

export const DELIMITER_LABELS: Record<Delimiter, string> = {
  ',': 'Comma',
  '\t': 'Tab',
  ';': 'Semicolon',
  '|': 'Pipe',
  ' ': 'Space',
};
