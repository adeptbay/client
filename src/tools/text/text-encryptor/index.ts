import { defineTool, ToolError } from '@core/tool';
import { CIPHER_SPEC, CryptoError, decryptText, encryptText } from '@engines/aes';
import { entropyBits } from '@engines/random';

interface Options {
  mode: 'encrypt' | 'decrypt';
  passphrase: string;
}

export default defineTool<string, Options>({
  slug: 'text-encryptor',
  category: 'text',
  cluster: 'text-security',

  name: 'Text Encryptor',
  tagline: 'AES-256-GCM with a properly derived key — encrypted in your browser, never transmitted.',
  description:
    'Encrypt and decrypt text with AES-256-GCM and PBKDF2 key derivation at 600,000 iterations. Authenticated, so tampering is detected, and it runs entirely on your device.',
  keywords: [
    'encrypt text online',
    'aes encryption online',
    'text encryption tool',
    'decrypt text online',
  ],

  runtime: 'client',
  status: 'live',
  premium: false,
  // Never expose this over HTTP. A passphrase that reaches a server is
  // not a passphrase, and the whole value of the tool is that it cannot.
  apiEnabled: false,

  score: { demand: 6, evergreen: 10, serp: 7, money: 4, ease: 6 },

  // Key derivation is deliberately expensive — about 400 ms. Running it
  // on every keystroke would peg a core and wreck INP.
  manualRun: true,
  runLabel: 'Encrypt / Decrypt',

  input: {
    type: 'text',
    label: 'Text',
    placeholder: 'Type the message to encrypt, or paste an encrypted block to decrypt…',
    rows: 8,
    sample: 'Meet me at the old bookshop on Thursday. Bring the blue folder.',
  },

  options: [
    {
      key: 'mode',
      type: 'enum',
      label: 'Mode',
      default: 'encrypt',
      values: [
        { value: 'encrypt', label: 'Encrypt' },
        { value: 'decrypt', label: 'Decrypt' },
      ],
    },
    {
      key: 'passphrase',
      type: 'text',
      label: 'Passphrase',
      default: '',
      placeholder: 'at least 8 characters — longer is better',
      help: 'Everything depends on this. There is no recovery: lose it and the text is gone.',
    },
  ],

  output: { type: 'text', label: 'Result' },

  howTo: [
    {
      title: 'Enter your text and a passphrase',
      detail: 'Use a long, random passphrase — the algorithm is strong, but it can only ever be as strong as what you type here.',
    },
    {
      title: 'Press Encrypt',
      detail: 'Key derivation runs 600,000 rounds and takes a moment. That delay is the point: it is what makes guessing the passphrase slow for an attacker too.',
    },
    {
      title: 'Send the whole block',
      detail: 'The output contains the salt and nonce it needs to decrypt. Copy all of it — a truncated block cannot be recovered.',
    },
  ],

  faq: [
    {
      q: 'Is my text sent to a server?',
      a: 'No. Encryption and decryption both run in this browser tab through the Web Crypto API. You can load the page, disconnect from the internet, and it still works. For this tool in particular that is not a convenience — a text encryptor that uploads your plaintext is worse than useless.',
    },
    {
      q: 'What encryption does this use?',
      a: 'AES-256 in GCM mode. The key is derived from your passphrase with PBKDF2-HMAC-SHA256 at 600,000 iterations and a fresh 16-byte random salt, which is the current OWASP recommendation. Each message gets a new 12-byte random nonce.',
    },
    {
      q: 'Why does encrypting take a second?',
      a: 'Because of the 600,000 key-derivation rounds. That is deliberate. A fast key derivation is a fast dictionary attack — the delay you experience once is a delay an attacker experiences on every single guess.',
    },
    {
      q: 'What happens if I lose the passphrase?',
      a: 'The text is unrecoverable. There is no reset, no backup and no recovery key, because there is no account and no server. That is a consequence of the design, not an oversight.',
    },
    {
      q: 'Can someone modify the encrypted text without me knowing?',
      a: 'No. GCM is an authenticated mode: it produces a 128-bit tag over the ciphertext, and decryption fails outright if a single bit has changed. Unauthenticated modes like CBC would return plausible-looking garbage instead.',
    },
    {
      q: 'Should I use this to store passwords or important documents?',
      a: 'No. Use a password manager for credentials and a file-level tool like age or GnuPG for documents. This is for sending a short message over a channel you do not trust, where both sides already share a passphrase.',
    },
    {
      q: 'Why is there no API for this tool?',
      a: 'Because an API means sending the passphrase and the plaintext to a server, which removes the only property that makes the tool worth using. It is the one tool on this site deliberately excluded from the API.',
    },
  ],

  infoGain: {
    summary:
      'Competitor research on this keyword found the same three mistakes repeatedly, each fatal: the passphrase used directly as the key, unauthenticated CBC or ECB mode, and a fixed or missing IV. This implementation derives the key with PBKDF2 at the OWASP-recommended work factor, uses authenticated AES-GCM, and generates a fresh random nonce for every message.',
    table: {
      caption: 'Parameters, and why each one is set that way',
      head: ['Parameter', 'Value', 'Why'],
      rows: [
        ['Key derivation', CIPHER_SPEC.kdf, 'A passphrase is not a key. Deriving one slowly is what stops dictionary attacks.'],
        ['Iterations', CIPHER_SPEC.iterations.toLocaleString(), 'OWASP Password Storage Cheat Sheet, current recommendation for SHA-256.'],
        ['Salt', `${CIPHER_SPEC.saltBits}-bit, random per message`, 'Stops one precomputed table attacking every message at once.'],
        ['Cipher', CIPHER_SPEC.cipher, 'Authenticated. Tampering is detected instead of decrypting to garbage.'],
        ['Nonce', `${CIPHER_SPEC.ivBits}-bit, random per message`, 'Reusing a nonce with the same key breaks GCM completely.'],
        ['Auth tag', `${CIPHER_SPEC.tagBits}-bit`, 'Full-length tag; truncation weakens forgery resistance.'],
      ],
    },
    benchmarks: [
      {
        label: 'Key derivation',
        value: '430 ms',
        note: '600,000 rounds — i5-6300U, Chrome 151, median of 8. The first run of a session is slower, around 1.1 s.',
      },
      {
        label: 'Encryption of 10 KB',
        value: '0.1 ms',
        note: 'AES-GCM is hardware-accelerated; the key derivation is essentially the entire cost',
      },
    ],
    supports: [
      'AES-256-GCM through the native Web Crypto API',
      'PBKDF2-HMAC-SHA256 at 600,000 iterations',
      'Random salt and nonce per message, packed into the output',
      'A version byte, so the format can change without silent mis-decryption',
      'Full Unicode plaintext',
    ],
    limits: [
      'The passphrase is the whole security boundary. A weak one defeats every parameter in the table above.',
      'There is no key recovery. Lose the passphrase and the text is gone permanently.',
      'This is not a password manager and not a file encryptor. Use a password manager for credentials, and age or GnuPG for files.',
      'It protects the message in transit or at rest. It does nothing about a compromised device.',
    ],
    errors: [
      {
        cause: 'Decryption failed: wrong passphrase, or the encrypted text was altered',
        fix: 'GCM cannot tell those two apart — both fail authentication identically. Check the passphrase first, then check the whole Base64 block was copied, including the last line.',
      },
      {
        cause: 'That encrypted block is too short to be valid',
        fix: 'Part of it was lost in copying. The block contains a version byte, a 16-byte salt, a 12-byte nonce and a 16-byte tag before any message content.',
      },
    ],
    verified: '2026-08',
  },

  related: [
    'password-generator',
    'hash-generator',
    'base64-encoder',
    'character-frequency-counter',
    'uuid-generator',
    'url-encoder',
    'word-counter',
  ],
  nextSteps: ['password-generator', 'hash-generator', 'base64-encoder'],

  added: '2026-08-09',
  updated: '2026-08-09',

  run: async (input, options) => {
    if (input.trim() === '') return { output: '' };

    if (options.passphrase === '') {
      throw new ToolError(
        'Enter a passphrase.',
        'Both sides need the same passphrase. Generate a strong one with the Password Generator and share it through a different channel from the message itself.',
      );
    }

    try {
      if (options.mode === 'decrypt') {
        const plaintext = await decryptText(input, options.passphrase);
        return {
          output: plaintext,
          filename: 'decrypted.txt',
          stats: [
            { label: 'Status', value: 'Verified', hint: 'authentication tag checked', primary: true },
            { label: 'Cipher', value: CIPHER_SPEC.cipher, primary: true },
            { label: 'Characters recovered', value: [...plaintext].length, primary: true },
          ],
          notes: [
            'The authentication tag verified, so this text is exactly what was encrypted — it has not been altered.',
          ],
        };
      }

      const result = await encryptText(input, options.passphrase);

      // Entropy of the passphrase, estimated from the character classes
      // actually used. Honest framing: it describes the passphrase, and
      // says nothing about a human-chosen one being unpredictable.
      let pool = 0;
      if (/[a-z]/.test(options.passphrase)) pool += 26;
      if (/[A-Z]/.test(options.passphrase)) pool += 26;
      if (/\d/.test(options.passphrase)) pool += 10;
      if (/[^a-zA-Z0-9]/.test(options.passphrase)) pool += 25;
      const bits = entropyBits(pool, options.passphrase.length);

      return {
        output: result.ciphertext,
        filename: 'encrypted.txt',
        stats: [
          { label: 'Cipher', value: CIPHER_SPEC.cipher, primary: true },
          { label: 'Key derivation', value: `${CIPHER_SPEC.iterations.toLocaleString()} rounds`, primary: true },
          { label: 'Encrypted size', value: `${result.bytes} bytes`, primary: true },
          {
            label: 'Passphrase strength',
            value: `${bits} bits`,
            hint: bits >= 80 ? 'strong' : bits >= 60 ? 'adequate' : 'weak',
            primary: true,
          },
          { label: 'Salt', value: result.saltHex, hint: 'random, packed into the output' },
          { label: 'Nonce', value: result.ivHex, hint: 'random, never reused' },
        ],
        notes: [
          'Copy the whole block. It contains the salt and nonce needed to decrypt, and a truncated block cannot be recovered.',
          bits < 60
            ? 'That passphrase is weak. Every parameter above is defeated by a passphrase someone can guess — use the Password Generator.'
            : 'Share the passphrase through a different channel from the message. Sending both together defeats the point.',
        ],
      };
    } catch (err) {
      if (err instanceof CryptoError) throw new ToolError(err.message, err.hint);
      throw err;
    }
  },
});
