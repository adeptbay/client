import { defineTool } from '@core/tool';
import { convertCase, type CaseMode } from '@engines/text';

interface Options {
  mode: CaseMode;
}

export default defineTool<string, Options>({
  slug: 'case-converter',
  category: 'text',
  cluster: 'text-transform',

  name: 'Case Converter',
  tagline: 'Twelve cases including camelCase, snake_case and proper Title Case.',
  titleBenefit: 'Twelve Cases, One Click',
  description:
    'Convert text between upper, lower, title, sentence, camel, pascal, snake, kebab and CONSTANT case. Title Case follows Chicago style rather than capitalising every word.',
  keywords: [
    'case converter',
    'uppercase to lowercase',
    'title case converter',
    'camelcase converter',
    'snake case converter',
  ],

  runtime: 'client',
  status: 'live',
  premium: false,
  apiEnabled: true,

  score: { demand: 8, evergreen: 10, serp: 6, money: 4, ease: 10 },

  input: {
    type: 'text',
    label: 'Your text',
    placeholder: 'Paste the text you want to convert…',
    mono: false,
    rows: 8,
    sample: 'the lord of the rings and the return of the king',
  },

  options: [
    {
      key: 'mode',
      type: 'enum',
      label: 'Convert to',
      default: 'title',
      values: [
        { value: 'upper', label: 'UPPER CASE' },
        { value: 'lower', label: 'lower case' },
        { value: 'title', label: 'Title Case (Chicago)' },
        { value: 'sentence', label: 'Sentence case' },
        { value: 'camel', label: 'camelCase' },
        { value: 'pascal', label: 'PascalCase' },
        { value: 'snake', label: 'snake_case' },
        { value: 'kebab', label: 'kebab-case' },
        { value: 'constant', label: 'CONSTANT_CASE' },
        { value: 'dot', label: 'dot.case' },
        { value: 'toggle', label: 'tOGGLE cASE' },
        { value: 'alternating', label: 'aLtErNaTiNg' },
      ],
    },
  ],

  output: { type: 'text', mono: false, label: 'Converted text' },

  howTo: [
    { title: 'Paste your text', detail: 'Line breaks are preserved, so you can convert a whole list at once.' },
    { title: 'Pick a case', detail: 'The result updates immediately. Programmer cases split on spaces, hyphens, underscores and existing camelCase boundaries.' },
    { title: 'Copy the result', detail: 'Use the copy button, or download it as a .txt file if you converted a long list.' },
  ],

  faq: [
    {
      q: 'What is the difference between Title Case and capitalising every word?',
      a: 'Title Case leaves minor words lowercase unless they start or end the title. "The Lord of the Rings" is Title Case; "The Lord Of The Rings" is just every word capitalised. This tool follows the Chicago Manual of Style list of articles, short prepositions and conjunctions.',
    },
    {
      q: 'How does it convert to camelCase?',
      a: 'It splits the input on spaces, hyphens, underscores, dots and existing case boundaries, then joins the pieces. "user-ID number" and "user_id_number" both become "userIdNumber", so mixed-convention input still gives a consistent result.',
    },
    {
      q: 'Does sentence case know where sentences end?',
      a: 'It capitalises the first letter after a period, exclamation mark, question mark or line break, and lowercases everything else. Abbreviations like "e.g." will therefore trigger a capital, which is the trade-off every rule-based converter makes.',
    },
    {
      q: 'Are acronyms preserved?',
      a: 'Not in the lower-casing modes. "NASA" becomes "nasa" in lower case and "Nasa" in Title Case, because there is no reliable way to tell an acronym from a shouted word without a dictionary. Convert acronyms separately if that matters.',
    },
    {
      q: 'Does it work with non-English text?',
      a: 'Upper, lower and toggle use the browser\'s Unicode case mappings, so Greek, Cyrillic and accented Latin convert correctly. The programmer cases strip non-ASCII characters, since identifiers in most languages cannot contain them.',
    },
  ],

  infoGain: {
    summary:
      'Almost every case converter online implements "Title Case" as "capitalise every word". That is not Title Case in any published style guide. This tool implements the Chicago Manual rule — minor words stay lowercase unless they are first or last — and lists exactly which words it treats as minor, so the output is defensible in an editorial review.',
    table: {
      caption: 'Title Case: this tool versus the common implementation',
      head: ['Input', 'Capitalise every word', 'Chicago Title Case'],
      rows: [
        ['the lord of the rings', 'The Lord Of The Rings', 'The Lord of the Rings'],
        ['a tale of two cities', 'A Tale Of Two Cities', 'A Tale of Two Cities'],
        ['what to look for in', 'What To Look For In', 'What to Look for In'],
      ],
    },
    supports: [
      'Twelve cases, including four programmer conventions',
      'Multi-line input — each line is treated as its own title',
      'Unicode-aware upper and lower casing',
      'Detects existing camelCase and PascalCase boundaries when splitting',
    ],
    limits: [
      'Acronyms are not detected and will be lowercased by the lower-casing modes.',
      'Sentence case treats "e.g." and "Dr." as sentence ends.',
      'Programmer cases drop non-ASCII characters, since identifiers rarely allow them.',
    ],
    verified: '2026-08',
  },

  related: [
    'slug-generator',
    'word-counter',
    'sort-lines',
    'remove-duplicate-lines',
    'readability-checker',
    'text-diff',
    'text-reverser',
    'lorem-ipsum-generator',
  ],
  nextSteps: ['slug-generator', 'word-counter', 'sort-lines'],

  added: '2026-08-08',
  updated: '2026-08-08',

  run: (input, options) => ({
    output: convertCase(input, options.mode),
    filename: 'converted.txt',
  }),
});
