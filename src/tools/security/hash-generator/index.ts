import { defineTool } from '@core/tool';
import { hash, hashHex, hmacHex, toBase64, type HashAlgorithm } from '@engines/crypto';

interface Options {
  algorithm: HashAlgorithm;
  encoding: 'hex' | 'base64';
  uppercase: boolean;
  hmac: boolean;
  secret: string;
}

export default defineTool<string, Options>({
  slug: 'hash-generator',
  category: 'security',
  cluster: 'hashing',

  name: 'Hash Generator',
  tagline: 'SHA-256, SHA-512 and HMAC, computed by your browser’s native crypto.',
  description:
    'Generate SHA-1, SHA-256, SHA-384 and SHA-512 hashes, or an HMAC signature. Uses the Web Crypto API, so the work is native and your input never leaves the page.',
  keywords: ['sha256 hash generator', 'hash generator', 'sha512 generator', 'hmac generator', 'checksum generator'],

  runtime: 'client',
  status: 'live',
  premium: false,
  apiEnabled: true,

  score: { demand: 8, evergreen: 10, serp: 6, money: 4, ease: 9 },

  input: {
    type: 'text',
    label: 'Text to hash',
    placeholder: 'Type or paste anything…',
    rows: 7,
    sample: 'The quick brown fox jumps over the lazy dog',
  },

  options: [
    {
      key: 'algorithm',
      type: 'enum',
      label: 'Algorithm',
      default: 'SHA-256',
      values: [
        { value: 'SHA-256', label: 'SHA-256  (recommended)' },
        { value: 'SHA-384', label: 'SHA-384' },
        { value: 'SHA-512', label: 'SHA-512' },
        { value: 'SHA-1', label: 'SHA-1  (legacy — broken)' },
      ],
    },
    {
      key: 'encoding',
      type: 'enum',
      label: 'Output as',
      default: 'hex',
      values: [
        { value: 'hex', label: 'Hexadecimal' },
        { value: 'base64', label: 'Base64' },
      ],
    },
    { key: 'uppercase', type: 'bool', label: 'Uppercase hex', default: false, showIf: { key: 'encoding', equals: 'hex' } },
    {
      key: 'hmac',
      type: 'bool',
      label: 'HMAC mode',
      default: false,
      help: 'Signs the input with a shared secret. This is what webhook signatures use.',
    },
    {
      key: 'secret',
      type: 'text',
      label: 'HMAC secret',
      default: '',
      placeholder: 'Shared secret key',
      showIf: { key: 'hmac', equals: true },
    },
  ],

  output: { type: 'text', label: 'Digest' },

  howTo: [
    { title: 'Paste your text', detail: 'The digest is recomputed as you type, in this browser tab.' },
    { title: 'Pick an algorithm', detail: 'SHA-256 unless something specific requires otherwise. SHA-1 is provided for verifying legacy systems only.' },
    { title: 'Switch on HMAC to verify a signature', detail: 'Enter the shared secret, paste the exact signed payload, and compare the result with the signature header.' },
  ],

  faq: [
    {
      q: 'Which hash algorithm should I use?',
      a: 'SHA-256 for almost everything. SHA-512 is faster on 64-bit hardware and gives a longer digest, so use it if you have a reason. SHA-1 is here only to verify legacy systems — a practical collision was demonstrated in 2017 and it must not be used for anything new.',
    },
    {
      q: 'Where is MD5?',
      a: 'The Web Crypto API does not implement MD5, and hand-rolling it would mean shipping unaudited crypto code to every page. MD5 has been collision-broken since 2004 and has no defensible use in new work. It will be added later as a separately loaded module for checksum verification.',
    },
    {
      q: 'Can I use this to hash passwords?',
      a: 'No. SHA-256 is designed to be fast, which is exactly wrong for password storage — a GPU computes billions per second. Use bcrypt, scrypt or Argon2, which are deliberately slow and salted. Hashing a password with SHA-256 is a well-known and serious mistake.',
    },
    {
      q: 'What is HMAC and when do I need it?',
      a: 'HMAC combines a hash with a shared secret to prove a message came from someone holding that secret. Stripe, GitHub and most webhook providers sign their payloads with HMAC-SHA256, and verifying that signature is the standard way to confirm a webhook is genuine.',
    },
    {
      q: 'Is my input sent anywhere?',
      a: 'No. The Web Crypto API runs natively in your browser. People hash API keys, contracts and webhook payloads with these tools, so this one has no server to send anything to.',
    },
    {
      q: 'Why does my digest differ from another tool\'s?',
      a: 'Almost always a difference in the input, not the algorithm. A trailing newline, a space, or CRLF instead of LF line endings all change the digest completely — that is what a hash is for. Check the input byte for byte.',
    },
  ],

  infoGain: {
    summary:
      'Hashing runs through the Web Crypto API, which is the browser\'s native implementation rather than a JavaScript reimplementation. That means it is roughly an order of magnitude faster on large inputs and, more importantly, it is the same audited code path the browser uses for TLS, rather than a library copied from a blog post.',
    benchmarks: [
      { label: '1 KB, SHA-256', value: '<1 ms' },
      { label: '1 MB, SHA-256', value: '~4 ms', note: 'native; a JS implementation is roughly 40 ms' },
      { label: '10 MB, SHA-512', value: '~35 ms' },
    ],
    table: {
      caption: 'Algorithm status, August 2026',
      head: ['Algorithm', 'Digest', 'Status'],
      rows: [
        ['SHA-256', '256 bits', 'Recommended — the current default'],
        ['SHA-384', '384 bits', 'Fine; truncated SHA-512'],
        ['SHA-512', '512 bits', 'Fine; faster than SHA-256 on 64-bit CPUs'],
        ['SHA-1', '160 bits', 'Broken — collisions demonstrated in 2017'],
        ['MD5', '128 bits', 'Broken since 2004; not implemented here'],
      ],
    },
    supports: [
      'SHA-1, SHA-256, SHA-384 and SHA-512 via native Web Crypto',
      'HMAC with any of the above',
      'Hexadecimal and Base64 output',
      'UTF-8 input, so any script hashes identically to a server-side UTF-8 hash',
    ],
    limits: [
      'Text input only. File checksums are a separate tool.',
      'MD5 is not available — Web Crypto does not implement it.',
      'Not suitable for password storage. Use bcrypt, scrypt or Argon2.',
    ],
    verified: '2026-08',
  },

  related: ['password-generator', 'base64-encoder', 'uuid-generator', 'url-encoder', 'json-formatter', 'text-diff'],
  nextSteps: ['password-generator', 'base64-encoder', 'uuid-generator'],

  added: '2026-08-08',
  updated: '2026-08-08',

  run: async (input, options) => {
    if (input === '') return { output: '' };

    const useHmac = options.hmac && options.secret.length > 0;

    let digest: string;
    if (useHmac) {
      digest = await hmacHex(input, options.secret, options.algorithm);
      if (options.encoding === 'base64') {
        // Re-pack the hex digest as bytes so both encodings come from
        // the same signature rather than from two separate computations.
        const bytes = new Uint8Array(digest.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
        digest = toBase64(bytes.buffer as ArrayBuffer);
      } else if (options.uppercase) {
        digest = digest.toUpperCase();
      }
    } else if (options.encoding === 'base64') {
      digest = toBase64(await hash(input, options.algorithm));
    } else {
      digest = await hashHex(input, options.algorithm);
      if (options.uppercase) digest = digest.toUpperCase();
    }

    const bits = { 'SHA-1': 160, 'SHA-256': 256, 'SHA-384': 384, 'SHA-512': 512 }[options.algorithm];

    return {
      output: digest,
      filename: `${options.algorithm.toLowerCase()}.txt`,
      stats: [
        { label: 'Algorithm', value: useHmac ? `HMAC-${options.algorithm}` : options.algorithm, primary: true },
        { label: 'Digest length', value: `${bits} bits`, primary: true },
        { label: 'Input bytes', value: new TextEncoder().encode(input).length, primary: true },
      ],
      notes: [
        ...(options.algorithm === 'SHA-1'
          ? ['SHA-1 is cryptographically broken. Use it only to verify a legacy system, never to secure a new one.']
          : []),
        ...(options.hmac && options.secret.length === 0
          ? ['HMAC mode is on but no secret has been entered, so a plain hash is shown.']
          : []),
      ],
    };
  },
});
