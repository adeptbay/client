import { defineTool, ToolError } from '@core/tool';
import { applyRules, parseRuleList, RegexRiskError, type ReplaceRule } from '@engines/replace';

interface Options {
  mode: 'single' | 'rules';
  find: string;
  replace: string;
  rules: string;
  regex: boolean;
  caseSensitive: boolean;
  wholeWord: boolean;
  firstOnly: boolean;
}

export default defineTool<string, Options>({
  slug: 'find-and-replace',
  category: 'text',
  cluster: 'text-cleanup',

  name: 'Find and Replace',
  tagline: 'Regex, capture groups, and rule chains that run in order — with a guard against patterns that freeze the page.',
  titleBenefit: 'Regex and Rule Chains',
  description:
    'Find and replace text with regex and capture groups, or run a whole list of rules in sequence. Refuses patterns that would hang your browser instead of locking up.',
  keywords: [
    'find and replace online',
    'find and replace text',
    'bulk find and replace',
    'regex replace online',
  ],

  runtime: 'client',
  status: 'live',
  premium: false,
  apiEnabled: true,

  score: { demand: 7, evergreen: 10, serp: 6, money: 5, ease: 7 },

  input: {
    type: 'text',
    label: 'Your text',
    placeholder: 'Paste the text you want to change…',
    rows: 10,
    sample:
      'user_id: 1042\nuser_name: alice\nuser_email: alice@example.com\nuser_id: 1043\nuser_name: bob\nuser_email: bob@example.com',
  },

  options: [
    {
      key: 'mode',
      type: 'enum',
      label: 'Mode',
      default: 'single',
      values: [
        { value: 'single', label: 'One rule' },
        { value: 'rules', label: 'A list of rules, in order' },
      ],
    },
    {
      key: 'find',
      type: 'text',
      label: 'Find',
      default: '',
      placeholder: 'text or pattern',
      showIf: { key: 'mode', equals: 'single' },
    },
    {
      key: 'replace',
      type: 'text',
      label: 'Replace with',
      default: '',
      placeholder: 'leave empty to delete',
      showIf: { key: 'mode', equals: 'single' },
    },
    {
      key: 'rules',
      type: 'textarea',
      label: 'Rules — one per line, find => replace',
      default: '',
      rows: 5,
      wide: true,
      placeholder: 'user_ => \n: =>  = \n^\\s+ => ',
      showIf: { key: 'mode', equals: 'rules' },
      help: 'Rules run top to bottom, and each one sees the previous rule\'s output. Lines starting with # are ignored.',
    },
    {
      key: 'regex',
      type: 'bool',
      label: 'Regular expression',
      default: false,
      help: 'Enables capture groups — use $1, $2 in the replacement.',
    },
    { key: 'caseSensitive', type: 'bool', label: 'Case sensitive', default: false },
    {
      key: 'wholeWord',
      type: 'bool',
      label: 'Whole words only',
      default: false,
      help: 'Unicode-aware, so it works in scripts without ASCII word boundaries.',
    },
    { key: 'firstOnly', type: 'bool', label: 'Replace first match only', default: false },
  ],

  output: { type: 'text', label: 'Result' },

  howTo: [
    { title: 'Paste your text', detail: 'Nothing is uploaded — the replacement runs in this browser tab.' },
    {
      title: 'Enter what to find',
      detail: 'Turn on regex for patterns, and use $1 and $2 in the replacement to reuse capture groups.',
    },
    {
      title: 'Or write a list of rules',
      detail: 'Switch to rule mode and write one "find => replace" per line. They run in order, each seeing the previous result — which is how real cleanup actually works.',
    },
  ],

  faq: [
    {
      q: 'How do I use capture groups in the replacement?',
      a: 'Turn on regex mode, wrap part of the pattern in parentheses, and refer to it as $1 in the replacement. For example, find `(\\w+)@(\\w+)` and replace with `$2 — $1` swaps the two halves of an email around the @.',
    },
    {
      q: 'What is the difference between one rule and a list of rules?',
      a: 'A list runs top to bottom, and each rule operates on the output of the one before it. That matters: stripping a prefix and then collapsing separators gives a different result from doing it the other way round. Most online tools make you run each pass manually.',
    },
    {
      q: 'Why did the tool refuse my regular expression?',
      a: 'It detected a shape that can backtrack exponentially — usually a quantifier applied to a group that already repeats, like (a+)+. On a long input that takes effectively forever and freezes the tab. Rewrite it with a bounded quantifier or turn regex mode off.',
    },
    {
      q: 'Does "whole words only" work in languages other than English?',
      a: 'Yes. It uses Unicode letter and number properties rather than the \\b word boundary, which is defined against ASCII and gives wrong answers in Bangla, Arabic, Greek and Cyrillic.',
    },
    {
      q: 'Can I replace across line breaks?',
      a: 'Yes, in regex mode. Use \\n to match a newline. Note that the input may contain CRLF line endings, in which case match \\r?\\n.',
    },
    {
      q: 'Is there a size limit?',
      a: 'Five megabytes. Past that, browser regex stalls the page whatever the pattern is, so the tool refuses rather than appearing to hang.',
    },
  ],

  infoGain: {
    summary:
      'Two things separate this from the dozen other regex replacers online. Rules run as an ordered chain, each seeing the previous output, because real cleanup is never one substitution. And the pattern is checked for catastrophic backtracking before it runs — JavaScript regex has no timeout, so an unguarded (a+)+ locks the tab with no way out.',
    table: {
      caption: 'Patterns this tool refuses, and why',
      head: ['Pattern', 'Problem', 'Safe rewrite'],
      rows: [
        ['(a+)+$', 'Quantifier on an already-repeating group', 'a+$'],
        ['(\\w+\\s?)*$', 'Same shape, harder to spot', '[\\w\\s]*$'],
        ['(x|x)*y', 'Alternation with identical branches under a quantifier', 'x*y'],
        ['.*.*.*foo', 'Several unbounded wildcards in sequence', '.*foo'],
      ],
    },
    supports: [
      'Ordered rule chains — each rule sees the previous result',
      'Full JavaScript regex with capture groups ($1, $2)',
      'Unicode-aware whole-word matching',
      'Catastrophic-backtracking detection before execution',
      'Per-rule match counts, so you can see which rule did nothing',
    ],
    limits: [
      'Backtracking detection is a heuristic. It catches the common shapes and can occasionally refuse a pattern that would have been fine.',
      'No lookbehind on very old Safari. Whole-word mode falls back gracefully but check the result if you are on an older browser.',
      'Replacements are literal apart from $1-style group references. To insert a literal $1, write $$1.',
    ],
    verified: '2026-08',
  },

  related: [
    'remove-extra-spaces',
    'remove-duplicate-lines',
    'sort-lines',
    'case-converter',
    'text-diff',
    'line-numberer',
    'text-to-columns',
  ],
  nextSteps: ['text-diff', 'remove-extra-spaces', 'sort-lines'],

  added: '2026-08-09',
  updated: '2026-08-09',

  run: (input, options) => {
    if (input === '') return { output: '' };

    const rules: ReplaceRule[] =
      options.mode === 'rules'
        ? parseRuleList(options.rules)
        : [{ find: options.find, replace: options.replace }];

    if (rules.length === 0 || rules.every((r) => r.find === '')) {
      return {
        output: input,
        notes: [
          options.mode === 'rules'
            ? 'No rules yet. Write one per line as "find => replace".'
            : 'Enter something to find and the result will update as you type.',
        ],
      };
    }

    try {
      const result = applyRules(input, rules, options);

      return {
        output: result.output,
        filename: 'replaced.txt',
        stats: [
          { label: 'Replacements', value: result.totalMatches, primary: true },
          { label: 'Rules applied', value: rules.length, primary: true },
          { label: 'Lines changed', value: result.changedLines.length, primary: true },
        ],
        table:
          rules.length > 1
            ? {
                caption: 'What each rule did, in order',
                head: ['#', 'Find', 'Replace with', 'Matches'],
                rows: result.outcomes.map((o, i) => [
                  i + 1,
                  o.rule.find,
                  o.rule.replace || '(deleted)',
                  o.error ?? o.matches,
                ]),
              }
            : undefined,
        notes:
          result.totalMatches === 0
            ? ['Nothing matched. Check case sensitivity, and whether the text contains a non-breaking space where you expected a normal one.']
            : undefined,
      };
    } catch (err) {
      if (err instanceof RegexRiskError) throw new ToolError(err.message, err.hint);
      throw err;
    }
  },
});
