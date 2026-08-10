import { defineTool } from '@core/tool';
import {
  cleanWhitespace,
  detectInvisible,
  detectLineEnding,
  reveal,
  type CleanOptions,
} from '@engines/whitespace';

interface Options extends CleanOptions {
  mode: 'clean' | 'reveal';
  showSpaces: boolean;
}

const LINE_ENDING_LABEL = {
  lf: 'LF (Unix, macOS)',
  crlf: 'CRLF (Windows)',
  cr: 'CR (classic Mac)',
  mixed: 'Mixed — inconsistent',
  none: 'Single line',
} as const;

export default defineTool<string, Options>({
  slug: 'remove-extra-spaces',
  category: 'text',
  cluster: 'text-cleanup',

  name: 'Remove Extra Spaces',
  tagline: 'Strip extra spaces — and the invisible characters that broke your text in the first place.',
  description:
    'Collapse extra spaces, trim lines and remove blank lines. Also finds the invisible characters a Word or PDF paste leaves behind, and tells you exactly which ones.',
  keywords: [
    'remove extra spaces',
    'whitespace remover',
    'remove line breaks',
    'trim whitespace online',
    'remove invisible characters',
  ],

  runtime: 'client',
  status: 'live',
  premium: false,
  apiEnabled: true,

  score: { demand: 7, evergreen: 10, serp: 7, money: 4, ease: 9 },

  input: {
    type: 'text',
    label: 'Your text',
    placeholder: 'Paste text here — especially if it came from Word, a PDF or a website…',
    rows: 9,
    // Contains a non-breaking space, a zero-width space and smart quotes.
    sample:
      'The  quick   brown fox jumps over​ the lazy dog.\n\n\n   Trailing spaces here.   \n\t“Smart quotes” and an em—dash.',
  },

  options: [
    {
      key: 'mode',
      type: 'enum',
      label: 'Mode',
      default: 'clean',
      values: [
        { value: 'clean', label: 'Clean the text' },
        { value: 'reveal', label: 'Reveal invisible characters' },
      ],
      help: 'Reveal mode shows what is actually in the text without changing it.',
    },
    {
      key: 'showSpaces',
      type: 'bool',
      label: 'Mark ordinary spaces too',
      default: false,
      showIf: { key: 'mode', equals: 'reveal' },
    },
    { key: 'collapseSpaces', type: 'bool', label: 'Collapse repeated spaces', default: true },
    { key: 'trimLines', type: 'bool', label: 'Trim each line', default: true },
    {
      key: 'collapseBlankLines',
      type: 'bool',
      label: 'Collapse multiple blank lines',
      default: true,
      help: 'Three or more blank lines become one.',
    },
    { key: 'removeBlankLines', type: 'bool', label: 'Remove all blank lines', default: false },
    {
      key: 'normaliseSpaces',
      type: 'bool',
      label: 'Convert exotic spaces to normal ones',
      default: true,
      help: 'Non-breaking, narrow and full-width spaces become a plain space.',
    },
    {
      key: 'removeZeroWidth',
      type: 'bool',
      label: 'Delete zero-width characters',
      default: true,
      help: 'Invisible characters that make identical-looking text compare unequal.',
    },
    {
      key: 'normalisePunctuation',
      type: 'bool',
      label: 'Straighten smart quotes and dashes',
      default: false,
      help: 'Turns “ ” ‘ ’ – — … into their ASCII equivalents.',
    },
    {
      key: 'normaliseLineEndings',
      type: 'bool',
      label: 'Normalise line endings to LF',
      default: false,
    },
    {
      key: 'tabsToSpaces',
      type: 'number',
      label: 'Convert tabs to N spaces',
      default: 0,
      min: 0,
      max: 8,
      help: '0 leaves tabs as they are.',
    },
  ],

  output: { type: 'text', label: 'Result' },

  howTo: [
    {
      title: 'Paste the text',
      detail: 'Especially if it came from Word, Google Docs, a PDF or a web page — those are where invisible characters come from.',
    },
    {
      title: 'Check what was found',
      detail: 'The table lists every invisible character in the text, how many there were, and which lines they are on.',
    },
    {
      title: 'Clean it, or reveal it first',
      detail: 'Reveal mode marks each invisible character inline without changing anything, so you can see the problem before you fix it.',
    },
  ],

  faq: [
    {
      q: 'Why does my text have invisible characters in it?',
      a: 'Word, Google Docs and PDF readers insert non-breaking spaces to control line wrapping, and content management systems insert zero-width spaces around formatting. None of them render as anything, so they survive copy and paste unnoticed and then break whatever you paste them into.',
    },
    {
      q: 'What is a non-breaking space and why does it matter?',
      a: 'U+00A0 renders exactly like a normal space but stops the line wrapping there. It matters because it is not the space character: a CSV parser splitting on " " will not split on it, a URL slug generator will not treat it as a word boundary, and a string comparison will fail.',
    },
    {
      q: 'What is a zero-width space?',
      a: 'U+200B occupies no width at all — it is completely invisible. Two strings that look identical will compare as different if one contains it. It is the single most common cause of "these two values are the same but my code says they are not".',
    },
    {
      q: 'Does this remove line breaks?',
      a: 'Only if you ask it to. "Remove all blank lines" strips empty lines entirely; "collapse multiple blank lines" reduces runs of them to one. Neither joins your paragraphs into a single line — that is a separate operation and this tool does not do it silently.',
    },
    {
      q: 'What does reveal mode show?',
      a: 'It replaces every invisible character with a visible marker: ¶ for a line break, · for a space when enabled, and the code point in brackets for anything invisible — so a non-breaking space appears as ⟦U+00A0⟧. The text itself is unchanged.',
    },
    {
      q: 'Is my text uploaded?',
      a: 'No. Everything runs in this browser tab. You can disconnect from the internet after the page loads and the tool keeps working.',
    },
  ],

  infoGain: {
    summary:
      'Most whitespace tools collapse runs of U+0020 and stop. The characters that actually break things are the ones you cannot see — a non-breaking space from Word that stops a CSV splitting, a zero-width space that makes two identical strings compare unequal. This tool detects fourteen of them, names each one, and reports which lines they are on.',
    table: {
      caption: 'The invisible characters this tool detects',
      head: ['Character', 'Code', 'Why it breaks things'],
      rows: [
        ['Non-breaking space', 'U+00A0', 'Looks like a space, is not one. Breaks CSV splitting and slugs.'],
        ['Zero-width space', 'U+200B', 'Invisible. Identical-looking strings compare unequal.'],
        ['Zero-width joiner', 'U+200D', 'Builds emoji. Stray ones corrupt text silently.'],
        ['Byte order mark', 'U+FEFF', 'Shows as "ï»¿" and breaks the first CSV header.'],
        ['Soft hyphen', 'U+00AD', 'Invisible until the line wraps, then a hyphen appears.'],
        ['Narrow no-break space', 'U+202F', 'French typography and some spreadsheets.'],
        ['Ideographic space', 'U+3000', 'Full-width space from CJK input methods.'],
        ['LTR / RTL marks', 'U+200E, U+200F', 'Reorder text unexpectedly. Pasted from RTL documents.'],
      ],
    },
    supports: [
      '14 invisible and exotic whitespace characters, each named and located',
      'Reveal mode — see the problem before changing anything',
      'Line-ending detection, including mixed CRLF and LF',
      'Smart quote, em dash and ellipsis normalisation',
      'Tab to space conversion at any width',
    ],
    limits: [
      'Zero-width non-joiner (U+200C) is legitimate in Persian, Hindi and Bangla. Removing it in those languages changes the text — the tool reports it, and the choice is yours.',
      'It never joins wrapped lines back into paragraphs. That needs to know where a paragraph ends, which is a guess this tool will not make for you.',
      'Emoji built from zero-width joiners will be broken apart if you delete zero-width characters. Turn that option off when the text contains emoji.',
    ],
    verified: '2026-08',
  },

  related: [
    'remove-duplicate-lines',
    'text-to-columns',
    'find-and-replace',
    'word-counter',
    'sort-lines',
    'character-frequency-counter',
    'case-converter',
  ],
  nextSteps: ['find-and-replace', 'remove-duplicate-lines', 'word-counter'],

  added: '2026-08-09',
  updated: '2026-08-09',

  run: (input, options) => {
    if (input === '') return { output: '' };

    const found = detectInvisible(input);
    const ending = detectLineEnding(input);

    const output =
      options.mode === 'reveal' ? reveal(input, options.showSpaces) : cleanWhitespace(input, options);

    const cleaned = cleanWhitespace(input, options);
    const removed = [...input].length - [...cleaned].length;

    const invisibleCount = found
      .filter((f) => f.char.code !== 0x0009)
      .reduce((sum, f) => sum + f.count, 0);

    return {
      output,
      filename: 'cleaned.txt',
      stats: [
        { label: 'Characters removed', value: options.mode === 'reveal' ? 0 : removed, primary: true },
        { label: 'Invisible characters found', value: invisibleCount, primary: true },
        { label: 'Line endings', value: LINE_ENDING_LABEL[ending], primary: true },
        { label: 'Characters in', value: [...input].length },
        { label: 'Characters out', value: [...cleaned].length },
      ],
      table:
        found.length > 0
          ? {
              caption: 'Found in your text',
              head: ['Character', 'Code', 'Count', 'First seen on line', 'Effect'],
              rows: found.map((f) => [
                f.char.name,
                f.char.hex,
                f.count,
                f.lines.join(', '),
                f.char.effect,
              ]),
              barColumn: 2,
            }
          : undefined,
      notes:
        found.length === 0
          ? ['No invisible or exotic whitespace characters found — this text is clean.']
          : ending === 'mixed'
            ? ['This text mixes CRLF and LF line endings. Turn on "normalise line endings" if it is going into git or a build tool.']
            : undefined,
    };
  },
});
