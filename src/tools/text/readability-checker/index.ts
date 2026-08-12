import { defineTool } from '@core/tool';
import { readability } from '@engines/text';

interface Options {
  target: 'general' | 'academic' | 'marketing';
}

const TARGETS = {
  general: { label: 'General audience', minEase: 60, note: 'Plain English — the level most news writing aims for.' },
  academic: { label: 'Academic or technical', minEase: 30, note: 'Denser prose is acceptable for a specialist reader.' },
  marketing: { label: 'Marketing or landing page', minEase: 70, note: 'Should be scannable at a glance.' },
} as const;

export default defineTool<string, Options>({
  slug: 'readability-checker',
  category: 'text',
  cluster: 'text-analysis',

  name: 'Readability Checker',
  tagline: 'Flesch Reading Ease, Flesch-Kincaid grade and Gunning Fog, with the inputs shown.',
  titleBenefit: 'Flesch and Kincaid Grades',
  description:
    'Score how hard your writing is to read using three standard formulas. Shows the sentence length and syllable counts behind each score, so you know what to change.',
  keywords: ['readability checker', 'flesch reading ease', 'flesch kincaid grade level', 'readability score'],

  runtime: 'client',
  status: 'live',
  premium: false,
  apiEnabled: true,

  score: { demand: 6, evergreen: 9, serp: 7, money: 6, ease: 9 },

  input: {
    type: 'text',
    label: 'Your text',
    placeholder: 'Paste a paragraph, an article or an email…',
    mono: false,
    rows: 10,
    sample:
      'The implementation of the aforementioned methodology necessitates a comprehensive evaluation of the constituent parameters. Subsequently, the resultant data will be subjected to rigorous statistical analysis in order to ascertain the validity of the initial hypothesis.',
  },

  options: [
    {
      key: 'target',
      type: 'enum',
      label: 'Writing for',
      default: 'general',
      values: [
        { value: 'general', label: 'General audience' },
        { value: 'marketing', label: 'Marketing or landing page' },
        { value: 'academic', label: 'Academic or technical' },
      ],
      help: 'Changes the pass mark, not the score itself.',
    },
  ],

  output: { type: 'stats' },

  howTo: [
    { title: 'Paste at least a paragraph', detail: 'These formulas are averages. Under roughly 100 words the numbers swing wildly on a single long sentence.' },
    { title: 'Choose your audience', detail: 'This sets the threshold the score is judged against. The score itself never changes.' },
    { title: 'Fix the biggest lever first', detail: 'Average sentence length usually moves the score more than word choice. Split the long sentences before hunting for shorter synonyms.' },
  ],

  faq: [
    {
      q: 'What is a good Flesch Reading Ease score?',
      a: 'Sixty to seventy is plain English, understandable by most adults, and the range most newspapers and general-audience writing land in. Above eighty is very easy. Below thirty is dense enough that a specialist reader will still have to slow down.',
    },
    {
      q: 'What is the difference between Reading Ease and the Flesch-Kincaid grade?',
      a: 'They use the same two inputs — average sentence length and average syllables per word — but scale them differently. Reading Ease is a 0-100 score where higher is easier. Flesch-Kincaid converts the same data into a US school grade level, where lower is easier.',
    },
    {
      q: 'How are syllables counted?',
      a: 'By a vowel-group heuristic with adjustments for silent "e" and common suffixes. It is accurate to about one syllable per word on ordinary prose. Every implementation of these formulas uses a heuristic, which is why scores differ slightly between tools.',
    },
    {
      q: 'How much text do I need for a reliable score?',
      a: 'At least 100 words, and ideally 200. These are averages across sentences, so on a short sample one 40-word sentence can move the score by ten points on its own.',
    },
    {
      q: 'Do these formulas work for languages other than English?',
      a: 'No. Flesch and Gunning Fog were both calibrated on English and depend on English syllable patterns. A score for German, Bangla or Spanish text will be produced but it is not meaningful — use a formula built for that language.',
    },
    {
      q: 'Does a higher readability score help SEO?',
      a: 'Not directly. There is no readability signal in any published ranking system. It helps indirectly: text people can read is text people finish, and completion is what search engines can actually observe.',
    },
  ],

  infoGain: {
    summary:
      'Most readability tools return one number and nothing else. This one shows the two inputs every formula is built on — average sentence length and average syllables per word — plus the count of three-syllable words. Those three numbers tell you what to change; the score on its own only tells you that something is wrong.',
    table: {
      caption: 'What each score band means in practice',
      head: ['Reading Ease', 'Grade level', 'Comparable to'],
      rows: [
        ['90–100', '5th grade', 'Children’s writing'],
        ['70–80', '7th grade', 'Popular fiction'],
        ['60–70', '8th–9th grade', 'Plain English; most news writing'],
        ['30–50', 'University', 'Trade press, technical documentation'],
        ['0–30', 'Postgraduate', 'Academic papers, legal contracts'],
      ],
    },
    supports: [
      'Flesch Reading Ease (Flesch, 1948)',
      'Flesch-Kincaid Grade Level (Kincaid et al., 1975)',
      'Gunning Fog Index (Gunning, 1952)',
      'The underlying sentence-length and syllable inputs, not just the scores',
    ],
    limits: [
      'English only. Syllable heuristics do not transfer to other languages.',
      'Syllable counting is heuristic, so expect ±2 points against a hand count.',
      'Sentence detection is punctuation-based: "Dr. Smith" reads as two sentences and pulls the score up.',
      'These formulas measure surface complexity, not clarity. A short, badly organised paragraph scores well.',
    ],
    verified: '2026-08',
  },

  related: [
    'word-counter',
    'case-converter',
    'text-diff',
    'slug-generator',
    'sort-lines',
    'remove-duplicate-lines',
    'percentage-calculator',
    'character-frequency-counter',
    'lorem-ipsum-generator',
  ],
  nextSteps: ['word-counter', 'case-converter', 'text-diff'],

  added: '2026-08-08',
  updated: '2026-08-08',

  run: (input, options) => {
    const r = readability(input);
    const target = TARGETS[options.target];
    const passes = r.fleschReadingEase >= target.minEase;

    return {
      stats: [
        { label: 'Flesch Reading Ease', value: r.fleschReadingEase, hint: r.label, primary: true },
        { label: 'Flesch-Kincaid grade', value: r.fleschKincaidGrade, hint: 'US school grade', primary: true },
        { label: 'Gunning Fog index', value: r.gunningFog, hint: 'years of education', primary: true },
        {
          label: 'Against your target',
          value: passes ? 'Pass' : 'Too dense',
          hint: `needs ${target.minEase}+`,
          primary: true,
        },

        { label: 'Average words per sentence', value: r.avgWordsPerSentence, hint: 'aim for under 20' },
        { label: 'Average syllables per word', value: r.avgSyllablesPerWord, hint: 'aim for under 1.6' },
        { label: 'Words of three or more syllables', value: r.complexWords },
        { label: 'Total syllables', value: r.syllables },
      ],
      notes: [
        `${target.label}: ${target.note}`,
        r.avgWordsPerSentence > 20
          ? `Sentences average ${r.avgWordsPerSentence} words. Splitting the longest ones is the fastest way to move every score here.`
          : 'Sentence length is in a good range. Word choice is now the main lever.',
      ],
    };
  },
});
