import { defineTool, ToolError } from '@core/tool';
import { formatBytes, formatJson, inspectJson, JsonParseError, minifyJson, parseJson, type IndentStyle } from '@engines/format';

interface Options {
  mode: 'beautify' | 'minify';
  indent: IndentStyle;
  sortKeys: boolean;
}

export default defineTool<string, Options>({
  slug: 'json-formatter',
  category: 'developer',
  cluster: 'json',

  name: 'JSON Formatter',
  tagline: 'Format, validate and minify JSON — with errors that point at the line.',
  titleBenefit: 'Format, Validate, Minify',
  description:
    'Beautify or minify JSON and validate it in one pass. When parsing fails you get the line, column, offending text and likely cause — not a raw engine message.',
  keywords: ['json formatter', 'json beautifier', 'json validator', 'format json online', 'minify json'],

  runtime: 'client',
  status: 'live',
  premium: false,
  apiEnabled: true,

  // Anchor tool for the whole JSON cluster.
  score: { demand: 9, evergreen: 10, serp: 5, money: 5, ease: 9 },

  input: {
    type: 'text',
    label: 'JSON',
    placeholder: '{"paste":"your json here"}',
    rows: 12,
    sample: '{"name":"AdeptBay","live":true,"tools":["word-counter","json-formatter"],"stats":{"categories":11,"target":1000},"launched":"2026-08-08"}',
  },

  options: [
    {
      key: 'mode',
      type: 'enum',
      label: 'Mode',
      default: 'beautify',
      values: [
        { value: 'beautify', label: 'Beautify' },
        { value: 'minify', label: 'Minify' },
      ],
    },
    {
      key: 'indent',
      type: 'enum',
      label: 'Indentation',
      default: '2',
      showIf: { key: 'mode', equals: 'beautify' },
      values: [
        { value: '2', label: '2 spaces' },
        { value: '4', label: '4 spaces' },
        { value: 'tab', label: 'Tab' },
      ],
    },
    {
      key: 'sortKeys',
      type: 'bool',
      label: 'Sort object keys alphabetically',
      default: false,
      help: 'Makes two dumps of the same data comparable in a diff tool.',
    },
  ],

  output: { type: 'text', mono: true, language: 'json', label: 'Formatted JSON' },

  howTo: [
    { title: 'Paste your JSON', detail: 'It is parsed as you type. Nothing is uploaded, so pasting a production payload is safe.' },
    { title: 'Read the error, if there is one', detail: 'Invalid JSON shows the line, column, the offending text and the most likely cause.' },
    { title: 'Beautify or minify', detail: 'Beautify for reading, minify for shipping. The size saving is shown alongside the result.' },
  ],

  faq: [
    {
      q: 'Why does my JSON say "Unexpected token" when it looks correct?',
      a: 'The three usual causes are a trailing comma before a closing bracket, single quotes instead of double quotes, and unquoted property names. All three are valid JavaScript and none of them are valid JSON. This tool names which one it found.',
    },
    {
      q: 'Is my JSON sent to a server?',
      a: 'No. Parsing and formatting run in your browser using the built-in JSON parser. API responses routinely contain tokens, customer records and internal identifiers, which is exactly why this tool has no server to send them to.',
    },
    {
      q: 'What does sorting keys do?',
      a: 'It orders every object\'s keys alphabetically, at every level of nesting. JSON objects have no defined order, so two dumps of identical data can differ only in key order. Sorting both makes them comparable in a diff.',
    },
    {
      q: 'Does it support JSON5, JSONC or comments?',
      a: 'No. This validates against the JSON specification, so comments, trailing commas and unquoted keys are all reported as errors. That is the point — if it parses here it will parse in your language\'s standard library.',
    },
    {
      q: 'How large a file can it handle?',
      a: 'Around 10 MB comfortably. Above that the browser\'s own JSON.parse becomes the constraint, not this tool, and the result is likely to be too large to read on screen anyway.',
    },
    {
      q: 'Why is my minified output larger than expected?',
      a: 'Minifying only removes whitespace. If the input was already compact, the saving is near zero. The percentage shown next to the result is measured on your actual input, not estimated.',
    },
  ],

  infoGain: {
    summary:
      'When JSON fails to parse, most online formatters print the browser\'s raw message: "Unexpected token } in JSON at position 847". This tool resolves that byte offset to a line and column, quotes the offending line, points a caret at the character, and names the likely cause from the six mistakes that account for nearly all invalid JSON.',
    table: {
      caption: 'The errors this tool explains rather than reports',
      head: ['Mistake', 'Raw engine message', 'What you get here'],
      rows: [
        ['Trailing comma', 'Unexpected token }', 'Line 4, column 22 — trailing comma before this bracket'],
        ["Single quotes", 'Unexpected token \'', 'Line 2, column 11 — JSON strings need double quotes'],
        ['Unquoted key', 'Unexpected token n', 'Line 3, column 3 — property names must be quoted'],
        ['Truncated file', 'Unexpected end of JSON input', 'A bracket was opened and never closed'],
      ],
    },
    supports: [
      'RFC 8259 JSON, validated by the browser\'s own parser',
      'Two, four and tab indentation',
      'Recursive key sorting at every nesting level',
      'Structure read-out: depth, key count, array and object counts',
      'Measured minification saving on your own input',
    ],
    limits: [
      'Strict JSON only — no comments, trailing commas or unquoted keys.',
      'Numbers round-trip through JavaScript, so integers beyond 2^53 lose precision. Keep those as strings.',
      'Key order is preserved unless you sort, but duplicate keys collapse to the last one, as the specification requires.',
    ],
    verified: '2026-08',
  },

  related: [
    'base64-encoder',
    'url-encoder',
    'uuid-generator',
    'text-diff',
    'hash-generator',
    'word-counter',
    'text-to-columns',
  ],
  nextSteps: ['text-diff', 'base64-encoder', 'hash-generator'],

  added: '2026-08-08',
  updated: '2026-08-08',

  run: (input, options) => {
    if (input.trim() === '') return { output: '' };

    let parsed: unknown;
    try {
      parsed = parseJson(input);
    } catch (err) {
      if (err instanceof JsonParseError) {
        const d = err.detail;
        const where = d.line > 0 ? `Line ${d.line}, column ${d.column}` : 'Invalid JSON';
        const quoted = d.excerpt ? `\n\n  ${d.excerpt}\n  ${d.pointer}` : '';
        throw new ToolError(`${where} — ${d.message}${quoted}`, d.hint);
      }
      throw err;
    }

    const beautified = formatJson(input, options.indent, options.sortKeys);
    const minified = minifyJson(input, options.sortKeys);
    const output = options.mode === 'minify' ? minified : beautified;

    const shape = inspectJson(parsed, input, minified);
    const originalBytes = new TextEncoder().encode(input).length;
    const saving = originalBytes > 0 ? Math.round((1 - shape.minifiedBytes / originalBytes) * 100) : 0;

    return {
      output,
      filename: options.mode === 'minify' ? 'data.min.json' : 'data.json',
      stats: [
        { label: 'Valid JSON', value: 'Yes', primary: true },
        { label: 'Root type', value: shape.rootType, primary: true },
        { label: 'Nesting depth', value: shape.depth, primary: true },
        {
          label: 'Minified size',
          value: formatBytes(shape.minifiedBytes),
          hint: saving > 0 ? `${saving}% smaller` : undefined,
          primary: true,
        },

        { label: 'Keys', value: shape.keys },
        { label: 'Objects', value: shape.objects },
        { label: 'Arrays', value: shape.arrays },
        { label: 'Null values', value: shape.nulls },
        { label: 'Original size', value: formatBytes(originalBytes) },
      ],
    };
  },
});
