import { defineTool } from '@core/tool';
import { slugify, splitLines } from '@engines/text';

interface Options {
  separator: string;
  lowercase: boolean;
  stripStopWords: boolean;
  maxLength: number;
}

export default defineTool<string, Options>({
  slug: 'slug-generator',
  category: 'text',
  cluster: 'text-transform',

  name: 'Slug Generator',
  tagline: 'Turn any title into a clean, URL-safe slug — one per line, in bulk.',
  description:
    'Convert titles into URL slugs. Accents are transliterated rather than dropped, so "Café Münster" becomes "cafe-munster" instead of losing half its letters.',
  keywords: ['slug generator', 'url slug generator', 'permalink generator', 'text to slug'],

  runtime: 'client',
  status: 'live',
  premium: false,
  apiEnabled: true,

  score: { demand: 6, evergreen: 10, serp: 8, money: 5, ease: 10 },

  input: {
    type: 'text',
    label: 'Titles (one per line)',
    placeholder: 'How to Compress a PDF Without Losing Quality',
    rows: 8,
    sample: 'How to Compress a PDF Without Losing Quality\nCafé Münster — a Review\n10 Best Tools for Developers in 2026\nStraße & Weg: Ein Führer',
  },

  options: [
    {
      key: 'separator',
      type: 'enum',
      label: 'Separator',
      default: '-',
      values: [
        { value: '-', label: 'Hyphen  (recommended)' },
        { value: '_', label: 'Underscore' },
        { value: '', label: 'None' },
      ],
      help: 'Google treats hyphens as word separators and underscores as word joiners.',
    },
    { key: 'lowercase', type: 'bool', label: 'Force lowercase', default: true },
    {
      key: 'stripStopWords',
      type: 'bool',
      label: 'Remove stop words',
      default: false,
      help: 'Drops "a", "the", "of" and similar. Shorter URLs, slightly less readable.',
    },
    {
      key: 'maxLength',
      type: 'range',
      label: 'Maximum length',
      default: 60,
      min: 20,
      max: 120,
      step: 5,
      unit: ' chars',
      help: 'Truncation happens on a word boundary, never mid-word.',
    },
  ],

  output: { type: 'text', label: 'Slugs' },

  howTo: [
    { title: 'Paste your titles', detail: 'One per line. A whole content calendar can be converted in a single pass.' },
    { title: 'Choose a separator and length', detail: 'Hyphen and 60 characters suit almost every CMS. Change them only if your platform requires it.' },
    { title: 'Copy the slugs', detail: 'Output lines match input lines exactly, so you can paste the column straight back into a spreadsheet.' },
  ],

  faq: [
    {
      q: 'Should a URL slug use hyphens or underscores?',
      a: 'Hyphens. Google has stated for years that it reads a hyphen as a word separator and an underscore as a word joiner, so "compress_pdf" can be read as one token while "compress-pdf" is read as two words. Every major CMS defaults to hyphens for the same reason.',
    },
    {
      q: 'What happens to accented characters?',
      a: 'They are transliterated to their closest ASCII form: é becomes e, ü becomes u, ß becomes ss, ø becomes o and æ becomes ae. Many tools simply delete them, which turns "Münster" into "mnster".',
    },
    {
      q: 'How long should a slug be?',
      a: 'Under about 60 characters is a sensible working limit — long enough to carry the keyword, short enough to display in full in a search result and in a shared link. This is a readability convention, not a ranking rule.',
    },
    {
      q: 'Should I remove stop words?',
      a: 'Usually not. Removing "the" and "of" makes a slug marginally shorter but can make it harder to read, and there is no evidence of a ranking benefit. The option exists for platforms with tight URL limits.',
    },
    {
      q: 'Can I change a slug after publishing?',
      a: 'You can, but do not unless you must. The URL is the identity of the page for search engines and for anyone who linked to it. If you have to change one, set a 301 redirect from the old URL and expect a temporary dip.',
    },
  ],

  infoGain: {
    summary:
      'Accented characters are transliterated, not deleted. The input is normalised to NFD first, which separates a letter from its combining accent, so only the accent is dropped and the letter survives. Tools that strip non-ASCII in one pass turn Münster into mnster — a slug nobody can read and no search engine can match.',
    table: {
      caption: 'Transliteration compared with the common strip-non-ASCII approach',
      head: ['Input', 'Strip non-ASCII', 'This tool'],
      rows: [
        ['Café Münster', 'caf-mnster', 'cafe-munster'],
        ['Straße & Weg', 'strae-weg', 'strasse-weg'],
        ['Ærø Island', 'r-island', 'aero-island'],
        ['Đà Nẵng', 'na-nng', 'da-nang'],
      ],
    },
    supports: [
      'Latin transliteration for accents, ß, ø, æ and đ',
      'Bulk conversion, one slug per input line',
      'Word-boundary truncation to a chosen maximum length',
      'Optional English stop-word removal',
    ],
    limits: [
      'Non-Latin scripts (Bangla, Arabic, CJK) are not romanised — those characters are removed. Romanise first if you need a Latin slug.',
      'Numbers are preserved, so "2026" stays in the slug. Edit the title if you want an evergreen URL.',
    ],
    verified: '2026-08',
  },

  related: ['case-converter', 'word-counter', 'sort-lines', 'remove-duplicate-lines', 'url-encoder', 'readability-checker'],
  nextSteps: ['case-converter', 'url-encoder', 'word-counter'],

  added: '2026-08-08',
  updated: '2026-08-08',

  run: (input, options) => {
    const lines = splitLines(input);
    const slugs = lines.map((line) =>
      line.trim() === ''
        ? ''
        : slugify(line, {
            separator: options.separator,
            lowercase: options.lowercase,
            stripStopWords: options.stripStopWords,
            maxLength: options.maxLength,
          }),
    );

    const nonEmpty = slugs.filter(Boolean);
    const truncated = slugs.filter((s, i) => s.length > 0 && lines[i]!.trim().length > options.maxLength).length;

    return {
      output: slugs.join('\n'),
      filename: 'slugs.txt',
      stats: [
        { label: 'Slugs generated', value: nonEmpty.length, primary: true },
        {
          label: 'Longest slug',
          value: nonEmpty.reduce((max, s) => Math.max(max, s.length), 0),
          hint: 'characters',
        },
      ],
      notes:
        truncated > 0
          ? [`${truncated} title${truncated === 1 ? ' was' : 's were'} truncated at the ${options.maxLength}-character limit, on a word boundary.`]
          : undefined,
    };
  },
});
