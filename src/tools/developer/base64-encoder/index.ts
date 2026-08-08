import { defineTool, ToolError } from '@core/tool';
import { decodeBase64, encodeBase64, isProbablyBase64 } from '@engines/crypto';
import { formatBytes } from '@engines/format';

interface Options {
  direction: 'auto' | 'encode' | 'decode';
  urlSafe: boolean;
}

export default defineTool<string, Options>({
  slug: 'base64-encoder',
  category: 'developer',
  cluster: 'encoding',

  name: 'Base64 Encode / Decode',
  tagline: 'Encode and decode Base64 with full Unicode support and URL-safe output.',
  description:
    'Convert text to Base64 and back. Handles emoji, Bangla, Arabic and CJK correctly, supports URL-safe Base64, and tolerates missing padding on decode.',
  keywords: ['base64 encode', 'base64 decode', 'base64 converter', 'base64 to text', 'url safe base64'],

  runtime: 'client',
  status: 'live',
  premium: false,
  apiEnabled: true,

  score: { demand: 9, evergreen: 10, serp: 5, money: 4, ease: 10 },

  input: {
    type: 'text',
    label: 'Text or Base64',
    placeholder: 'Type text to encode, or paste Base64 to decode…',
    rows: 8,
    sample: 'AdeptBay — সব টুল এক জায়গায় 🌊',
  },

  options: [
    {
      key: 'direction',
      type: 'enum',
      label: 'Direction',
      default: 'auto',
      values: [
        { value: 'auto', label: 'Detect automatically' },
        { value: 'encode', label: 'Encode to Base64' },
        { value: 'decode', label: 'Decode from Base64' },
      ],
      help: 'Automatic detection checks whether the input is valid Base64 that decodes to readable text.',
    },
    {
      key: 'urlSafe',
      type: 'bool',
      label: 'URL-safe output',
      default: false,
      showIf: { key: 'direction', equals: 'encode' },
      help: 'Uses - and _ instead of + and /, and drops the = padding. Required inside a URL or a JWT.',
    },
  ],

  output: { type: 'text', label: 'Result' },

  howTo: [
    { title: 'Paste your text or Base64', detail: 'The tool detects which direction you want by default.' },
    { title: 'Switch to URL-safe if the result goes in a URL', detail: 'Standard Base64 contains + and /, which have to be escaped in a query string.' },
    { title: 'Copy the result', detail: 'Everything runs in your browser — safe for tokens and credentials.' },
  ],

  faq: [
    {
      q: 'Why does Base64 break on emoji and non-English text?',
      a: 'Because the browser\'s built-in btoa() only accepts characters below U+0100 and throws on anything else. This tool encodes the text to UTF-8 bytes first, then Base64-encodes those bytes, which is the correct sequence and round-trips every script.',
    },
    {
      q: 'What is URL-safe Base64?',
      a: 'A variant defined in RFC 4648 §5 that replaces + with - and / with _, and usually omits the = padding. Standard Base64 breaks inside URLs because + means a space in a query string and / is a path separator. JWTs use the URL-safe variant.',
    },
    {
      q: 'Is Base64 encryption?',
      a: 'No, and this matters. Base64 is an encoding, not a cipher — anyone can reverse it in one step with no key. It exists to move binary data safely through text-only channels. Never use it to hide anything.',
    },
    {
      q: 'Why does my Base64 fail to decode?',
      a: 'Usually one of three things: a character outside the Base64 alphabet somewhere in the string, a length that is impossible for valid Base64, or the string was truncated in transit. This tool restores missing padding automatically, so that particular cause is already handled.',
    },
    {
      q: 'Is my data uploaded?',
      a: 'No. Encoding and decoding both run in this browser tab. People decode JWTs and API keys with these tools constantly, so a Base64 tool that uploaded its input would be an unusually bad idea.',
    },
  ],

  infoGain: {
    summary:
      'The browser\'s btoa() throws a DOMException on any character above U+00FF, which means most Base64 tools built on it fail on emoji, Bangla, Arabic and CJK. This one encodes to UTF-8 bytes before encoding, and decodes bytes back through TextDecoder, so every script round-trips exactly.',
    table: {
      caption: 'Round-trip behaviour by input type',
      head: ['Input', 'Naive btoa()', 'This tool'],
      rows: [
        ['hello', 'aGVsbG8=', 'aGVsbG8='],
        ['café', 'throws', 'Y2Fmw6k='],
        ['আমি', 'throws', '4KaG4Kau4Ka/'],
        ['🌊', 'throws', '8J+Vig=='],
      ],
    },
    supports: [
      'Full Unicode via UTF-8, including emoji and combining marks',
      'Standard and URL-safe (RFC 4648 §5) alphabets',
      'Automatic padding repair on decode',
      'Whitespace and line breaks tolerated inside pasted Base64',
      'Direction auto-detection',
    ],
    limits: [
      'Text only. Encoding a file to a data URI is a separate tool.',
      'Base64 output is about 33% larger than the input — that is inherent to the format, not a limitation here.',
      'Auto-detection can guess wrong on short strings that are valid both ways. Set the direction explicitly if so.',
    ],
    verified: '2026-08',
  },

  related: ['url-encoder', 'json-formatter', 'hash-generator', 'uuid-generator', 'password-generator', 'text-diff'],
  nextSteps: ['url-encoder', 'hash-generator', 'json-formatter'],

  added: '2026-08-08',
  updated: '2026-08-08',

  run: (input, options) => {
    const trimmed = input.trim();
    if (trimmed === '') return { output: '' };

    let decode: boolean;
    if (options.direction === 'encode') decode = false;
    else if (options.direction === 'decode') decode = true;
    else {
      // Auto: only treat it as Base64 if it is well-formed AND decodes to
      // text without replacement characters. Otherwise assume encode.
      decode = false;
      if (isProbablyBase64(trimmed) && trimmed.length % 4 === 0) {
        try {
          const candidate = decodeBase64(trimmed);
          decode = !candidate.includes('�');
        } catch {
          decode = false;
        }
      }
    }

    if (decode) {
      let output: string;
      try {
        output = decodeBase64(trimmed);
      } catch (err) {
        throw new ToolError(
          err instanceof Error ? err.message : 'Could not decode this as Base64.',
          'Check for characters outside A–Z, a–z, 0–9, +, / and =. If the string came from a URL, switch the direction to Decode and try again.',
        );
      }

      return {
        output,
        filename: 'decoded.txt',
        stats: [
          { label: 'Direction', value: 'Decoded', primary: true },
          { label: 'Output size', value: formatBytes(new TextEncoder().encode(output).length), primary: true },
          { label: 'Input characters', value: trimmed.length },
        ],
      };
    }

    const output = encodeBase64(input, options.urlSafe);
    const inputBytes = new TextEncoder().encode(input).length;

    return {
      output,
      filename: 'encoded.txt',
      stats: [
        { label: 'Direction', value: options.urlSafe ? 'Encoded (URL-safe)' : 'Encoded', primary: true },
        { label: 'Output size', value: formatBytes(output.length), primary: true },
        { label: 'Input size', value: formatBytes(inputBytes) },
        {
          label: 'Size increase',
          value: inputBytes > 0 ? `${Math.round((output.length / inputBytes - 1) * 100)}%` : '—',
          hint: 'Base64 always grows by about a third',
        },
      ],
    };
  },
});
