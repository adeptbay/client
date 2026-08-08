import { defineTool } from '@core/tool';
import { nanoId, ulid, uuidV4, uuidV7 } from '@engines/random';

interface Options {
  version: 'v4' | 'v7' | 'ulid' | 'nanoid';
  count: number;
  uppercase: boolean;
  hyphens: boolean;
}

export default defineTool<string, Options>({
  slug: 'uuid-generator',
  category: 'developer',
  cluster: 'identifiers',

  name: 'UUID Generator',
  tagline: 'UUID v4, UUID v7, ULID and NanoID — generated in your browser.',
  description:
    'Generate UUID v4, time-sortable UUID v7, ULID or NanoID in bulk. All values come from the Web Crypto random source, never from Math.random.',
  keywords: ['uuid generator', 'guid generator', 'uuid v4', 'uuid v7 generator', 'ulid generator'],

  runtime: 'client',
  status: 'live',
  premium: false,
  apiEnabled: true,

  score: { demand: 7, evergreen: 10, serp: 7, money: 4, ease: 10 },

  input: { type: 'form' },

  options: [
    {
      key: 'version',
      type: 'enum',
      label: 'Format',
      default: 'v4',
      values: [
        { value: 'v4', label: 'UUID v4 — random' },
        { value: 'v7', label: 'UUID v7 — time-sortable' },
        { value: 'ulid', label: 'ULID — sortable, 26 chars' },
        { value: 'nanoid', label: 'NanoID — 21 chars, URL-safe' },
      ],
    },
    {
      key: 'count',
      type: 'range',
      label: 'How many',
      default: 5,
      min: 1,
      max: 500,
      step: 1,
    },
    {
      key: 'uppercase',
      type: 'bool',
      label: 'Uppercase',
      default: false,
      showIf: { key: 'version', equals: 'v4' },
    },
    {
      key: 'hyphens',
      type: 'bool',
      label: 'Include hyphens',
      default: true,
      showIf: { key: 'version', equals: 'v4' },
    },
  ],

  output: { type: 'text', label: 'Identifiers' },

  howTo: [
    { title: 'Pick a format', detail: 'v4 for general use. v7 or ULID if these will be database primary keys.' },
    { title: 'Choose how many', detail: 'Up to 500 at a time. Each one is generated independently.' },
    { title: 'Copy or download', detail: 'One per line, ready to paste into a seed file or a spreadsheet.' },
  ],

  faq: [
    {
      q: 'What is the difference between UUID v4 and UUID v7?',
      a: 'v4 is 122 random bits. v7 puts a 48-bit millisecond timestamp at the front and fills the rest with randomness, so v7 values sort by creation time. Both are standardised in RFC 9562 and both are unique in practice.',
    },
    {
      q: 'Which one should I use for a database primary key?',
      a: 'v7 or ULID. Random v4 values scatter inserts across a B-tree index, causing page splits and index fragmentation that measurably slows write-heavy tables. Time-ordered identifiers append at the end of the index instead.',
    },
    {
      q: 'What is a ULID and how is it different from UUID v7?',
      a: 'Both encode a timestamp then randomness. ULID uses Crockford base32, so it is 26 characters instead of 36, case-insensitive, and excludes I, L, O and U to avoid transcription errors. UUID v7 has the advantage of being a real UUID that a database UUID column accepts directly.',
    },
    {
      q: 'Are these actually random?',
      a: 'They come from crypto.getRandomValues, the browser\'s cryptographically secure random source. Math.random is never used, because its output is predictable from a handful of observed values — fine for shuffling a playlist, not for an identifier that might guard a resource.',
    },
    {
      q: 'What is the chance of a collision?',
      a: 'For UUID v4, you would need roughly 2.7 × 10^18 values before reaching a one-in-a-billion chance of a single collision. Generating a billion per second, that is about 85 years. Collision is not a practical concern.',
    },
    {
      q: 'Can a UUID be guessed?',
      a: 'A v4 from a secure random source, no. But a UUID is not an access control mechanism — anyone who learns the value has it forever, and they often end up in logs, referrer headers and browser history. Use one as an identifier, not as a secret.',
    },
  ],

  infoGain: {
    summary:
      'Four identifier formats, all drawn from crypto.getRandomValues. UUID v7 and ULID are included because the common advice to "just use a UUID" is wrong for a database primary key: random v4 values fragment a B-tree index, while time-ordered values append cleanly. The comparison below is the decision most people actually need to make.',
    table: {
      caption: 'Choosing a format',
      head: ['Format', 'Length', 'Sortable', 'Best for'],
      rows: [
        ['UUID v4', '36 chars', 'No', 'General purpose, external identifiers'],
        ['UUID v7', '36 chars', 'Yes', 'Database primary keys — RFC 9562'],
        ['ULID', '26 chars', 'Yes', 'Keys that also appear in URLs'],
        ['NanoID', '21 chars', 'No', 'Short public IDs, share links'],
      ],
    },
    supports: [
      'UUID v4 and v7 per RFC 9562, with correct version and variant bits',
      'ULID in Crockford base32, excluding I, L, O and U',
      'NanoID, 21 characters, URL-safe alphabet',
      'Bulk generation up to 500 at a time',
    ],
    limits: [
      'UUID v7 embeds a creation timestamp to the millisecond. Do not use it where that leaks something.',
      'Generation is per-call, so two values created in the same millisecond are ordered only by their random suffix.',
    ],
    verified: '2026-08',
  },

  related: ['password-generator', 'hash-generator', 'base64-encoder', 'json-formatter', 'url-encoder', 'slug-generator'],
  nextSteps: ['password-generator', 'hash-generator', 'json-formatter'],

  added: '2026-08-08',
  updated: '2026-08-08',

  run: (_input, options) => {
    const count = Math.min(500, Math.max(1, Math.round(options.count)));
    const values: string[] = [];

    for (let i = 0; i < count; i++) {
      switch (options.version) {
        case 'v4': {
          let value = uuidV4();
          if (!options.hyphens) value = value.replace(/-/g, '');
          if (options.uppercase) value = value.toUpperCase();
          values.push(value);
          break;
        }
        case 'v7':
          values.push(uuidV7());
          break;
        case 'ulid':
          values.push(ulid());
          break;
        case 'nanoid':
          values.push(nanoId());
          break;
      }
    }

    const labels: Record<Options['version'], string> = {
      v4: 'UUID v4',
      v7: 'UUID v7',
      ulid: 'ULID',
      nanoid: 'NanoID',
    };

    return {
      output: values.join('\n'),
      filename: `${options.version}-ids.txt`,
      stats: [
        { label: 'Generated', value: count, primary: true },
        { label: 'Format', value: labels[options.version], primary: true },
        { label: 'Length each', value: `${values[0]?.length ?? 0} chars`, primary: true },
      ],
      notes:
        options.version === 'v4'
          ? ['UUID v4 is random, so these will not sort by creation time. Use v7 or ULID for a database primary key.']
          : options.version === 'v7'
            ? ['These sort by creation time. Note that the first 48 bits encode the current timestamp to the millisecond.']
            : undefined,
    };
  },
});
