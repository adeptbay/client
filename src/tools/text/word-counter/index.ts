import { defineTool } from '@core/tool';
import { countText } from '@engines/text';

interface Options {
  countSpaces: boolean;
}

export default defineTool<string, Options>({
  slug: 'word-counter',
  category: 'text',
  cluster: 'text-analysis',

  name: 'Word Counter',
  tagline: 'Words, characters, sentences and reading time — updated as you type.',
  description:
    'Count words, characters, sentences, paragraphs and reading time instantly. Handles Bangla, Chinese, Arabic and emoji correctly, and never uploads your text.',
  keywords: ['word counter', 'character count', 'count words online', 'word count tool'],

  runtime: 'client',
  status: 'live',
  premium: false,
  apiEnabled: true,

  // Highest-volume tool in the division and trivially client-side.
  score: { demand: 9, evergreen: 10, serp: 5, money: 4, ease: 10 },

  input: {
    type: 'text',
    label: 'Your text',
    placeholder: 'Paste or type your text here…',
    mono: false,
    rows: 10,
    sample:
      'The best time to plant a tree was twenty years ago. The second best time is now.\n\nThis proverb turns up in a lot of pitch decks. Its actual origin is unclear, which is itself a useful lesson about sources.',
  },

  options: [
    {
      key: 'countSpaces',
      type: 'bool',
      label: 'Include spaces in the character count',
      default: true,
      help: 'Turn this off to match the limit used by most CVs and application forms.',
    },
  ],

  output: { type: 'stats' },

  howTo: [
    {
      title: 'Paste or type your text',
      detail: 'Use the box above. Nothing is sent anywhere — the count is calculated in this browser tab.',
    },
    {
      title: 'Read the counts',
      detail: 'Words and characters update on every keystroke. Sentences, paragraphs and reading time appear underneath.',
    },
    {
      title: 'Match a specific limit',
      detail: 'Turn off "include spaces" if your form counts characters without them, which most application forms do.',
    },
  ],

  faq: [
    {
      q: 'How does this tool count words?',
      a: 'It uses the browser\'s Unicode text segmentation, which splits on real word boundaries rather than on spaces. That gives correct counts for Chinese, Japanese, Thai and Bangla, where a whitespace split would report one word for an entire sentence.',
    },
    {
      q: 'Does the character count include spaces?',
      a: 'Both numbers are shown. "Characters" includes spaces and line breaks; "characters without spaces" excludes all whitespace. Most CV forms and social platforms count the first, but application forms often count the second.',
    },
    {
      q: 'Is my text uploaded to a server?',
      a: 'No. The entire count runs in JavaScript inside your browser. You can disconnect from the internet after the page loads and the tool keeps working, which is the simplest way to verify the claim.',
    },
    {
      q: 'How is reading time calculated?',
      a: 'Reading time uses 238 words per minute, the mean silent reading rate for adults reading English non-fiction found in Brysbaert\'s 2019 meta-analysis of 190 studies. Speaking time uses 150 words per minute, a typical presentation pace.',
    },
    {
      q: 'How are emoji and accented characters counted?',
      a: 'By grapheme, not by code unit. A family emoji is one character here, though JavaScript\'s raw string length would report eleven. Accented letters count as one character whether or not they are stored as a combining sequence.',
    },
    {
      q: 'Is there a size limit?',
      a: 'No hard limit. Counting stays under a frame at around 200,000 words on a mid-range laptop; beyond that the typing itself becomes the slow part, not the counting.',
    },
  ],

  infoGain: {
    summary:
      'Most online word counters split text on whitespace. That is correct for English and wrong for roughly half the world: a 40-character Chinese sentence has no spaces and gets reported as one word. This tool uses Intl.Segmenter, the browser\'s own Unicode word-boundary implementation, so the count is right in every script.',
    benchmarks: [
      { label: '10,000 words', value: '7.4 ms', note: 'i5-6300U, Chrome 151, median of 8' },
      { label: '200,000 words', value: '186 ms', note: 'a 300-page book, still under a fifth of a second' },
    ],
    table: {
      caption: 'Where the naive whitespace split gets it wrong',
      head: ['Input', 'Whitespace split', 'This tool'],
      rows: [
        ['我今天很開心', '1 word', '4 words'],
        ['আমি ভালো আছি', '3 words', '3 words'],
        ['well-known', '1 word', '1 word'],
        ['👨‍👩‍👧‍👦', '1 char (11 by string length)', '1 char'],
      ],
    },
    supports: [
      'All Unicode scripts, including CJK, Thai, Arabic and Bangla',
      'Grapheme-accurate character counts for emoji and combining marks',
      'Sentence detection across Latin and CJK punctuation',
      'Paragraph counting on blank-line boundaries',
    ],
    limits: [
      'Sentence counting is punctuation-based, so "Dr. Smith" is read as two sentences.',
      'Reading time is an average. Technical writing runs slower, fiction faster.',
      'Hyphenated compounds count as one word, matching most editorial style guides.',
    ],
    verified: '2026-08',
  },

  // percentage-calculator is cross-division on purpose: the audience is
  // the same (students and writers working to a limit), and "how far
  // over my 500-word cap am I" is the next question after this one.
  related: [
    'readability-checker',
    'case-converter',
    'remove-duplicate-lines',
    'sort-lines',
    'slug-generator',
    'text-diff',
    'percentage-calculator',
    'character-frequency-counter',
    'remove-extra-spaces',
  ],
  nextSteps: ['readability-checker', 'case-converter', 'text-diff'],

  added: '2026-08-08',
  updated: '2026-08-08',

  run: (input, options) => {
    const c = countText(input);

    const readTime =
      c.readingSeconds < 60
        ? `${c.readingSeconds} sec`
        : `${Math.round(c.readingSeconds / 60)} min`;
    const speakTime =
      c.speakingSeconds < 60
        ? `${c.speakingSeconds} sec`
        : `${Math.round(c.speakingSeconds / 60)} min`;

    return {
      stats: [
        { label: 'Words', value: c.words, primary: true },
        {
          label: options.countSpaces ? 'Characters' : 'Characters (no spaces)',
          value: options.countSpaces ? c.characters : c.charactersNoSpaces,
          primary: true,
        },
        { label: 'Sentences', value: c.sentences, primary: true },
        { label: 'Reading time', value: readTime, hint: 'at 238 wpm', primary: true },

        { label: 'Characters including spaces', value: c.characters },
        { label: 'Characters without spaces', value: c.charactersNoSpaces },
        { label: 'Paragraphs', value: c.paragraphs },
        { label: 'Lines', value: c.lines },
        { label: 'Speaking time', value: speakTime, hint: 'at 150 wpm' },
        { label: 'Longest word', value: c.longestWord || '—' },
      ],
    };
  },
});
