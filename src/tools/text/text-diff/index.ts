import { defineTool } from '@core/tool';
import { diffLines } from '@engines/text';

interface Options {
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
  hideUnchanged: boolean;
}

export default defineTool<[string, string], Options>({
  slug: 'text-diff',
  category: 'text',
  cluster: 'text-compare',

  name: 'Text Diff',
  tagline: 'Compare two blocks of text and see exactly which lines changed.',
  titleBenefit: 'See Exactly What Changed',
  description:
    'Compare two texts line by line and see additions and removals side by side. Handles files of thousands of lines in the browser, with no upload and no account.',
  keywords: ['text compare', 'diff checker', 'compare two texts', 'text difference tool', 'online diff'],

  runtime: 'client',
  status: 'live',
  premium: false,
  apiEnabled: true,

  score: { demand: 8, evergreen: 10, serp: 6, money: 4, ease: 8 },

  input: {
    type: 'text-pair',
    labelA: 'Original',
    labelB: 'Changed',
    placeholder: 'Paste text here…',
    rows: 12,
    sampleA: 'const port = 3000;\nconst host = "localhost";\nstart(host, port);\n\n// TODO: add logging',
    sampleB: 'const port = 8080;\nconst host = "localhost";\nconst debug = true;\nstart(host, port);',
  },

  options: [
    {
      key: 'ignoreWhitespace',
      type: 'bool',
      label: 'Ignore leading and trailing spaces',
      default: false,
      help: 'Useful when one file was reindented and you only care about real edits.',
    },
    { key: 'ignoreCase', type: 'bool', label: 'Ignore case', default: false },
    {
      key: 'hideUnchanged',
      type: 'bool',
      label: 'Show only changed lines',
      default: false,
      help: 'Hides identical lines so a small edit in a large file is easy to find.',
    },
  ],

  output: { type: 'diff' },

  howTo: [
    { title: 'Paste the original on the left', detail: 'Any text works — code, prose, a CSV export, a log file.' },
    { title: 'Paste the changed version on the right', detail: 'The comparison updates as you type. Nothing is uploaded.' },
    { title: 'Read the result', detail: 'Removed lines are marked with a minus, added lines with a plus. Colour is never the only signal.' },
  ],

  faq: [
    {
      q: 'How does the comparison work?',
      a: 'It computes the longest common subsequence of the two line lists, which is the same algorithm family that git diff uses. That finds the minimal set of insertions and deletions, rather than reporting everything after the first change as different.',
    },
    {
      q: 'Is my text uploaded anywhere?',
      a: 'No. The comparison runs entirely in your browser. That matters more here than on most tools, because people diff contracts, config files with credentials in them, and unreleased code.',
    },
    {
      q: 'How large can the two texts be?',
      a: 'Comfortably a few thousand lines each. Identical leading and trailing sections are trimmed before the comparison starts, so two 20,000-line files that differ in ten places compare almost instantly.',
    },
    {
      q: 'Does it show which characters changed within a line?',
      a: 'Not yet — this is a line-level diff. A line with one changed character shows as one removal and one addition. Word-level highlighting is on the roadmap.',
    },
    {
      q: 'Why do two lines that look identical show as different?',
      a: 'Almost always trailing whitespace, or a CRLF line ending meeting an LF one. Turn on "ignore leading and trailing spaces" to confirm; if the difference disappears, that was it.',
    },
  ],

  infoGain: {
    summary:
      'Comparison uses a longest-common-subsequence diff, the same approach as git, so a line inserted near the top does not mark every line after it as changed. Identical prefixes and suffixes are trimmed first, which is what keeps large files fast: two 20,000-line files differing in ten places skip more than 99% of the work.',
    benchmarks: [
      { label: '500 vs 500 lines, 2 edits', value: '1.6 ms', note: 'i5-6300U, Chrome 151, median of 8' },
      {
        label: '5,000 vs 5,000, 20 edits',
        value: '1.0 ms',
        note: 'faster than the 500-line case — trimming the identical prefix and suffix skips almost the whole table',
      },
      {
        label: '2,000 vs 2,000, fully different',
        value: '43.6 ms',
        note: 'the genuine worst case, where nothing can be trimmed',
      },
    ],
    supports: [
      'Line-level additions and deletions with original line numbers',
      'Mixed CRLF, LF and CR line endings',
      'Whitespace-insensitive and case-insensitive comparison',
      'Symbols as well as colour, so the result works with colour vision deficiency',
    ],
    limits: [
      'Line-level only. A one-character edit reads as a delete plus an add.',
      'Beyond about 2,000 differing lines on each side the comparison falls back to a whole-block replacement to avoid freezing the tab.',
      'Not a merge tool — it shows differences, it does not resolve them.',
    ],
    verified: '2026-08',
  },

  related: [
    'remove-duplicate-lines',
    'sort-lines',
    'word-counter',
    'case-converter',
    'json-formatter',
    'resume-checker',
    'readability-checker',
    'find-and-replace',
    'remove-extra-spaces',
  ],
  nextSteps: ['remove-duplicate-lines', 'word-counter', 'json-formatter'],

  added: '2026-08-08',
  updated: '2026-08-08',

  run: ([a, b], options) => {
    const normalise = (s: string) => {
      let out = s;
      if (options.ignoreWhitespace) {
        out = out
          .split(/\r\n|\r|\n/)
          .map((l) => l.trim())
          .join('\n');
      }
      return options.ignoreCase ? out.toLowerCase() : out;
    };

    // Compare on the normalised text, but display the original lines, so
    // "ignore case" never rewrites the user's content in the output.
    const rows = diffLines(normalise(a), normalise(b));
    const originalA = a.split(/\r\n|\r|\n/);
    const originalB = b.split(/\r\n|\r|\n/);

    const restored = rows.map((row) => ({
      ...row,
      left: row.leftNo !== undefined ? originalA[row.leftNo - 1] : undefined,
      right: row.rightNo !== undefined ? originalB[row.rightNo - 1] : undefined,
    }));

    const visible = options.hideUnchanged ? restored.filter((r) => r.kind !== 'same') : restored;

    const added = restored.filter((r) => r.kind === 'add').length;
    const removed = restored.filter((r) => r.kind === 'remove').length;

    return {
      diff: visible,
      stats: [
        { label: 'Lines added', value: added, primary: true },
        { label: 'Lines removed', value: removed, primary: true },
        { label: 'Lines unchanged', value: restored.length - added - removed, primary: true },
      ],
      notes:
        added === 0 && removed === 0 && (a !== '' || b !== '')
          ? ['The two texts are identical under the current settings.']
          : undefined,
    };
  },
});
