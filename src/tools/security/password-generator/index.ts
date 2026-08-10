import { defineTool, ToolError } from '@core/tool';
import { CHARSETS, crackTimeLabel, entropyBits, generatePassword } from '@engines/random';

interface Options {
  length: number;
  count: number;
  lower: boolean;
  upper: boolean;
  digits: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
  requireEach: boolean;
}

export default defineTool<string, Options>({
  slug: 'password-generator',
  category: 'security',
  cluster: 'identifiers',

  name: 'Password Generator',
  tagline: 'Strong passwords from your browser’s cryptographic random source — never sent anywhere.',
  description:
    'Generate strong random passwords with the entropy shown in bits. Uses Web Crypto with rejection sampling, so every character is uniformly distributed.',
  keywords: ['password generator', 'strong password generator', 'random password', 'secure password generator'],

  runtime: 'client',
  status: 'live',
  premium: false,
  apiEnabled: false, // A password generated on a server is not a password.

  score: { demand: 9, evergreen: 10, serp: 5, money: 5, ease: 10 },

  input: { type: 'form' },

  options: [
    { key: 'length', type: 'range', label: 'Length', default: 20, min: 8, max: 128, step: 1, unit: ' chars' },
    { key: 'count', type: 'range', label: 'How many', default: 5, min: 1, max: 50, step: 1 },
    { key: 'lower', type: 'bool', label: 'Lowercase (a–z)', default: true },
    { key: 'upper', type: 'bool', label: 'Uppercase (A–Z)', default: true },
    { key: 'digits', type: 'bool', label: 'Digits (0–9)', default: true },
    { key: 'symbols', type: 'bool', label: 'Symbols (!@#$…)', default: true },
    {
      key: 'excludeAmbiguous',
      type: 'bool',
      label: 'Exclude look-alike characters',
      default: false,
      help: 'Removes I l 1 O 0 o B 8 S 5 Z 2 — worth it if the password will be read aloud or typed from paper.',
    },
    {
      key: 'requireEach',
      type: 'bool',
      label: 'Require at least one of each selected type',
      default: true,
      help: 'Satisfies "must contain a number and a symbol" rules. Costs a negligible amount of entropy.',
    },
  ],

  output: { type: 'text', label: 'Passwords' },

  howTo: [
    { title: 'Set the length', detail: 'Twenty characters is a good default for anything stored in a password manager. Length matters far more than which symbols you include.' },
    { title: 'Generate', detail: 'Press Generate for a fresh batch. Nothing is stored, logged or transmitted.' },
    { title: 'Save it in a password manager', detail: 'A generated password is only useful if you never have to remember it. Copy it straight into a manager.' },
  ],

  faq: [
    {
      q: 'Are these passwords generated on a server?',
      a: 'No. They are generated in your browser by crypto.getRandomValues. Nothing is sent over the network, nothing is logged, and closing the tab destroys them. A password generator that round-trips to a server has already failed at its one job.',
    },
    {
      q: 'How long should a password be?',
      a: 'Sixteen characters or more for anything that matters, and twenty if a password manager is doing the remembering. Length is the dominant factor: adding one character to a 72-character alphabet multiplies the search space by 72, while adding a symbol type to a fixed length does far less.',
    },
    {
      q: 'What does entropy in bits actually mean?',
      a: 'It is the base-2 logarithm of the number of passwords the generator could have produced. Every extra bit doubles that number. Under 50 bits is weak against an offline attack; 80 bits or more is comfortable; 128 bits is beyond any foreseeable brute force.',
    },
    {
      q: 'How is the crack time estimated?',
      a: 'It assumes one trillion guesses per second — an offline attack with GPUs against a weakly hashed password file. That is a pessimistic assumption on purpose. An online attack against a rate-limited login is millions of times slower.',
    },
    {
      q: 'Why does "require one of each type" reduce entropy?',
      a: 'Because it removes every password that lacks one of the types, shrinking the possible set. The reduction is fractions of a bit at normal lengths, and worth accepting when a site enforces composition rules. The bits shown here are the honest figure for a purely random draw.',
    },
    {
      q: 'Is Math.random good enough for this?',
      a: 'No. Math.random uses a fast non-cryptographic PRNG whose internal state can be recovered from a small number of observed outputs, after which every future value is predictable. This tool uses crypto.getRandomValues with rejection sampling to eliminate modulo bias.',
    },
  ],

  infoGain: {
    summary:
      'Two implementation details separate a real password generator from a demo. First, crypto.getRandomValues rather than Math.random, whose state is recoverable from a handful of outputs. Second, rejection sampling instead of a modulo: taking a random 32-bit integer mod 72 makes the first 40 characters of the alphabet measurably more likely than the rest.',
    table: {
      caption: 'Entropy by length, all four character types on (72-character alphabet)',
      head: ['Length', 'Entropy', 'Offline crack time at 10¹² guesses/sec'],
      rows: [
        ['8 chars', '49.4 bits', 'about 5 days'],
        ['12 chars', '74.1 bits', 'about 370,000 years'],
        ['16 chars', '98.8 bits', 'longer than the age of the universe'],
        ['20 chars', '123.5 bits', 'longer than the age of the universe'],
      ],
    },
    supports: [
      'crypto.getRandomValues with rejection sampling — uniform, no modulo bias',
      'Fisher-Yates shuffle so guaranteed characters are not always at the front',
      'Look-alike character exclusion for passwords that get read aloud',
      'Entropy reported in bits for the exact alphabet you selected',
    ],
    limits: [
      'The entropy figure describes the generator, not a password you chose yourself. It says nothing about a human-picked password.',
      'Crack times assume an offline attack on a weak hash. Against bcrypt or Argon2 they are far longer.',
      '"Require one of each type" slightly reduces entropy; the number shown is the unconstrained figure.',
    ],
    verified: '2026-08',
  },

  related: [
    'uuid-generator',
    'hash-generator',
    'base64-encoder',
    'url-encoder',
    'json-formatter',
    'slug-generator',
    'text-encryptor',
  ],
  nextSteps: ['hash-generator', 'uuid-generator', 'base64-encoder'],

  added: '2026-08-08',
  updated: '2026-08-08',

  run: (_input, options) => {
    const length = Math.round(options.length);
    const count = Math.min(50, Math.max(1, Math.round(options.count)));

    let poolSize = 0;
    if (options.lower) poolSize += CHARSETS.lower.length;
    if (options.upper) poolSize += CHARSETS.upper.length;
    if (options.digits) poolSize += CHARSETS.digits.length;
    if (options.symbols) poolSize += CHARSETS.symbols.length;

    if (poolSize === 0) {
      throw new ToolError(
        'No character types are selected.',
        'Turn on at least one of lowercase, uppercase, digits or symbols.',
      );
    }

    if (options.excludeAmbiguous) {
      const excluded = [...CHARSETS.ambiguous].filter((c) => {
        if (CHARSETS.lower.includes(c)) return options.lower;
        if (CHARSETS.upper.includes(c)) return options.upper;
        if (CHARSETS.digits.includes(c)) return options.digits;
        return false;
      }).length;
      poolSize -= excluded;
    }

    const passwords: string[] = [];
    for (let i = 0; i < count; i++) {
      passwords.push(
        generatePassword({
          length,
          lower: options.lower,
          upper: options.upper,
          digits: options.digits,
          symbols: options.symbols,
          excludeAmbiguous: options.excludeAmbiguous,
          requireEach: options.requireEach,
        }),
      );
    }

    const bits = entropyBits(poolSize, length);

    return {
      output: passwords.join('\n'),
      filename: 'passwords.txt',
      stats: [
        { label: 'Entropy', value: `${bits} bits`, hint: bits >= 80 ? 'strong' : bits >= 60 ? 'adequate' : 'weak', primary: true },
        { label: 'Alphabet size', value: poolSize, hint: 'characters to choose from', primary: true },
        { label: 'Length', value: length, primary: true },
        { label: 'Offline crack time', value: crackTimeLabel(bits), hint: 'at 10¹² guesses/sec', primary: true },
      ],
      notes: [
        'Generated in this browser tab. Nothing was transmitted, and nothing is stored once you close the page.',
        bits < 60
          ? 'This is below 60 bits. Increase the length before using it for anything that matters.'
          : 'Store this in a password manager rather than trying to remember it.',
      ],
    };
  },
});
