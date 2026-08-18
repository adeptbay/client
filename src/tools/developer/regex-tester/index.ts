import { defineTool, ToolError, type ResultTable } from '@core/tool';
import { MATCH_LIMIT, RegexRiskError, runRegex, type RegexFlagSet } from '@engines/regex';

interface Options extends RegexFlagSet {
  pattern: string;
}

/** Six is the point at which the table stops fitting on a laptop. */
const MAX_GROUP_COLUMNS = 6;

export default defineTool<string, Options>({
  slug: 'regex-tester',
  category: 'developer',
  cluster: 'regex',

  name: 'Regex Tester',
  tagline: 'Test a pattern against real text and see every match, with its line and column.',
  titleBenefit: 'Matches, Groups and Lines',
  description:
    'Test a regular expression against your own text and see every match with its line, column and capture groups. Patterns that would freeze the tab are refused.',
  keywords: [
    'regex tester',
    'regular expression tester',
    'test regex online',
    'javascript regex tester',
    'regex match checker',
  ],

  runtime: 'client',
  status: 'live',
  premium: false,
  apiEnabled: true,

  score: { demand: 8, evergreen: 10, serp: 5, money: 4, ease: 8 },

  input: {
    type: 'text',
    label: 'Test string',
    placeholder: 'Paste the text you want to match against…',
    rows: 10,
    sample:
      '2026-08-16 09:14:02 INFO  order=A-1042 user=ada@example.com total=249.00\n' +
      '2026-08-16 09:14:07 WARN  order=A-1043 user=grace@example.org total=18.50\n' +
      '2026-08-16 09:15:11 ERROR order=A-1044 user=alan@example.net total=1099.99\n' +
      '2026-08-16 09:15:44 INFO  order=A-1045 user=ada@example.com total=32.00',
  },

  options: [
    {
      key: 'pattern',
      type: 'text',
      label: 'Pattern',
      default: '',
      placeholder: String.raw`user=(?<user>[\w.]+)@(?<domain>[\w.]+)`,
      help: 'Write it without the surrounding slashes. Flags are the checkboxes below.',
    },
    {
      key: 'global',
      type: 'bool',
      label: 'Global (g) — find every match',
      default: true,
      help: 'Off, the pattern stops at the first match, which is what String.match does without /g.',
    },
    { key: 'ignoreCase', type: 'bool', label: 'Ignore case (i)', default: false },
    {
      key: 'multiline',
      type: 'bool',
      label: 'Multiline (m) — ^ and $ match each line',
      default: false,
    },
    {
      key: 'dotAll',
      type: 'bool',
      label: 'Dot matches newline (s)',
      default: false,
      help: 'Without this, "." stops at a line break — the usual reason a pattern fails on multi-line text.',
    },
    {
      key: 'unicode',
      type: 'bool',
      label: 'Unicode (u) — enables \\p{…} property escapes',
      default: false,
      help: 'Required for \\p{L} and friends. It also makes some legacy escapes an error rather than a literal.',
    },
  ],

  output: { type: 'text', mono: true, label: 'Matches' },

  howTo: [
    {
      title: 'Paste the text you are matching against',
      detail: 'A log excerpt, a CSV column, a block of HTML — whatever the pattern has to survive in production.',
    },
    {
      title: 'Write the pattern without slashes',
      detail: 'Enter `\\d{4}-\\d{2}-\\d{2}`, not `/\\d{4}-\\d{2}-\\d{2}/g`. The flags are the checkboxes underneath.',
    },
    {
      title: 'Read the table, not just the count',
      detail: 'Each row gives the line and column of a match and the value of every capture group, including the ones that stayed empty.',
    },
    {
      title: 'Take the pattern to your editor',
      detail: 'The line and column numbers are the ones your editor uses, so a surprising match is one keystroke away from being seen in context.',
    },
  ],

  faq: [
    {
      q: 'Why does my regex work here but not in my code?',
      a: 'Almost always the flags or the escaping. This tool takes the raw pattern, while a string literal in Java, Python or JSON needs every backslash doubled — `\\d` in the pattern is `"\\\\d"` in the string. Check the g and m flags too, since they change how many matches you get and what ^ means.',
    },
    {
      q: 'What happens if I paste a pattern like (a+)+$?',
      a: 'It is refused before it runs. That shape backtracks exponentially, and JavaScript has no way to interrupt a running match, so the tab would freeze with no error and no recovery except closing it. The tool names the construction it found and suggests a bounded rewrite.',
    },
    {
      q: 'Does it support named capture groups?',
      a: 'Yes. `(?<year>\\d{4})` gets its own column, labelled with the name. Groups that took part in no alternative are shown as empty rather than dropped, because an unexpectedly empty group is usually the thing you are debugging.',
    },
    {
      q: 'Which regex flavour is this?',
      a: 'JavaScript, as implemented by your browser. It differs from PCRE in real ways: no atomic groups, no possessive quantifiers, no recursion, and look-behind is supported in every current browser but not in older Safari. PCRE-only syntax will be reported as invalid.',
    },
    {
      q: 'Is my text sent anywhere?',
      a: 'No. The pattern and the text are both handled in your browser by its own regex engine. Nothing is uploaded, which matters because the text people test against is usually a production log with customer email addresses in it.',
    },
    {
      q: 'How many matches will it show?',
      a: `The first ${MATCH_LIMIT} are listed, and the total count is always exact. Beyond that the table stops being something anyone reads and starts being a file, so the count is reported and the rows are capped.`,
    },
  ],

  infoGain: {
    summary:
      'Two differences from the usual online tester. Catastrophic backtracking is detected and refused before a match runs, because JavaScript cannot interrupt one and the tab is unrecoverable. And every match is reported at a line and column, not just a string offset, so a surprising result can be found in the file it came from.',
    table: {
      caption: 'What the flags change, in the cases that actually catch people out',
      head: ['Flag', 'Off', 'On'],
      rows: [
        ['g — global', 'Stops at the first match', 'Continues to the end of the input'],
        ['m — multiline', '^ and $ mean start and end of the whole text', '^ and $ mean start and end of each line'],
        ['s — dotAll', '. never crosses a line break', '. matches a newline as well'],
        ['i — ignore case', 'A and a are different', 'A and a are the same'],
        ['u — unicode', '\\p{L} is a literal p, and lone surrogates pass', '\\p{L} works; some legacy escapes become errors'],
      ],
    },
    supports: [
      'Named capture groups, each in its own labelled column',
      'Line and column for every match, resolved against the input',
      'Groups that matched nothing, shown empty rather than omitted',
      'Zero-length matches, detected and reported rather than looping',
      'Backtracking guard, shared with the Find and Replace tool',
    ],
    limits: [
      'JavaScript flavour only. Atomic groups, possessive quantifiers and recursion are PCRE features and are reported as invalid syntax.',
      `The first ${MATCH_LIMIT} matches are tabulated; the count above the table is the true total.`,
      'The backtracking guard is a heuristic. It catches the common exponential shapes and will occasionally refuse a safe pattern that looks like one.',
      'Inputs above 2 MB are refused, because browser regex on a file that size stalls the page whatever the pattern is.',
    ],
    errors: [
      {
        cause: 'Nothing matches, but the pattern looks right',
        fix: 'Check the i flag first, then look for a non-breaking space or a smart quote in the input — both are common in text copied from a document and neither matches a plain space or apostrophe.',
      },
      {
        cause: '"Invalid regular expression: nothing to repeat"',
        fix: 'A quantifier has nothing in front of it, usually because a literal +, * or ? was not escaped. Write \\+ for a literal plus.',
      },
      {
        cause: 'The pattern matches too much',
        fix: 'Quantifiers are greedy. Use `.*?` instead of `.*` to stop at the first possible end rather than the last.',
      },
    ],
    verified: '2026-08',
  },

  related: [
    'find-and-replace',
    'text-diff',
    'json-formatter',
    'character-frequency-counter',
    'sort-lines',
    'remove-duplicate-lines',
    'jwt-decoder',
    'url-encoder',
  ],
  nextSteps: ['find-and-replace', 'text-diff', 'json-formatter'],

  added: '2026-08-17',
  updated: '2026-08-17',

  run: (input, options) => {
    if (input === '') return { output: '' };

    const { pattern, ...flags } = options;
    if (pattern.trim() === '') {
      return {
        output: '',
        notes: ['Write a pattern above and every match appears here as you type.'],
      };
    }

    let report;
    try {
      report = runRegex(input, pattern, flags);
    } catch (err) {
      if (err instanceof RegexRiskError) throw new ToolError(err.message, err.hint);
      throw err;
    }

    const shownGroups = report.groups.slice(0, MAX_GROUP_COLUMNS);

    const table: ResultTable = {
      caption: 'Every match, in the order it was found',
      head: [
        '#',
        'Line:Col',
        'Match',
        ...shownGroups.map((g) => (g.name ? `${g.index} · ${g.name}` : String(g.index))),
      ],
      rows: report.matches.map((m) => [
        m.n,
        `${m.line}:${m.column}`,
        m.text === '' ? '(empty)' : m.text,
        ...shownGroups.map((g) => m.captures.find((c) => c.index === g.index)?.value ?? '—'),
      ]),
    };

    const matchedChars = report.matches.reduce((sum, m) => sum + m.text.length, 0);
    const distinctLines = new Set(report.matches.map((m) => m.line)).size;
    const longest = report.matches.reduce((best, m) => (m.text.length > best.length ? m.text : best), '');

    const notes: string[] = [];
    if (report.total === 0) {
      notes.push(
        'No matches. Check the i flag, and look for a non-breaking space or a smart quote in the input — neither matches its plain equivalent.',
      );
    }
    if (report.truncated) {
      notes.push(
        `${report.total.toLocaleString()} matches were found; the first ${MATCH_LIMIT} are listed. The counts above cover all of them.`,
      );
    }
    if (report.hasEmptyMatch) {
      notes.push(
        'At least one match consumed no characters. A pattern that can match the empty string matches at every position, which is rarely what is intended.',
      );
    }
    if (report.groups.length > MAX_GROUP_COLUMNS) {
      notes.push(
        `The pattern has ${report.groups.length} capture groups; the first ${MAX_GROUP_COLUMNS} are shown as columns.`,
      );
    }
    if (!options.global && report.total === 1 && input.length > 0) {
      notes.push('Only the first match is shown because the g flag is off.');
    }

    return {
      output: report.matches.map((m) => m.text).join('\n'),
      filename: 'matches.txt',
      stats: [
        { label: 'Matches', value: report.total, primary: true },
        { label: 'Lines with a match', value: distinctLines, primary: true },
        { label: 'Capture groups', value: report.groups.length, primary: true },
        { label: 'Flags', value: report.flags === '' ? 'none' : `/${report.flags}`, primary: true },

        { label: 'Named groups', value: report.groups.filter((g) => g.name).length },
        { label: 'Characters matched', value: matchedChars },
        {
          label: 'Share of input',
          value: `${input.length === 0 ? 0 : Math.round((matchedChars / input.length) * 100)}%`,
        },
        { label: 'Longest match', value: longest.length === 0 ? '—' : `${longest.length} chars` },
        {
          label: 'First match at',
          value: report.matches[0] ? `line ${report.matches[0].line}, column ${report.matches[0].column}` : '—',
        },
      ],
      table: report.matches.length > 0 ? table : undefined,
      notes: notes.length > 0 ? notes : undefined,
    };
  },
});
