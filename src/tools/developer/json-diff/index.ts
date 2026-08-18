import { defineTool, ToolError } from '@core/tool';
import { describeJsonError, parseJson } from '@engines/format';
import { diffJson, formatChanges, type ChangeKind } from '@engines/jsondiff';

interface Options {
  ignoreArrayOrder: boolean;
  ignoreCase: boolean;
  looseTypes: boolean;
}

const SYMBOL: Record<ChangeKind, string> = {
  added: '+',
  removed: '−',
  changed: '~',
  type: '!',
};

const LABEL: Record<ChangeKind, string> = {
  added: 'added',
  removed: 'removed',
  changed: 'changed',
  type: 'type changed',
};

export default defineTool<[string, string], Options>({
  slug: 'json-diff',
  category: 'developer',
  cluster: 'json',

  name: 'JSON Diff',
  tagline: 'Compare two JSON documents by structure, so key order and formatting never count as changes.',
  titleBenefit: 'Structural, Not Line by Line',
  description:
    'Compare two JSON documents and get a list of the paths that differ. Key order and indentation are invisible, and a type change is reported separately from a value change.',
  keywords: ['json diff', 'compare json', 'json compare tool', 'json difference checker', 'diff two json files'],

  runtime: 'client',
  status: 'live',
  premium: false,
  apiEnabled: true,

  score: { demand: 7, evergreen: 9, serp: 7, money: 4, ease: 7 },

  input: {
    type: 'text-pair',
    labelA: 'Original JSON',
    labelB: 'Changed JSON',
    placeholder: 'Paste JSON here…',
    rows: 14,
    sampleA:
      '{\n' +
      '  "name": "checkout-api",\n' +
      '  "version": "2.4.0",\n' +
      '  "replicas": 3,\n' +
      '  "features": ["wallet", "gift-card"],\n' +
      '  "limits": { "cpu": "500m", "memory": "512Mi" },\n' +
      '  "retries": 3\n' +
      '}',
    sampleB:
      '{\n' +
      '  "version": "2.5.1",\n' +
      '  "name": "checkout-api",\n' +
      '  "replicas": 5,\n' +
      '  "features": ["gift-card", "wallet", "apple-pay"],\n' +
      '  "limits": { "cpu": "500m", "memory": "1Gi" },\n' +
      '  "retries": "3",\n' +
      '  "timeoutMs": 8000\n' +
      '}',
  },

  options: [
    {
      key: 'ignoreArrayOrder',
      type: 'bool',
      label: 'Ignore array order',
      default: false,
      help: 'Compares arrays as sets. Use it for lists where position carries no meaning, such as tags or feature flags.',
    },
    {
      key: 'ignoreCase',
      type: 'bool',
      label: 'Ignore case in string values',
      default: false,
    },
    {
      key: 'looseTypes',
      type: 'bool',
      label: 'Treat "5" and 5 as equal',
      default: false,
      help: 'For comparing an API that stringifies numbers against one that does not. Off, that difference is exactly what you want to see.',
    },
  ],

  output: { type: 'text', mono: true, label: 'Change list' },

  howTo: [
    {
      title: 'Paste both documents',
      detail: 'They do not need the same formatting or key order — neither is a difference here. Nothing is uploaded.',
    },
    {
      title: 'Read the paths, not the lines',
      detail: 'Every change is reported as `$.limits.memory`, which is a location you can search for rather than a line number that moved.',
    },
    {
      title: 'Watch for the type changes',
      detail: 'A value that went from 3 to "3" is marked separately, because a line diff shows it as an ordinary edit and it breaks strict equality downstream.',
    },
    {
      title: 'Loosen the comparison if the noise is expected',
      detail: 'Order-insensitive array comparison and loose number-string equality both exist to remove differences you already know about.',
    },
  ],

  faq: [
    {
      q: 'Why not just use a text diff on two JSON files?',
      a: 'Because a text diff answers the wrong question. Reserialise the same object with different key order or indentation and every line reports as changed, while one added array element shifts everything below it and buries the real edit. This compares the parsed values, so formatting is invisible.',
    },
    {
      q: 'Does key order count as a difference?',
      a: 'No. JSON objects have no defined key order, so two documents that differ only in ordering are identical here — and the tool says so explicitly rather than reporting zero changes and leaving you unsure it ran.',
    },
    {
      q: 'What does the "!" marker mean?',
      a: 'A type change: the value at that path is a different JSON type on each side, such as 3 against "3", or null against an object. It is separated from an ordinary value change because it is the difference that breaks a strict equality check or a schema validator three services downstream.',
    },
    {
      q: 'How are arrays compared?',
      a: 'By index, by default: element 0 against element 0. That is right for ordered data and wrong for a set of tags, so "ignore array order" compares them as multisets instead — a reordered list is then silent, while a genuinely added element still reports, without an index.',
    },
    {
      q: 'What does the path syntax mean?',
      a: 'JSONPath. `$` is the document root, `.name` is a key, `[2]` is an array index, and a key that is not a plain identifier appears as `["content-type"]`. The same expression works in jq, most JSON path libraries and your browser console.',
    },
    {
      q: 'Is there a size limit?',
      a: 'The comparison itself handles documents of several megabytes. The change list stops at 2,000 entries, because past that it is a file rather than something anyone reads, and the truncation is stated rather than silent.',
    },
  ],

  infoGain: {
    summary:
      'This compares parsed values rather than lines, which removes the two failure modes of diffing JSON as text: reordered keys reporting as a whole-file change, and one inserted array element shifting every line below it. Type changes are reported separately from value changes, because "3" against 3 is the one that breaks things quietly.',
    table: {
      caption: 'The same two documents, seen two ways',
      head: ['Difference', 'A line diff says', 'This says'],
      rows: [
        ['Keys reordered, nothing else', 'Every line changed', 'Identical'],
        ['Indentation changed', 'Every line changed', 'Identical'],
        ['One element inserted into an array', 'Every following line changed', 'One addition, at its path'],
        ['3 became "3"', 'One ordinary edit', 'Type changed: number → string'],
        ['A key was removed', 'One deleted line', 'One removal, at its path'],
      ],
    },
    supports: [
      'JSONPath locations — $.users[2].email — for every change',
      'Four change kinds: added, removed, value changed, type changed',
      'Order-insensitive array comparison, on request',
      'Case-insensitive and number-string-tolerant value comparison',
      'A copyable change list, in the shape a review comment takes',
    ],
    limits: [
      'Array elements are matched by index, not by identity. Inserting one element at the front reports every following position as changed unless order is ignored.',
      'The change list is capped at 2,000 entries; the cap is reported when it is reached.',
      'Duplicate keys in the same object collapse to the last one during parsing, as the JSON specification requires — so a difference between duplicates cannot be seen.',
      'Numbers are compared after JavaScript parsing, so two integers beyond 2^53 that differ only in their last digits may compare equal.',
    ],
    verified: '2026-08',
  },

  related: [
    'json-formatter',
    'text-diff',
    'json-to-yaml',
    'json-to-csv',
    'json-to-typescript',
    'hash-generator',
    'jwt-decoder',
    'find-and-replace',
  ],
  nextSteps: ['json-formatter', 'text-diff', 'json-to-typescript'],

  added: '2026-08-17',
  updated: '2026-08-17',

  run: ([a, b], options) => {
    if (a.trim() === '' && b.trim() === '') return { output: '' };
    if (a.trim() === '' || b.trim() === '') {
      return {
        output: '',
        notes: ['Paste JSON into both panes and the comparison appears here.'],
      };
    }

    const parseSide = (source: string, side: string): unknown => {
      try {
        return parseJson(source);
      } catch (err) {
        const { message, hint } = describeJsonError(err, side);
        throw new ToolError(message, hint);
      }
    };

    const left = parseSide(a, 'Original');
    const right = parseSide(b, 'Changed');

    const report = diffJson(left, right, options);

    const notes: string[] = [];
    if (report.identical) {
      notes.push(
        'The two documents hold the same data. Any difference between them is key order, whitespace or indentation, none of which JSON treats as meaningful.',
      );
    }
    if (report.truncated) {
      notes.push('The change list stops at 2,000 entries. The counts above cover every change found.');
    }
    if (report.typeChanged > 0) {
      notes.push(
        `${report.typeChanged} value${report.typeChanged === 1 ? '' : 's'} changed type. That is the difference a line diff shows as an ordinary edit and a strict equality check fails on.`,
      );
    }
    if (options.ignoreArrayOrder) {
      notes.push('Arrays are being compared as sets, so added and removed elements are reported without an index.');
    }

    return {
      output: formatChanges(report.changes),
      filename: 'json-diff.txt',
      stats: [
        { label: 'Added', value: report.added, primary: true },
        { label: 'Removed', value: report.removed, primary: true },
        { label: 'Changed', value: report.changed, primary: true },
        { label: 'Type changed', value: report.typeChanged, primary: true },

        { label: 'Total differences', value: report.changes.length },
        { label: 'Values that matched', value: report.unchanged },
      ],
      table:
        report.changes.length > 0
          ? {
              caption: 'Every difference, by path',
              head: ['', 'Path', 'Change', 'Original', 'Changed'],
              rows: report.changes.map((c) => [
                SYMBOL[c.kind],
                c.path,
                c.kind === 'type' ? `${c.leftType} → ${c.rightType}` : LABEL[c.kind],
                c.left ?? '—',
                c.right ?? '—',
              ]),
            }
          : undefined,
      notes: notes.length > 0 ? notes : undefined,
    };
  },
});
