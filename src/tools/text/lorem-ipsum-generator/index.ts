import { defineTool } from '@core/tool';
import {
  generateLorem,
  LOREM_ORIGIN,
  type LoremFlavour,
  type LoremFormat,
  type LoremUnit,
} from '@engines/lorem';

interface Options {
  flavour: LoremFlavour;
  unit: LoremUnit;
  count: number;
  format: LoremFormat;
  startWithLorem: boolean;
  seed: string;
}

export default defineTool<string, Options>({
  slug: 'lorem-ipsum-generator',
  category: 'text',
  cluster: 'text-generate',

  name: 'Lorem Ipsum Generator',
  tagline: 'Placeholder text in five scripts, six output formats, and a seed so it stops changing between runs.',
  description:
    'Generate placeholder text as HTML, Markdown, JSX or a JSON array. Set a seed for reproducible output, or switch script to test a layout that must hold Bangla.',
  keywords: [
    'lorem ipsum generator',
    'dummy text generator',
    'placeholder text generator',
    'lorem ipsum',
  ],

  runtime: 'client',
  status: 'live',
  premium: false,
  apiEnabled: true,

  score: { demand: 7, evergreen: 10, serp: 5, money: 4, ease: 9 },

  input: { type: 'form' },
  runLabel: 'Generate',

  options: [
    {
      key: 'flavour',
      type: 'enum',
      label: 'Script',
      default: 'classic',
      values: [
        { value: 'classic', label: 'Classic Latin — lorem ipsum' },
        { value: 'english', label: 'Plain English — realistic word lengths' },
        { value: 'bangla', label: 'Bangla — বাংলা' },
        { value: 'japanese', label: 'Japanese — 日本語' },
        { value: 'arabic', label: 'Arabic — العربية (right to left)' },
      ],
      help: 'Latin text is the wrong width and line-height for testing a layout that will hold another script.',
    },
    {
      key: 'unit',
      type: 'enum',
      label: 'Generate',
      default: 'paragraphs',
      values: [
        { value: 'paragraphs', label: 'Paragraphs' },
        { value: 'sentences', label: 'Sentences' },
        { value: 'words', label: 'Words' },
        { value: 'list', label: 'List items' },
      ],
    },
    { key: 'count', type: 'range', label: 'How many', default: 3, min: 1, max: 100, step: 1 },
    {
      key: 'format',
      type: 'enum',
      label: 'Output format',
      default: 'plain',
      values: [
        { value: 'plain', label: 'Plain text' },
        { value: 'html', label: 'HTML — <p> or <ul>' },
        { value: 'markdown', label: 'Markdown' },
        { value: 'jsx', label: 'JSX' },
        { value: 'array', label: 'JSON array' },
      ],
    },
    {
      key: 'startWithLorem',
      type: 'bool',
      label: 'Start with “Lorem ipsum dolor sit amet”',
      default: true,
      showIf: { key: 'flavour', equals: 'classic' },
    },
    {
      key: 'seed',
      type: 'text',
      label: 'Seed',
      default: '',
      placeholder: 'leave empty for random',
      help: 'The same seed always produces the same text — so placeholder content stops breaking your screenshot tests.',
    },
  ],

  output: { type: 'text', mono: false, label: 'Placeholder text' },

  howTo: [
    { title: 'Choose a script and amount', detail: 'Paragraphs for body copy, list items for navigation and cards.' },
    {
      title: 'Pick the output format',
      detail: 'HTML and JSX come wrapped in tags, so you can paste straight into a template instead of adding them by hand.',
    },
    {
      title: 'Set a seed if the text will be committed',
      detail: 'A seeded run is reproducible. Without one, every regeneration changes the text and any screenshot test comparing against it fails.',
    },
  ],

  faq: [
    {
      q: 'What does lorem ipsum actually mean?',
      a: LOREM_ORIGIN,
    },
    {
      q: 'Why would I want a seed?',
      a: 'Because unseeded placeholder text changes on every generation. If it is committed into a fixture or a Storybook story, every regeneration produces a diff and any visual regression test comparing screenshots fails for no real reason. The same seed always returns the same text.',
    },
    {
      q: 'Why generate placeholder text in Bangla or Japanese?',
      a: 'Because Latin text is the wrong shape for testing. Japanese has no spaces so it wraps completely differently, Bangla has taller line boxes because of its matras, and Arabic runs right to left. A layout that looks fine full of lorem ipsum can break the moment real content arrives.',
    },
    {
      q: 'Should I use lorem ipsum or realistic text?',
      a: 'Lorem ipsum stops people reading the copy and reviewing it instead of the layout, which is the classic argument for it. Against that, it hides real problems — genuine headlines are longer and words are a different average length. The "plain English" option here sits in between.',
    },
    {
      q: 'Is the generated text safe to publish?',
      a: 'Do not publish it. Placeholder text left on a live page is a well-known embarrassment, and search engines index it. It is also meaningless content, which is exactly what a quality review penalises.',
    },
  ],

  infoGain: {
    summary:
      'Placeholder generators have looked the same since 1999: pick a number of paragraphs, get a wall of Latin. Three things here are genuinely different — output wrapped in HTML, JSX or a JSON array so it pastes straight into a template; a seed so the text is reproducible across runs; and four scripts besides Latin, because Latin is the wrong shape for testing a layout that will hold Bangla or Japanese.',
    table: {
      caption: 'Why script choice changes a layout test',
      head: ['Script', 'What breaks that Latin text hides'],
      rows: [
        ['Japanese', 'No spaces between words — wrapping behaves completely differently'],
        ['Bangla', 'Taller line boxes from matras above and below the baseline'],
        ['Arabic', 'Right-to-left flow, and alignment that has to mirror'],
        ['Plain English', 'Realistic word lengths — Latin words average shorter than English'],
      ],
    },
    supports: [
      'Paragraphs, sentences, words and list items',
      'Plain, HTML, Markdown, JSX and JSON array output',
      'Five scripts: Latin, English, Bangla, Japanese, Arabic',
      'Deterministic seeding via a Mulberry32 generator',
      'Correct sentence punctuation per script — । for Bangla, 。for Japanese',
    ],
    limits: [
      'The non-Latin word lists are vocabulary samples, not grammatical text. They are for measuring layout, not for reading.',
      'Seeded output is stable within a version. If the word lists change in a future release, the same seed will produce different text.',
      'HTML output escapes angle brackets but is not a sanitiser — it is placeholder text, not user input.',
    ],
    verified: '2026-08',
  },

  related: [
    'word-counter',
    'case-converter',
    'slug-generator',
    'readability-checker',
    'text-to-columns',
    'uuid-generator',
    'character-frequency-counter',
  ],
  nextSteps: ['word-counter', 'case-converter', 'uuid-generator'],

  added: '2026-08-09',
  updated: '2026-08-09',

  run: (_input, options) => {
    const result = generateLorem(options);

    return {
      output: result.text,
      filename: 'placeholder.txt',
      stats: [
        { label: 'Words', value: result.words, primary: true },
        { label: 'Characters', value: result.characters, primary: true },
        { label: 'Blocks', value: result.blocks.length, primary: true },
        { label: 'Seed', value: result.seedUsed, hint: 'reuse for identical output', primary: true },
      ],
      notes: [
        options.seed.trim() === ''
          ? `Generated with seed ${result.seedUsed}. Paste it into the seed field to reproduce this exact text.`
          : `Reproducible: seed "${result.seedUsed}" always produces this text.`,
        'Do not ship placeholder text to a live page — search engines index it.',
      ],
    };
  },
});
