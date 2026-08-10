import { defineTool } from '@core/tool';
import { numberLines, splitLines, stripLineNumbers } from '@engines/text';

interface Options {
  mode: 'add' | 'remove';
  start: number;
  step: number;
  separator: string;
  padTo: number;
  skipBlank: boolean;
  prefix: string;
  suffix: string;
}

const SEPARATORS: Record<string, string> = {
  '. ': '1. text',
  ': ': '1: text',
  ') ': '1) text',
  ' | ': '1 | text',
  '\t': '1⇥text  (tab)',
  ' ': '1 text',
};

export default defineTool<string, Options>({
  slug: 'line-numberer',
  category: 'text',
  cluster: 'text-lines',

  name: 'Line Numberer',
  tagline: 'Add line numbers — or strip the ones you pasted in by accident.',
  description:
    'Add numbers to every line with a custom start, step, padding and separator. Also strips existing line numbers — what you need after copying from a code sample.',
  keywords: [
    'add line numbers to text',
    'line number generator',
    'remove line numbers',
    'number lines online',
  ],

  runtime: 'client',
  status: 'live',
  premium: false,
  apiEnabled: true,

  score: { demand: 5, evergreen: 10, serp: 9, money: 3, ease: 10 },

  input: {
    type: 'text',
    label: 'Your text',
    placeholder: 'One item per line…',
    rows: 9,
    sample: 'Install the dependencies\nRun the migration\nStart the worker\n\nCheck the health endpoint\nDeploy',
  },

  options: [
    {
      key: 'mode',
      type: 'enum',
      label: 'Mode',
      default: 'add',
      values: [
        { value: 'add', label: 'Add line numbers' },
        { value: 'remove', label: 'Remove existing line numbers' },
      ],
    },
    { key: 'start', type: 'number', label: 'Start at', default: 1, min: -9999, max: 999999, showIf: { key: 'mode', equals: 'add' } },
    { key: 'step', type: 'number', label: 'Step by', default: 1, min: 1, max: 1000, showIf: { key: 'mode', equals: 'add' } },
    {
      key: 'separator',
      type: 'enum',
      label: 'Separator',
      default: '. ',
      values: Object.entries(SEPARATORS).map(([value, label]) => ({ value, label })),
      showIf: { key: 'mode', equals: 'add' },
    },
    {
      key: 'padTo',
      type: 'number',
      label: 'Zero-pad to width',
      default: 0,
      min: 0,
      max: 10,
      showIf: { key: 'mode', equals: 'add' },
      help: '0 auto-sizes to the largest number, so the text stays aligned.',
    },
    {
      key: 'skipBlank',
      type: 'bool',
      label: 'Do not number blank lines',
      default: true,
      showIf: { key: 'mode', equals: 'add' },
    },
    {
      key: 'prefix',
      type: 'text',
      label: 'Prefix',
      default: '',
      placeholder: 'before the number',
      showIf: { key: 'mode', equals: 'add' },
    },
    {
      key: 'suffix',
      type: 'text',
      label: 'Suffix',
      default: '',
      placeholder: 'at the end of the line',
      showIf: { key: 'mode', equals: 'add' },
    },
  ],

  output: { type: 'text', label: 'Result' },

  howTo: [
    { title: 'Paste your lines', detail: 'Any line ending works — CRLF, LF or CR.' },
    {
      title: 'Set the numbering',
      detail: 'Zero-padding keeps the text aligned once you pass line 9, which is what makes a numbered list readable in a monospace font.',
    },
    {
      title: 'Or strip numbers instead',
      detail: 'Switch to remove mode to clean up text copied out of a code sample, a log viewer or a PDF.',
    },
  ],

  faq: [
    {
      q: 'How do I remove line numbers from copied code?',
      a: 'Switch the mode to "remove existing line numbers". It strips a leading number followed by a common separator — a dot, colon, bracket, pipe, tab or two-plus spaces — and leaves the rest of the line untouched, including its indentation.',
    },
    {
      q: 'Why would I zero-pad the numbers?',
      a: 'Without padding, line 9 and line 10 start at different columns and the text jumps left and right. Padding to a fixed width keeps everything aligned, which matters as soon as you have more than nine lines in a monospace font.',
    },
    {
      q: 'Can I start from zero, or count in steps?',
      a: 'Yes. Start at any number including zero or a negative, and step by any amount — step 10 gives 10, 20, 30 for BASIC-style listings or test case IDs.',
    },
    {
      q: 'What happens to blank lines?',
      a: 'By default they stay blank and are not counted, so the numbering follows the content rather than the whitespace. Turn the option off if you want every physical line numbered including the empty ones.',
    },
    {
      q: 'Will removing numbers damage lines that start with a real number?',
      a: 'It can. A line like "2024 was a good year" begins with a number followed by a space, which matches the pattern. Check the result — the tool reports how many lines it changed so a surprising count is visible immediately.',
    },
  ],

  infoGain: {
    summary:
      'Every competitor adds line numbers. Almost none remove them, which is the direction people actually need more often — you copy a snippet out of a documentation page or a log viewer and the numbers come with it. This tool does both, and its stripper recognises six separator styles rather than assuming one.',
    table: {
      caption: 'Numbered formats the remove mode recognises',
      head: ['Pasted format', 'Example', 'Recognised'],
      rows: [
        ['Dot', '1. const x = 1', 'Yes'],
        ['Colon', '42: const x = 1', 'Yes'],
        ['Bracket', '7) const x = 1', 'Yes'],
        ['Pipe (log viewers)', '128 | const x = 1', 'Yes'],
        ['Tab (GitHub copy)', '15⇥const x = 1', 'Yes'],
        ['Aligned columns', '  9  const x = 1', 'Yes'],
        ['Trailing numbers', 'const x = 1  // 15', 'No — ambiguous with real content'],
      ],
    },
    supports: [
      'Custom start, step, zero-padding and separator',
      'Prefix and suffix on every line',
      'Blank lines skipped or numbered, your choice',
      'Removal of six common numbered formats',
      'CRLF, LF and CR input',
    ],
    limits: [
      'Removal is pattern-based, so a line genuinely starting with a number and a separator will lose it. The changed-line count makes that visible.',
      'Numbers are added as literal text, not as a gutter — pasting the result back into an editor includes them.',
    ],
    verified: '2026-08',
  },

  related: [
    'sort-lines',
    'remove-duplicate-lines',
    'find-and-replace',
    'text-to-columns',
    'remove-extra-spaces',
    'word-counter',
    'text-reverser',
  ],
  nextSteps: ['sort-lines', 'find-and-replace', 'remove-duplicate-lines'],

  added: '2026-08-09',
  updated: '2026-08-09',

  run: (input, options) => {
    if (input === '') return { output: '' };

    const lines = splitLines(input);

    if (options.mode === 'remove') {
      const { text, removed } = stripLineNumbers(input);
      return {
        output: text,
        filename: 'unnumbered.txt',
        stats: [
          { label: 'Numbers removed', value: removed, primary: true },
          { label: 'Lines', value: lines.length, primary: true },
        ],
        notes:
          removed === 0
            ? ['No line numbers found. The stripper looks for a number at the start of a line followed by a dot, colon, bracket, pipe, tab or two spaces.']
            : removed < lines.filter((l) => l.trim()).length
              ? [`${lines.filter((l) => l.trim()).length - removed} non-blank lines did not start with a number and were left alone.`]
              : undefined,
      };
    }

    const numbered = numberLines(input, {
      start: Math.round(options.start),
      step: Math.max(1, Math.round(options.step)),
      padTo: Math.round(options.padTo),
      separator: options.separator,
      skipBlank: options.skipBlank,
    });

    const output = (options.prefix || options.suffix)
      ? numbered
          .split('\n')
          .map((l) => `${options.prefix}${l}${options.suffix}`)
          .join('\n')
      : numbered;

    const counted = options.skipBlank ? lines.filter((l) => l.trim() !== '').length : lines.length;
    const last = Math.round(options.start) + Math.max(0, counted - 1) * Math.max(1, Math.round(options.step));

    return {
      output,
      filename: 'numbered.txt',
      stats: [
        { label: 'Lines numbered', value: counted, primary: true },
        { label: 'Last number', value: last, primary: true },
        { label: 'Total lines', value: lines.length },
      ],
    };
  },
});
