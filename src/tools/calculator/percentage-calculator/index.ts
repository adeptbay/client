import { defineTool, ToolError } from '@core/tool';
import { PERCENT_QUESTIONS, percent, percentagePointDelta, type PercentMode } from '@engines/math';

interface Options {
  mode: PercentMode;
  a: number;
  b: number;
}

export default defineTool<string, Options>({
  slug: 'percentage-calculator',
  category: 'calculator',
  cluster: 'percentage',

  name: 'Percentage Calculator',
  tagline: 'Six percentage questions, each answered with the formula shown.',
  titleBenefit: 'With the Formula Shown',
  description:
    'Work out percentages, increases, decreases and percentage change — and see the substituted formula, so you can show the working to whoever asked.',
  keywords: [
    'percentage calculator',
    'percentage increase calculator',
    'percentage change calculator',
    'what percent of',
  ],

  runtime: 'client',
  status: 'live',
  premium: false,
  apiEnabled: true,

  score: { demand: 9, evergreen: 10, serp: 4, money: 6, ease: 10 },

  input: { type: 'form' },

  options: [
    {
      key: 'mode',
      type: 'enum',
      label: 'What do you want to work out?',
      default: 'of',
      values: (Object.keys(PERCENT_QUESTIONS) as PercentMode[]).map((mode) => ({
        value: mode,
        label: PERCENT_QUESTIONS[mode],
      })),
    },
    { key: 'a', type: 'number', label: 'A', default: 15, step: 0.01 },
    { key: 'b', type: 'number', label: 'B', default: 200, step: 0.01 },
  ],

  output: { type: 'text', mono: false, label: 'Answer' },

  howTo: [
    { title: 'Pick the question', detail: 'Six shapes cover almost every percentage problem. Choosing the right one is most of the work.' },
    { title: 'Enter A and B', detail: 'The labels above the answer tell you which number the calculator read as which.' },
    { title: 'Copy the working, not just the answer', detail: 'The substituted formula is shown so you can paste it into an email or a homework answer.' },
  ],

  faq: [
    {
      q: 'How do I calculate a percentage of a number?',
      a: 'Divide the percentage by 100 and multiply by the number. 15% of 200 is 15 ÷ 100 × 200 = 30. Select "What is A% of B?" and the calculator shows that substitution with your own figures.',
    },
    {
      q: 'What is the difference between percentage change and percentage points?',
      a: 'If a rate moves from 5% to 6%, that is a rise of one percentage point and a rise of twenty percent. Both are correct and they mean very different things. This calculator reports both whenever you compute a change, because conflating them is the single most common percentage error in reporting.',
    },
    {
      q: 'How do I calculate percentage increase?',
      a: 'Subtract the old value from the new one, divide by the old value, and multiply by 100. From 80 to 100 is (100 − 80) ÷ 80 × 100 = 25%. The order matters: dividing by the new value instead gives 20%, which is a different question.',
    },
    {
      q: 'Why is a 50% rise followed by a 50% fall not back where it started?',
      a: 'Because each percentage applies to a different base. 100 rises by 50% to 150, then falls by 50% of 150, which is 75, landing at 75. Reversing a 50% increase requires a 33.3% decrease. Percentages do not commute.',
    },
    {
      q: 'How do I find the original price before a discount?',
      a: 'Use "A is B% of what number?". If an item costs 80 after a 20% discount, it is 80% of the original, so 80 ÷ 80 × 100 = 100. Do not add 20% to 80 — that gives 96, which is a common and expensive mistake.',
    },
  ],

  infoGain: {
    summary:
      'Every answer comes with the substituted formula, not just a number. That is the difference between a calculator and an answer you can defend in a meeting or a marked assignment. Percentage change additionally reports percentage points alongside percent, because conflating the two is the most common quantitative error in business reporting.',
    table: {
      caption: 'The six questions, with a worked example each',
      head: ['Question', 'Example', 'Answer'],
      rows: [
        ['What is A% of B?', '15% of 200', '30'],
        ['A is what percent of B?', '30 of 200', '15%'],
        ['Percentage change A → B', '80 → 100', '25% increase'],
        ['Increase A by B%', '80 by 25%', '100'],
        ['Decrease A by B%', '100 by 20%', '80'],
        ['A is B% of what?', '80 is 80% of ?', '100'],
      ],
    },
    supports: [
      'Six question shapes covering standard percentage arithmetic',
      'The substituted formula for every result',
      'Percentage points reported alongside percent on change calculations',
      'Negative and decimal inputs',
    ],
    limits: [
      'Percentage change from zero is undefined and is reported as an error rather than as infinity.',
      'Results are rounded to four decimal places for display; the underlying arithmetic is full double precision.',
      'This is not compound interest. Repeated percentage changes need the compound interest calculator.',
    ],
    verified: '2026-08',
  },

  related: ['word-counter', 'json-formatter', 'uuid-generator', 'hash-generator', 'slug-generator', 'readability-checker'],
  nextSteps: ['word-counter', 'readability-checker'],

  added: '2026-08-08',
  updated: '2026-08-08',

  run: (_input, options) => {
    const a = Number(options.a);
    const b = Number(options.b);

    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      throw new ToolError('Both A and B need to be numbers.', 'Clear the field and type a value.');
    }

    let solved: ReturnType<typeof percent>;
    try {
      solved = percent(options.mode, a, b);
    } catch (err) {
      throw new ToolError(
        err instanceof Error ? err.message : 'That combination has no answer.',
        'Percentage change and "A is B% of what?" both divide by one of your inputs, so that input cannot be zero.',
      );
    }

    const stats = [
      { label: 'Answer', value: solved.formatted, primary: true },
      { label: 'Question', value: PERCENT_QUESTIONS[options.mode] },
      { label: 'A', value: a },
      { label: 'B', value: b },
    ];

    if (options.mode === 'change') {
      const delta = percentagePointDelta(a, b);
      stats.splice(1, 0, {
        label: 'In percentage points',
        value: `${delta.points > 0 ? '+' : ''}${Math.round(delta.points * 10000) / 10000}`,
        primary: true,
      } as (typeof stats)[number]);
    }

    return {
      output: solved.working,
      filename: 'calculation.txt',
      stats,
      notes:
        options.mode === 'change'
          ? ['A change from 5% to 6% is +1 percentage point and +20 percent. Both numbers are shown above because they answer different questions.']
          : undefined,
    };
  },
});
