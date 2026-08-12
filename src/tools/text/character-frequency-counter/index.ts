import { defineTool } from '@core/tool';
import {
  categorise,
  characterFrequency,
  IC_ENGLISH,
  IC_RANDOM,
  indexOfCoincidence,
  wordFrequency,
} from '@engines/frequency';

interface Options {
  unit: 'characters' | 'words' | 'bigrams' | 'trigrams';
  caseSensitive: boolean;
  lettersOnly: boolean;
  includeWhitespace: boolean;
  removeStopWords: boolean;
  minLength: number;
  limit: number;
}

export default defineTool<string, Options>({
  slug: 'character-frequency-counter',
  category: 'text',
  cluster: 'text-analysis',

  name: 'Character Frequency Counter',
  tagline: 'Letter, word and phrase frequency — compared against the English baseline for cipher work.',
  titleBenefit: 'Letters and Words',
  description:
    'Count how often each character, word or phrase appears, with percentages and a deviation from standard English letter frequency. Includes the index of coincidence.',
  keywords: [
    'letter frequency counter',
    'character frequency counter',
    'word frequency counter',
    'keyword density checker',
  ],

  runtime: 'client',
  status: 'live',
  premium: false,
  apiEnabled: true,

  score: { demand: 5, evergreen: 10, serp: 8, money: 4, ease: 8 },

  input: {
    type: 'text',
    label: 'Your text',
    placeholder: 'Paste text, an article, or a ciphertext…',
    mono: false,
    rows: 9,
    sample:
      'The quick brown fox jumps over the lazy dog. The dog barked, and the fox ran into the quiet wood beyond the old stone wall.',
  },

  options: [
    {
      key: 'unit',
      type: 'enum',
      label: 'Count',
      default: 'characters',
      values: [
        { value: 'characters', label: 'Characters' },
        { value: 'words', label: 'Words' },
        { value: 'bigrams', label: 'Two-word phrases' },
        { value: 'trigrams', label: 'Three-word phrases' },
      ],
    },
    { key: 'caseSensitive', type: 'bool', label: 'Case sensitive', default: false },
    {
      key: 'lettersOnly',
      type: 'bool',
      label: 'Letters only',
      default: false,
      showIf: { key: 'unit', equals: 'characters' },
      help: 'The mode you want for breaking a substitution cipher.',
    },
    {
      key: 'includeWhitespace',
      type: 'bool',
      label: 'Count spaces and line breaks',
      default: false,
      showIf: { key: 'unit', equals: 'characters' },
    },
    {
      key: 'removeStopWords',
      type: 'bool',
      label: 'Ignore common words',
      default: false,
      help: 'Drops "the", "and", "of" and similar, which otherwise dominate every list.',
    },
    { key: 'minLength', type: 'number', label: 'Minimum word length', default: 1, min: 1, max: 20 },
    { key: 'limit', type: 'range', label: 'Show top', default: 30, min: 5, max: 200, step: 5, unit: ' rows' },
  ],

  output: { type: 'table', label: 'Frequency' },

  howTo: [
    { title: 'Paste your text', detail: 'An article for keyword density, or a ciphertext for cryptanalysis.' },
    {
      title: 'Choose what to count',
      detail: 'Characters with "letters only" for cipher work. Words or phrases with stop words removed for content analysis.',
    },
    {
      title: 'Read the deviation column',
      detail: 'It shows how far each letter is from its normal frequency in English — the core signal when breaking a substitution cipher.',
    },
  ],

  faq: [
    {
      q: 'What is the most common letter in English?',
      a: 'E, at about 12.02% of letters, followed by T at 9.10% and A at 8.12%. The figures used here are from Robert Lewand\'s Cryptological Mathematics (2000), which is the standard reference set in classical cryptanalysis.',
    },
    {
      q: 'How does letter frequency help break a cipher?',
      a: 'In a simple substitution cipher each plaintext letter maps to one ciphertext letter, so the frequency distribution is preserved — just relabelled. The most common ciphertext letter is very likely E, the next T. The deviation column ranks candidates for you.',
    },
    {
      q: 'What is the index of coincidence?',
      a: 'The probability that two letters picked at random from the text are the same. English prose sits near 0.067; random text near 0.038. A ciphertext near 0.067 is probably a simple substitution; one near 0.038 is probably polyalphabetic, like Vigenère — which tells you which attack to use.',
    },
    {
      q: 'Can I use this for keyword density?',
      a: 'Yes — switch to words, turn on "ignore common words", and read the percentage column. Two-word and three-word phrase counts are usually more informative than single words for content work.',
    },
    {
      q: 'Does it handle non-English text?',
      a: 'Counting works for any script — Bangla, Arabic, CJK and emoji are all counted correctly as grapheme clusters. The deviation column is English-specific and is left blank for characters outside the Latin alphabet.',
    },
    {
      q: 'How are emoji and accented letters counted?',
      a: 'As single characters. A family emoji is one entry, not seven, because the counter works on grapheme clusters rather than code points.',
    },
  ],

  infoGain: {
    summary:
      'Two audiences reach for this tool and competitors serve only one. Cryptanalysts need the frequency compared against the English baseline and the index of coincidence; writers need word and phrase density. Both are here, along with a Unicode category breakdown that reveals the emoji and punctuation you did not know were in the text.',
    table: {
      caption: 'Standard English letter frequency, used for the deviation column',
      head: ['Letter', 'Frequency', 'Letter', 'Frequency'],
      rows: [
        ['E', '12.02%', 'D', '4.32%'],
        ['T', '9.10%', 'L', '3.98%'],
        ['A', '8.12%', 'U', '2.88%'],
        ['O', '7.68%', 'C', '2.71%'],
        ['I', '7.31%', 'M', '2.61%'],
        ['N', '6.95%', 'Z', '0.07%'],
      ],
    },
    benchmarks: [
      { label: 'Index of coincidence, English', value: '≈ 0.067', note: 'simple substitution preserves this' },
      { label: 'Index of coincidence, random', value: '≈ 0.038', note: 'polyalphabetic ciphers approach it' },
    ],
    supports: [
      'Character, word, two-word and three-word frequency',
      'Deviation from standard English letter frequency',
      'Index of coincidence for cipher classification',
      'Unicode category breakdown — letters, digits, punctuation, symbols, emoji',
      'Grapheme-accurate counting for every script',
    ],
    limits: [
      'The baseline and the index of coincidence are English-specific. Other languages have different distributions and the comparison is meaningless for them.',
      'Frequency analysis needs volume. Below roughly 200 letters the distribution is too noisy to break a cipher with.',
      'Stop-word removal uses an English list only.',
    ],
    verified: '2026-08',
  },

  related: [
    'word-counter',
    'readability-checker',
    'text-reverser',
    'remove-extra-spaces',
    'sort-lines',
    'text-encryptor',
    'case-converter',
  ],
  nextSteps: ['word-counter', 'readability-checker', 'text-encryptor'],

  added: '2026-08-09',
  updated: '2026-08-09',

  run: (input, options) => {
    if (input.trim() === '') return {};

    const limit = Math.round(options.limit);
    const categories = categorise(input);
    const ic = indexOfCoincidence(input);

    const rows =
      options.unit === 'characters'
        ? characterFrequency(input, {
            caseSensitive: options.caseSensitive,
            lettersOnly: options.lettersOnly,
            includeWhitespace: options.includeWhitespace,
          })
        : wordFrequency(input, {
            caseSensitive: options.caseSensitive,
            minLength: Math.round(options.minLength),
            removeStopWords: options.removeStopWords,
            ngram: options.unit === 'bigrams' ? 2 : options.unit === 'trigrams' ? 3 : 1,
          });

    const isCharacters = options.unit === 'characters';
    const showDeviation = isCharacters && rows.some((r) => r.deviation !== undefined);

    const head = isCharacters
      ? showDeviation
        ? ['Character', 'Count', 'Share', 'vs English']
        : ['Character', 'Count', 'Share']
      : ['Item', 'Count', 'Share'];

    const label = (item: string) =>
      item === ' ' ? '(space)' : item === '\n' ? '(line break)' : item === '\t' ? '(tab)' : item;

    const icVerdict =
      ic === 0
        ? '—'
        : Math.abs(ic - IC_ENGLISH) < Math.abs(ic - IC_RANDOM)
          ? 'near English'
          : 'near random';

    return {
      stats: [
        { label: 'Distinct items', value: rows.length, primary: true },
        { label: 'Total counted', value: rows.reduce((s, r) => s + r.count, 0), primary: true },
        {
          // Quoted: a bare single letter in a tabular mono face is
          // ambiguous — "o" and "0" are hard to tell apart at 24px.
          label: 'Most frequent',
          value: rows[0] ? (rows[0].item.length === 1 ? `“${rows[0].item}”` : label(rows[0].item)) : '—',
          hint: rows[0] ? `${rows[0].count} times` : undefined,
          primary: true,
        },
        { label: 'Index of coincidence', value: ic, hint: icVerdict, primary: true },

        { label: 'Letters', value: categories.letters },
        { label: 'Digits', value: categories.digits },
        { label: 'Punctuation', value: categories.punctuation },
        { label: 'Symbols', value: categories.symbols },
        { label: 'Emoji', value: categories.emoji },
        { label: 'Whitespace', value: categories.whitespace },
      ],
      table: {
        caption: `Top ${Math.min(limit, rows.length)} by frequency`,
        head,
        rows: rows.slice(0, limit).map((r) =>
          showDeviation
            ? [
                label(r.item),
                r.count,
                `${r.percent}%`,
                r.deviation === undefined
                  ? '—'
                  : `${r.deviation > 0 ? '+' : ''}${r.deviation}`,
              ]
            : [label(r.item), r.count, `${r.percent}%`],
        ),
        barColumn: 1,
      },
      notes: [
        ic > 0 && ic < 0.05
          ? `Index of coincidence ${ic} is close to random (0.038). If this is a ciphertext, it is more likely polyalphabetic than a simple substitution.`
          : ic >= 0.06
            ? `Index of coincidence ${ic} is close to English prose (0.067). A simple substitution cipher preserves this, so frequency analysis is worth trying.`
            : '',
      ].filter(Boolean),
    };
  },
});
