import { defineTool, ToolError } from '@core/tool';
import {
  DELIMITER_LABELS,
  detectDelimiter,
  formatRows,
  parseDelimited,
  type Delimiter,
  type OutputFormat,
} from '@engines/csv';

interface Options {
  delimiter: 'auto' | Delimiter;
  format: OutputFormat;
  hasHeader: boolean;
  trimFields: boolean;
  tableName: string;
}

export default defineTool<string, Options>({
  slug: 'text-to-columns',
  category: 'text',
  cluster: 'text-data',

  name: 'Text to Columns',
  tagline: 'Split delimited text into columns — with a real CSV parser, so quoted fields survive.',
  titleBenefit: 'Real CSV Parsing',
  description:
    'Split text by comma, tab, semicolon or pipe and convert it to CSV, JSON, Markdown or SQL. Handles quoted fields containing the delimiter, which a plain split does not.',
  keywords: [
    'text to columns online',
    'split text by delimiter',
    'csv splitter',
    'convert text to csv',
    'csv to json',
  ],

  runtime: 'client',
  status: 'live',
  premium: false,
  apiEnabled: true,

  score: { demand: 6, evergreen: 10, serp: 7, money: 6, ease: 7 },

  input: {
    type: 'text',
    label: 'Delimited text',
    placeholder: 'Paste rows of delimited data…',
    rows: 9,
    sample:
      'name,role,city\n"Rahman, Ayesha",Engineer,Dhaka\n"O\'Neill, Sean",Designer,"Cork, Ireland"\n"Chen, Wei",Analyst,Singapore',
  },

  options: [
    {
      key: 'delimiter',
      type: 'enum',
      label: 'Delimiter',
      default: 'auto',
      values: [
        { value: 'auto', label: 'Detect automatically' },
        { value: ',', label: 'Comma' },
        { value: '\t', label: 'Tab' },
        { value: ';', label: 'Semicolon' },
        { value: '|', label: 'Pipe' },
        { value: ' ', label: 'Space' },
      ],
    },
    {
      key: 'format',
      type: 'enum',
      label: 'Output as',
      default: 'markdown',
      values: [
        { value: 'markdown', label: 'Markdown table' },
        { value: 'json-objects', label: 'JSON — array of objects' },
        { value: 'json', label: 'JSON — array of arrays' },
        { value: 'csv', label: 'CSV (properly quoted)' },
        { value: 'tsv', label: 'TSV' },
        { value: 'sql', label: 'SQL INSERT statements' },
      ],
    },
    {
      key: 'hasHeader',
      type: 'bool',
      label: 'First row is a header',
      default: true,
      help: 'Used as the object keys, table headings and SQL column names.',
    },
    { key: 'trimFields', type: 'bool', label: 'Trim spaces around each field', default: true },
    {
      key: 'tableName',
      type: 'text',
      label: 'Table name',
      default: 'my_table',
      showIf: { key: 'format', equals: 'sql' },
    },
  ],

  output: { type: 'text', label: 'Converted' },

  howTo: [
    {
      title: 'Paste your rows',
      detail: 'The delimiter is detected automatically by looking for the one that produces a consistent column count.',
    },
    {
      title: 'Confirm the column count',
      detail: 'The preview table shows how the data actually parsed. If a row has the wrong number of fields, the delimiter guess was wrong — set it manually.',
    },
    { title: 'Pick an output format', detail: 'Markdown for documentation, JSON for code, SQL to seed a table.' },
  ],

  faq: [
    {
      q: 'Why does splitting on a comma break my data?',
      a: 'Because a field can contain a comma. `"Rahman, Ayesha",Engineer` is two fields, not three — the quotes say so. A plain split produces three, silently shifting every column after it. This tool implements RFC 4180 quoting, so quoted fields survive intact.',
    },
    {
      q: 'How does automatic delimiter detection work?',
      a: 'By consistency rather than frequency. Counting occurrences picks whichever character is most common, which on prose is the space. Instead it tries each candidate and keeps the one that produces the same number of fields on every line — which is what a delimiter actually does.',
    },
    {
      q: 'How do I put a quote inside a quoted field?',
      a: 'Double it. `"She said ""hello"""` is one field containing `She said "hello"`. That is the RFC 4180 rule, and this parser follows it, as does Excel.',
    },
    {
      q: 'Can fields contain line breaks?',
      a: 'Yes, if they are inside quotes. The parser reads the whole document rather than splitting on newlines first, so a quoted field spanning two lines is kept as one value.',
    },
    {
      q: 'Are the SQL statements safe to run?',
      a: 'They are escaped — single quotes are doubled and numbers are left unquoted — but treat them as a starting point, not as trusted input. Read them before running them against anything that matters, and never build a production import from a browser tool without checking it.',
    },
    {
      q: 'What happens if rows have different column counts?',
      a: 'They are kept as they are and the mismatch is reported above the result. Ragged rows are usually a sign the delimiter guess was wrong, or that a quote was left unclosed somewhere in the file.',
    },
  ],

  infoGain: {
    summary:
      'Nearly every "text to columns" tool online is a call to split() on the delimiter. That is correct until a field contains the delimiter, which in real exports is immediately — every address, every "Surname, Firstname". This is a real RFC 4180 parser: quoted fields, doubled quotes, and newlines inside quotes all handled.',
    table: {
      caption: 'Where a plain split() gets it wrong',
      head: ['Input row', 'split(",")', 'This tool'],
      rows: [
        ['"Rahman, Ayesha",Engineer', '3 fields — column shifted', '2 fields'],
        ['"She said ""hi""",ok', '3 fields, quotes mangled', '2 fields: She said "hi" | ok'],
        ['a,"multi\\nline",c', 'Row broken in two', '1 row, 3 fields'],
        ['a,,c', '3 fields (correct)', '3 fields, middle empty'],
      ],
    },
    benchmarks: [
      {
        label: '10,000 quoted rows',
        value: '10.3 ms',
        note: 'full character-by-character parse — i5-6300U, Chrome 151, median of 8',
      },
    ],
    supports: [
      'RFC 4180 quoting — quoted delimiters, doubled quotes, embedded newlines',
      'Delimiter detection by column-count consistency',
      'Six output formats including JSON objects and SQL INSERT',
      'Proper re-quoting on CSV output — only where a field needs it',
      'Ragged row detection',
    ],
    limits: [
      'Space-delimited input cannot distinguish a separator from a space inside an unquoted field. Use tabs where you can.',
      'SQL output infers only "looks like a number" versus "string". It does not detect dates, booleans or nulls beyond empty fields.',
      'Fixed-width column input is not supported — this splits on a delimiter, not on column positions.',
    ],
    verified: '2026-08',
  },

  related: [
    'remove-extra-spaces',
    'sort-lines',
    'remove-duplicate-lines',
    'json-formatter',
    'find-and-replace',
    'line-numberer',
    'word-counter',
  ],
  nextSteps: ['json-formatter', 'sort-lines', 'remove-duplicate-lines'],

  added: '2026-08-09',
  updated: '2026-08-09',

  run: (input, options) => {
    if (input.trim() === '') return { output: '' };

    const guess = detectDelimiter(input);
    const delimiter = options.delimiter === 'auto' ? guess.delimiter : options.delimiter;

    const rows = parseDelimited(input, delimiter).filter(
      (r) => !(r.length === 1 && r[0]!.trim() === ''),
    );

    if (rows.length === 0) {
      throw new ToolError(
        'Nothing could be parsed from that input.',
        'Check that the rows are separated by line breaks and the fields by a consistent delimiter.',
      );
    }

    const expected = rows[0]!.length;
    const ragged = rows.filter((r) => r.length !== expected).length;

    const output = formatRows(rows, {
      format: options.format,
      hasHeader: options.hasHeader,
      trimFields: options.trimFields,
      tableName: options.tableName,
    });

    const extensions: Record<OutputFormat, string> = {
      csv: 'csv', tsv: 'tsv', json: 'json', 'json-objects': 'json', markdown: 'md', sql: 'sql',
    };

    const preview = rows.slice(0, 20);
    const header = options.hasHeader
      ? preview[0]!.map((h) => (options.trimFields ? h.trim() : h))
      : preview[0]!.map((_, i) => `column_${i + 1}`);
    const body = options.hasHeader ? preview.slice(1) : preview;

    return {
      output,
      filename: `columns.${extensions[options.format]}`,
      stats: [
        { label: 'Rows', value: options.hasHeader ? rows.length - 1 : rows.length, primary: true },
        { label: 'Columns', value: expected, primary: true },
        {
          label: 'Delimiter',
          value: DELIMITER_LABELS[delimiter as Delimiter] ?? delimiter,
          hint: options.delimiter === 'auto' ? `${Math.round(guess.confidence * 100)}% confidence` : 'set manually',
          primary: true,
        },
        { label: 'Ragged rows', value: ragged, hint: 'different column count' },
      ],
      table: {
        caption: `Parsed preview — first ${Math.min(20, body.length)} rows`,
        head: header.map((h) => h || '(empty)'),
        rows: body.map((r) =>
          header.map((_, i) => {
            const cell = r[i] ?? '';
            const value = options.trimFields ? cell.trim() : cell;
            return value === '' ? '—' : value;
          }),
        ),
      },
      notes:
        ragged > 0
          ? [`${ragged} row${ragged === 1 ? '' : 's'} do not have ${expected} columns. That usually means the delimiter guess was wrong, or a quote was left unclosed.`]
          : options.delimiter === 'auto' && guess.confidence < 0.9
            ? ['Delimiter detection was not confident. Check the preview, and set the delimiter manually if the columns look wrong.']
            : undefined,
    };
  },
});
