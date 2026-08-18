import { defineTool, ToolError } from '@core/tool';
import { describeJsonError, formatBytes, parseJson, sortKeysDeep } from '@engines/format';
import { toYaml, type QuoteStyle } from '@engines/yaml';

interface Options {
  indent: '2' | '4';
  quote: QuoteStyle;
  blockScalars: boolean;
  sortKeys: boolean;
  documentStart: boolean;
}

export default defineTool<string, Options>({
  slug: 'json-to-yaml',
  category: 'developer',
  cluster: 'json',

  name: 'JSON to YAML',
  tagline: 'Convert JSON to YAML with the strings YAML would misread quoted for you.',
  titleBenefit: 'Quoted Where It Matters',
  description:
    'Convert JSON to YAML with correct quoting. Strings such as NO, on, 1.20 and 09:30 are quoted automatically, because unquoted they load back as booleans and numbers.',
  keywords: ['json to yaml', 'convert json to yaml', 'json to yml', 'yaml converter', 'json to kubernetes yaml'],

  runtime: 'client',
  status: 'live',
  premium: false,
  apiEnabled: true,

  score: { demand: 7, evergreen: 9, serp: 7, money: 4, ease: 8 },

  input: {
    type: 'text',
    label: 'JSON',
    placeholder: '{"name":"…"}',
    rows: 12,
    sample:
      '{\n' +
      '  "name": "checkout-api",\n' +
      '  "version": "1.20",\n' +
      '  "country": "NO",\n' +
      '  "shell": "sh",\n' +
      '  "featureFlags": { "walletV2": "off", "applePay": "yes" },\n' +
      '  "startsAt": "09:30",\n' +
      '  "ports": [8080, 8443],\n' +
      '  "healthcheck": "curl -fsS http://localhost:8080/health\\nexit $?"\n' +
      '}',
  },

  options: [
    {
      key: 'indent',
      type: 'enum',
      label: 'Indentation',
      default: '2',
      values: [
        { value: '2', label: '2 spaces' },
        { value: '4', label: '4 spaces' },
      ],
      help: 'YAML forbids tabs for indentation entirely, so they are not offered.',
    },
    {
      key: 'quote',
      type: 'enum',
      label: 'Quoting',
      default: 'minimal',
      values: [
        { value: 'minimal', label: 'Only where it is needed' },
        { value: 'single', label: 'Every string, single quotes' },
        { value: 'double', label: 'Every string, double quotes' },
      ],
      help: 'Minimal is the readable default and still quotes anything that would change type. Quote everything when the file is generated rather than read.',
    },
    {
      key: 'blockScalars',
      type: 'bool',
      label: 'Multi-line strings as | blocks',
      default: true,
      help: 'A literal block needs no escaping, so a pasted script or certificate stays readable. Off, newlines become \\n inside a quoted string.',
    },
    {
      key: 'sortKeys',
      type: 'bool',
      label: 'Sort keys alphabetically',
      default: false,
      help: 'Makes two generated files comparable in a diff. YAML mappings have no defined order, so this changes nothing about what the file means.',
    },
    {
      key: 'documentStart',
      type: 'bool',
      label: 'Begin with ---',
      default: false,
      help: 'Required when several documents share one file, and conventional for Kubernetes manifests.',
    },
  ],

  output: { type: 'text', mono: true, language: 'yaml', label: 'YAML' },

  howTo: [
    {
      title: 'Paste the JSON',
      detail: 'It is parsed and validated first, so an error names the line and column rather than producing half a YAML file.',
    },
    {
      title: 'Look at what got quoted',
      detail: 'Any string that would have been read back as a boolean, a number, a date or a time is listed under the result. Those are the ones a naive converter breaks.',
    },
    {
      title: 'Choose block scalars for anything multi-line',
      detail: 'A script, a certificate or an SQL statement reads as itself under a | block, and as one long escaped line without it.',
    },
    {
      title: 'Copy it into your config',
      detail: 'The output is valid under both YAML 1.1 and 1.2, which means it means the same thing in Python, Go, Ruby and your CI runner.',
    },
  ],

  faq: [
    {
      q: 'Why is "NO" quoted in the output?',
      a: 'Because unquoted it is not the string NO. YAML 1.1 resolves y, yes, n, no, on and off to booleans, so `country: NO` loads as `country: false` — the country code for Norway becomes a boolean. PyYAML, SnakeYAML 1.x and Ruby\'s Psych all do this today, which is why the quotes are added rather than left to you.',
    },
    {
      q: 'Which strings get quoted, exactly?',
      a: 'Anything a YAML parser would resolve to a non-string: the boolean words, null and ~, anything number-shaped including hex and leading-zero octal, .inf and .nan, sexagesimals such as 09:30, and date-shaped strings such as 2026-08-17. Also anything structurally unsafe — a leading indicator character, a colon-space, or leading and trailing whitespace.',
    },
    {
      q: 'Is the output YAML 1.1 or 1.2?',
      a: 'It is valid under both, which is the point. The two versions disagree about which bare words are booleans, and which one applies depends on the parser rather than on the document. Quoting for the stricter interpretation means the file means the same thing everywhere.',
    },
    {
      q: 'Why can I not indent with tabs?',
      a: 'YAML forbids tab characters for indentation at the specification level, in every version. A tab in the indentation is a parse error, not a style preference, so the option is not offered here.',
    },
    {
      q: 'What happens to a multi-line string?',
      a: 'It becomes a literal block — `|` — when every line is free of leading and trailing whitespace, which is the condition under which a block round-trips exactly. The chomping indicator is chosen from the actual number of trailing newlines, so `|`, `|-` and `|+` are all used rather than one being applied to everything.',
    },
    {
      q: 'Does it convert YAML back to JSON?',
      a: 'No. This direction only. Parsing YAML correctly means implementing anchors, aliases, tags, multiple documents and both minor versions, and a partial parser that silently mishandles an anchor is worse than none.',
    },
  ],

  infoGain: {
    summary:
      'The difference is the quoting. YAML 1.1 reads y, yes, no, on and off as booleans, along with anything number, date or sexagesimal shaped, and which rules apply depends on the parser rather than the document. Every string that would come back as a different type is quoted here, and the ones that were are listed with the result.',
    table: {
      caption: 'Strings a naive converter changes the meaning of',
      head: ['JSON value', 'Emitted bare', 'A YAML 1.1 parser reads', 'Here'],
      rows: [
        ['"NO"', 'country: NO', 'false', "country: 'NO'"],
        ['"on"', 'mode: on', 'true', "mode: 'on'"],
        ['"1.20"', 'version: 1.20', '1.2 (number)', "version: '1.20'"],
        ['"09:30"', 'startsAt: 09:30', '570 (sexagesimal)', "startsAt: '09:30'"],
        ['"0755"', 'mode: 0755', '493 (octal)', "mode: '0755'"],
        ['"2026-08-17"', 'day: 2026-08-17', 'a date object', "day: '2026-08-17'"],
        ['"~"', 'value: ~', 'null', "value: '~'"],
      ],
    },
    supports: [
      'YAML 1.1 and 1.2 ambiguity handling, applied to keys as well as values',
      'Literal block scalars with the correct chomping indicator',
      'Two and four space indentation, with sequences aligned under either',
      'Single, double and minimal quoting styles',
      'Empty objects and arrays as {} and [], not as blank values',
      'A document start marker for multi-document files',
    ],
    limits: [
      'One direction. YAML to JSON is not offered, because a partial YAML parser that mishandles anchors quietly is worse than no parser.',
      'No anchors, aliases or tags in the output — JSON has no concept that maps to them, so repeated structures are written out in full.',
      'Comments cannot be produced, because JSON cannot carry them.',
      'Line width is not wrapped. A very long string stays on one line rather than being folded, which keeps the value exact.',
    ],
    verified: '2026-08',
  },

  related: [
    'json-formatter',
    'json-to-csv',
    'json-diff',
    'json-to-typescript',
    'text-diff',
    'jwt-decoder',
    'regex-tester',
    'find-and-replace',
  ],
  nextSteps: ['json-formatter', 'json-diff', 'json-to-csv'],

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

    const { yaml, stats } = toYaml(options.sortKeys ? sortKeysDeep(parsed) : parsed, {
      indent: options.indent === '4' ? 4 : 2,
      sortKeys: false,
      blockScalars: options.blockScalars,
      quote: options.quote,
      documentStart: options.documentStart,
    });

    const jsonBytes = new TextEncoder().encode(input).length;
    const yamlBytes = new TextEncoder().encode(yaml).length;

    const notes: string[] = [];
    if (stats.ambiguousScalars.length > 0) {
      notes.push(
        `Quoted because YAML would otherwise change their type: ${stats.ambiguousScalars
          .map((s) => `"${s}"`)
          .join(', ')}. Unquoted, each of these loads back as a boolean, number, date or null.`,
      );
    }
    if (stats.blockScalars > 0) {
      notes.push(
        `${stats.blockScalars} multi-line string${stats.blockScalars === 1 ? '' : 's'} written as a literal block, with the chomping indicator chosen from the trailing newlines so the value round-trips exactly.`,
      );
    }
    if (options.quote !== 'minimal') {
      notes.push('Every string is quoted, so nothing depends on the parser’s resolution rules — at the cost of readability.');
    }

    return {
      output: yaml,
      filename: 'data.yaml',
      stats: [
        { label: 'Lines', value: stats.lines, primary: true },
        { label: 'Strings quoted', value: stats.quotedScalars, primary: true },
        { label: 'Type-ambiguous', value: stats.ambiguousScalars.length, primary: true },
        { label: 'Nesting depth', value: stats.maxDepth, primary: true },

        { label: 'Block scalars', value: stats.blockScalars },
        { label: 'YAML size', value: formatBytes(yamlBytes) },
        {
          label: 'JSON size',
          value: formatBytes(jsonBytes),
          hint: jsonBytes > 0 ? `${Math.round((1 - yamlBytes / jsonBytes) * 100)}% smaller as YAML` : undefined,
        },
      ],
      notes: notes.length > 0 ? notes : undefined,
    };
  },
});
