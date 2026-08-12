import { defineTool } from '@core/tool';
import { sortLines, splitLines, type SortMode } from '@engines/text';

interface Options {
  mode: SortMode;
  caseSensitive: boolean;
  ignoreEmpty: boolean;
}

export default defineTool<string, Options>({
  slug: 'sort-lines',
  category: 'text',
  cluster: 'text-lines',

  name: 'Sort Lines',
  tagline: 'Alphabetical, numeric, by length or shuffled — with correct accent handling.',
  titleBenefit: 'Alphabetical, Numeric or Length',
  description:
    'Sort lines alphabetically, numerically, by length, or shuffle them. Locale-aware collation, so accented and non-Latin text sorts the way a person expects.',
  keywords: ['sort lines', 'sort text alphabetically', 'alphabetical order tool', 'sort list online'],

  runtime: 'client',
  status: 'live',
  premium: false,
  apiEnabled: true,

  score: { demand: 7, evergreen: 10, serp: 7, money: 3, ease: 10 },

  input: {
    type: 'text',
    label: 'Your list',
    placeholder: 'One item per line…',
    rows: 10,
    sample: 'item 10\nItem 2\nélan\necho\nzebra\nitem 1\nApple',
  },

  options: [
    {
      key: 'mode',
      type: 'enum',
      label: 'Sort by',
      default: 'alpha',
      values: [
        { value: 'alpha', label: 'A → Z' },
        { value: 'alpha-desc', label: 'Z → A' },
        { value: 'numeric', label: 'Number, low → high' },
        { value: 'numeric-desc', label: 'Number, high → low' },
        { value: 'length', label: 'Length, short → long' },
        { value: 'length-desc', label: 'Length, long → short' },
        { value: 'shuffle', label: 'Shuffle randomly' },
      ],
    },
    {
      key: 'caseSensitive',
      type: 'bool',
      label: 'Case sensitive',
      default: false,
      help: 'On puts all capitals before all lowercase, the way a byte sort does.',
    },
    {
      key: 'ignoreEmpty',
      type: 'bool',
      label: 'Drop blank lines',
      default: true,
    },
  ],

  output: { type: 'text', label: 'Sorted list' },

  howTo: [
    { title: 'Paste your list', detail: 'One item per line. Any line ending works.' },
    { title: 'Choose the order', detail: 'Alphabetical uses natural sorting, so "item 2" comes before "item 10".' },
    { title: 'Copy the result', detail: 'Or download it as a text file if the list is long.' },
  ],

  faq: [
    {
      q: 'Why does "item 2" come before "item 10"?',
      a: 'Because this sort is numeric-aware. A plain string sort compares character by character, so "1" beats "2" and you get item 1, item 10, item 2. Natural sorting reads runs of digits as numbers, which is what people actually mean by alphabetical.',
    },
    {
      q: 'How are accented characters sorted?',
      a: 'Through Intl.Collator, the browser\'s own locale-aware comparison. "élan" sorts next to "elan" rather than after "z", which is what a byte-order sort would do because é has a higher code point than every unaccented Latin letter.',
    },
    {
      q: 'What happens to lines with no number in numeric mode?',
      a: 'They move to the bottom, in alphabetical order among themselves. Scattering them randomly through the result — which is what NaN comparisons do if unhandled — makes the output impossible to scan.',
    },
    {
      q: 'Is the shuffle actually random?',
      a: 'It is a Fisher-Yates shuffle drawing from crypto.getRandomValues, with rejection sampling to remove modulo bias. Every permutation is equally likely, which is not true of the common "sort by Math.random()" one-liner.',
    },
    {
      q: 'Does sorting remove duplicates?',
      a: 'No. Sorting and deduplication are separate operations here so you can do one without the other. Run the Remove Duplicate Lines tool first if you want both.',
    },
  ],

  infoGain: {
    summary:
      'Two things separate this from a one-line JavaScript sort. First, numeric-aware collation, so item 2 precedes item 10. Second, Intl.Collator for accents and non-Latin scripts, so élan lands next to elan rather than at the end of the list. Both are what a person means by "alphabetical" and neither is what Array.prototype.sort does by default.',
    table: {
      caption: 'Same input, three sorting strategies',
      head: ['Input', 'Byte sort', 'This tool (A → Z)'],
      rows: [
        ['item 10, item 2', 'item 10, item 2', 'item 2, item 10'],
        ['élan, echo, zebra', 'echo, zebra, élan', 'echo, élan, zebra'],
        ['Apple, apple, Banana', 'Apple, Banana, apple', 'Apple, apple, Banana'],
      ],
    },
    supports: [
      'Natural numeric ordering inside strings',
      'Locale-aware collation for accents and non-Latin scripts',
      'Length sorting with an alphabetical tiebreak',
      'Cryptographically uniform shuffle',
    ],
    limits: [
      'Sorting is by whole line. Sort by a CSV column by extracting the column first.',
      'Collation follows the browser\'s locale. A German and a Swedish browser will order ä differently — correctly, in both cases.',
    ],
    verified: '2026-08',
  },

  related: [
    'remove-duplicate-lines',
    'text-diff',
    'case-converter',
    'word-counter',
    'slug-generator',
    'readability-checker',
    'line-numberer',
    'text-to-columns',
  ],
  nextSteps: ['remove-duplicate-lines', 'text-diff', 'case-converter'],

  added: '2026-08-08',
  updated: '2026-08-08',

  run: (input, options) => {
    const before = splitLines(input).length;
    const lines = sortLines(input, options.mode, {
      caseSensitive: options.caseSensitive,
      ignoreEmpty: options.ignoreEmpty,
    });

    return {
      output: lines.join('\n'),
      filename: 'sorted.txt',
      stats: [
        { label: 'Lines out', value: lines.length, primary: true },
        { label: 'Lines in', value: before },
      ],
    };
  },
});
