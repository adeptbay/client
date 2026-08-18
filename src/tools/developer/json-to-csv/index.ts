import { defineTool, ToolError } from '@core/tool';
import { jsonToTable, toDelimited, type ArrayStrategy } from '@engines/flatten';
import { describeJsonError, formatBytes, parseJson } from '@engines/format';

type DelimiterName = 'comma' | 'tab' | 'semicolon' | 'pipe';

interface Options {
  delimiter: DelimiterName;
  header: boolean;
  arrays: ArrayStrategy;
  joinWith: string;
  nullAs: string;
  bom: boolean;
  crlf: boolean;
  guardFormulas: boolean;
}

const DELIMITERS: Record<DelimiterName, string> = {
  comma: ',',
  tab: '\t',
  semicolon: ';',
  pipe: '|',
};

/** Enough to see the shape; the full file is in the result box. */
const PREVIEW_ROWS = 25;
const PREVIEW_COLUMNS = 8;

export default defineTool<string, Options>({
  slug: 'json-to-csv',
  category: 'developer',
  cluster: 'json',

  name: 'JSON to CSV',
  tagline: 'Convert JSON to a spreadsheet-ready CSV — every field, not only the first record’s.',
  titleBenefit: 'Every Field, Excel-Safe',
  description:
    'Convert JSON to CSV with a header built from every record, not just the first. Nested objects flatten to dotted columns and the file opens correctly in Excel.',
  keywords: ['json to csv', 'convert json to csv', 'json to excel', 'json to spreadsheet', 'flatten json to csv'],

  runtime: 'client',
  status: 'live',
  premium: false,
  apiEnabled: true,

  score: { demand: 8, evergreen: 9, serp: 6, money: 5, ease: 8 },

  input: {
    type: 'text',
    label: 'JSON',
    placeholder: '[{"id":1,"name":"…"}]',
    rows: 12,
    sample:
      '{"data":[\n' +
      '  {"id":1,"name":"Ada Lovelace","email":"ada@example.com","address":{"city":"London","country":"GB"},"tags":["admin","founder"]},\n' +
      '  {"id":2,"name":"Grace Hopper","email":"grace@example.org","address":{"city":"New York","country":"US"},"tags":["admin"],"deletedAt":null},\n' +
      '  {"id":3,"name":"Alan Turing","email":"alan@example.net","address":{"city":"Wilmslow","country":"GB"},"tags":[],"lastLogin":"2026-08-14T09:20:00Z"}\n' +
      ']}',
  },

  options: [
    {
      key: 'delimiter',
      type: 'enum',
      label: 'Delimiter',
      default: 'comma',
      values: [
        { value: 'comma', label: 'Comma (,)' },
        { value: 'semicolon', label: 'Semicolon (;)' },
        { value: 'tab', label: 'Tab' },
        { value: 'pipe', label: 'Pipe (|)' },
      ],
      help: 'Excel on a European locale expects a semicolon, because the comma is the decimal separator there.',
    },
    { key: 'header', type: 'bool', label: 'Include a header row', default: true },
    {
      key: 'arrays',
      type: 'enum',
      label: 'Nested arrays become',
      default: 'join',
      values: [
        { value: 'join', label: 'One column, values joined' },
        { value: 'index', label: 'One column per element — tags[0], tags[1]' },
        { value: 'json', label: 'One column holding raw JSON' },
      ],
    },
    {
      key: 'joinWith',
      type: 'text',
      label: 'Joined with',
      default: '; ',
      maxLength: 8,
      showIf: { key: 'arrays', equals: 'join' },
      help: 'A semicolon rather than a comma, so the cell does not need quoting in a comma-delimited file.',
    },
    {
      key: 'nullAs',
      type: 'text',
      label: 'Write null as',
      default: '',
      maxLength: 16,
      help: 'Empty by default. Use NULL if the file is going into a database import that distinguishes the two.',
    },
    {
      key: 'bom',
      type: 'bool',
      label: 'Add a UTF-8 byte order mark',
      default: true,
      help: 'Without it, Excel opens the file in the system codepage and any non-English name arrives mangled.',
    },
    {
      key: 'crlf',
      type: 'bool',
      label: 'Windows line endings (CRLF)',
      default: false,
      help: 'What RFC 4180 specifies. Only older Windows tooling still needs it.',
    },
    {
      key: 'guardFormulas',
      type: 'bool',
      label: 'Neutralise spreadsheet formulas',
      default: true,
      help: 'Prefixes a cell starting with =, +, - or @ with an apostrophe, so a spreadsheet shows it instead of running it.',
    },
  ],

  output: { type: 'text', mono: true, label: 'CSV' },

  howTo: [
    {
      title: 'Paste the JSON',
      detail: 'An array of objects, or a whole API response — a `{"data": [...]}` wrapper is found for you and the path used is reported.',
    },
    {
      title: 'Choose how nested arrays should look',
      detail: 'Joined into one cell for reading, one column per element for sorting, or raw JSON when the file is going back into code.',
    },
    {
      title: 'Check the columns that appeared late',
      detail: 'Fields that only exist on some records are listed under the result. That is the case a first-record header would have dropped.',
    },
    {
      title: 'Download and open it',
      detail: 'The byte order mark is on by default so Excel reads it as UTF-8. Turn it off if the file is going to a script instead.',
    },
  ],

  faq: [
    {
      q: 'Why does my CSV have columns that other converters miss?',
      a: 'Because the header is the union of the keys across every record, not the keys of the first one. If a field appears only from record 40 onwards, a first-record header drops it silently and the export looks complete. Any key that appeared late is listed under the result.',
    },
    {
      q: 'How are nested objects handled?',
      a: 'They flatten to dotted column names: `address.city`, `address.country`. Nesting can go as deep as it likes; the depth reached is reported alongside the row and column counts.',
    },
    {
      q: 'Why do non-English characters break when I open the file in Excel?',
      a: 'Excel does not assume UTF-8. Without a byte order mark it opens a CSV in the system codepage, so accents and non-Latin scripts arrive as mojibake. The BOM is on by default here, which is the fix. Turn it off for a file going to a script, where the BOM is an unwanted first character.',
    },
    {
      q: 'What is the formula guard for?',
      a: 'A cell whose value starts with =, +, - or @ is treated as a formula by Excel, Sheets and LibreOffice. Data that came from a form submission can therefore execute when someone opens the export. The guard prefixes those cells with an apostrophe, so the value is shown rather than run.',
    },
    {
      q: 'Can it convert an object that is not an array?',
      a: 'Yes — a single object becomes a single row. If the input is an object containing an array of objects, that array is used and the path is shown, because pasting a whole REST response is what people actually do.',
    },
    {
      q: 'Is my data uploaded?',
      a: 'No. Parsing, flattening and quoting all happen in your browser. This matters here more than on most tools: the JSON people convert to CSV is usually an export of customer records.',
    },
  ],

  infoGain: {
    summary:
      'The header is built from every record, not the first one. That single difference is what stops a field appearing at record 40 from being silently dropped, which is the failure mode of almost every converter online and the one that produces an export that looks complete and is not.',
    table: {
      caption: 'Choices this tool makes, and why',
      head: ['Situation', 'Common behaviour', 'Here'],
      rows: [
        ['A key exists on some records only', 'Dropped, or the row shifts', 'A column with empty cells, and the key is reported'],
        ['Nested object', 'JSON dumped into one cell', 'Flattened to address.city, address.country'],
        ['Non-ASCII text opened in Excel', 'Mojibake', 'UTF-8 byte order mark, on by default'],
        ['A value starting with "="', 'Excel runs it as a formula', 'Prefixed with an apostrophe'],
        ['A field containing the delimiter', 'The row gains a column', 'Quoted per RFC 4180'],
      ],
    },
    supports: [
      'RFC 4180 quoting, generalised to comma, semicolon, tab and pipe',
      'Union header across all records, in first-seen order',
      'Dotted paths for nested objects, three strategies for nested arrays',
      'UTF-8 BOM, CRLF line endings and a spreadsheet formula guard',
      'Automatic descent into a {"data": [...]} style response wrapper',
    ],
    limits: [
      'Column names use a dot separator, which Power Query treats as a hierarchy. Rename the columns after import if that is a problem.',
      'Numbers pass through JavaScript, so an integer beyond 2^53 loses precision. Keep those as strings in the source.',
      'A CSV has no types. Everything arrives as text, and the spreadsheet guesses — including turning long digit strings into scientific notation.',
      'Records are held in memory, so this is comfortable to a few tens of megabytes rather than to a gigabyte.',
    ],
    verified: '2026-08',
  },

  related: [
    'json-formatter',
    'text-to-columns',
    'json-to-yaml',
    'json-diff',
    'json-to-typescript',
    'sort-lines',
    'remove-duplicate-lines',
    'regex-tester',
  ],
  nextSteps: ['text-to-columns', 'json-formatter', 'json-diff'],

  added: '2026-08-17',
  updated: '2026-08-17',

  run: (input, options) => {
    if (input.trim() === '') return { output: '' };

    let parsed: unknown;
    try {
      parsed = parseJson(input);
    } catch (err) {
      const { message, hint } = describeJsonError(err);
      throw new ToolError(message, hint);
    }

    const table = jsonToTable(parsed, {
      arrays: options.arrays,
      separator: '.',
      joinWith: options.joinWith,
      nullAs: options.nullAs,
    });

    if (table.header.length === 0) {
      throw new ToolError(
        'There is nothing to tabulate — the JSON parsed, but it holds no fields.',
        'A CSV needs records with named fields. An array of plain numbers or strings gives a single "value" column; an empty array or object gives nothing.',
      );
    }

    const delimiter = DELIMITERS[options.delimiter];
    const output = toDelimited(table, {
      delimiter,
      includeHeader: options.header,
      bom: options.bom,
      crlf: options.crlf,
      guardFormulas: options.guardFormulas,
    });

    const notes: string[] = [];
    if (table.source !== '$') {
      notes.push(`Records were read from ${table.source}, the first array of objects in the document.`);
    }
    if (table.lateColumns.length > 0) {
      notes.push(
        `${table.lateColumns.length} column${table.lateColumns.length === 1 ? '' : 's'} appeared after the first record and would be missing from a first-record header: ${table.lateColumns
          .slice(0, 8)
          .join(', ')}${table.lateColumns.length > 8 ? ', …' : ''}.`,
      );
    }
    if (table.sparseRows > 0) {
      notes.push(
        `${table.sparseRows} of ${table.rows.length} records do not carry every column. Those cells are empty rather than shifted.`,
      );
    }
    if (options.bom) {
      notes.push('A UTF-8 byte order mark is included, so Excel opens the file correctly. It counts as three bytes and some scripts will read it as part of the first column name.');
    }

    return {
      output,
      filename: options.delimiter === 'tab' ? 'data.tsv' : 'data.csv',
      stats: [
        { label: 'Rows', value: table.rows.length, primary: true },
        { label: 'Columns', value: table.header.length, primary: true },
        { label: 'Nesting flattened', value: `${table.depth} levels`, primary: true },
        { label: 'CSV size', value: formatBytes(new TextEncoder().encode(output).length), primary: true },

        { label: 'Records read from', value: table.source },
        { label: 'Columns found late', value: table.lateColumns.length },
        { label: 'Records missing a column', value: table.sparseRows },
        { label: 'JSON size', value: formatBytes(new TextEncoder().encode(input).length) },
      ],
      table: {
        caption:
          table.rows.length > PREVIEW_ROWS
            ? `Preview — first ${PREVIEW_ROWS} of ${table.rows.length} rows`
            : 'Preview',
        head: table.header.slice(0, PREVIEW_COLUMNS),
        rows: table.rows.slice(0, PREVIEW_ROWS).map((r) => r.slice(0, PREVIEW_COLUMNS)),
      },
      notes: notes.length > 0 ? notes : undefined,
    };
  },
});
