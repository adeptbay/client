import { defineTool, ToolError } from '@core/tool';
import { decodeUrl, encodeUrl, type UrlEncodeMode } from '@engines/crypto';

interface Options {
  direction: 'encode' | 'decode';
  mode: UrlEncodeMode;
}

export default defineTool<string, Options>({
  slug: 'url-encoder',
  category: 'developer',
  cluster: 'encoding',

  name: 'URL Encode / Decode',
  tagline: 'Percent-encode URLs and query strings, with the right mode for each.',
  titleBenefit: 'Percent-Encode Instantly',
  description:
    'Encode and decode URLs, query parameters and form data. Three modes, because encoding a whole URL and encoding one parameter are not the same operation.',
  keywords: ['url encoder', 'url decoder', 'percent encoding', 'urlencode online', 'query string encoder'],

  runtime: 'client',
  status: 'live',
  premium: false,
  apiEnabled: true,

  score: { demand: 8, evergreen: 10, serp: 6, money: 4, ease: 10 },

  input: {
    type: 'text',
    label: 'URL or text',
    placeholder: 'https://example.com/search?q=hello world&lang=বাংলা',
    rows: 6,
    sample: 'https://example.com/search?q=coffee & tea&city=সিলেট',
  },

  options: [
    {
      key: 'direction',
      type: 'enum',
      label: 'Direction',
      default: 'encode',
      values: [
        { value: 'encode', label: 'Encode' },
        { value: 'decode', label: 'Decode' },
      ],
    },
    {
      key: 'mode',
      type: 'enum',
      label: 'Encoding scope',
      default: 'component',
      values: [
        { value: 'component', label: 'Component — one parameter value' },
        { value: 'full', label: 'Full URL — keep the structure' },
        { value: 'form', label: 'Form data — space becomes +' },
      ],
      help: 'Component is what you want in almost every case.',
    },
  ],

  output: { type: 'text', label: 'Result' },

  howTo: [
    { title: 'Choose the scope', detail: 'Component for a single value. Full URL only when you have an entire address that must stay navigable.' },
    { title: 'Paste your text', detail: 'The result updates as you type.' },
    { title: 'Check the round trip', detail: 'Switch the direction to decode and paste the result back. If you get your original text, the encoding is correct.' },
  ],

  faq: [
    {
      q: 'What is the difference between component and full URL encoding?',
      a: 'Component encoding escapes every reserved character including : / ? # & and =, which is right for a single parameter value. Full URL encoding leaves those alone so the address still works. Encoding a whole URL in component mode produces a string no browser can follow.',
    },
    {
      q: 'When should a space become + instead of %20?',
      a: 'Only in application/x-www-form-urlencoded bodies — that is, classic HTML form submissions. Everywhere else in a URL, a space is %20. The plus convention is a form-encoding rule that predates the URL specification and does not generalise.',
    },
    {
      q: 'Why does my decode fail with "URI malformed"?',
      a: 'A percent sign in the input is not followed by two valid hex digits. It usually means the text was already decoded once, or contains a literal % that was never escaped. Encode the literal % as %25 before decoding.',
    },
    {
      q: 'Does this handle non-English characters?',
      a: 'Yes. Non-ASCII characters are converted to UTF-8 bytes and each byte is percent-encoded, which is what RFC 3986 specifies. Bangla, Arabic, CJK and emoji all round-trip exactly.',
    },
    {
      q: 'Is it safe to paste a URL containing a token?',
      a: 'Yes. Everything runs in this browser tab and nothing is transmitted. That is deliberate — signed URLs and OAuth callbacks are among the most common things people need to decode.',
    },
  ],

  infoGain: {
    summary:
      'Three encoding modes, because the same input needs different treatment depending on where it lands. Component mode escapes reserved characters; full-URL mode preserves them so the address stays navigable; form mode encodes a space as a plus, which is only correct inside an application/x-www-form-urlencoded body. Most tools offer one mode and get the other two wrong.',
    table: {
      caption: 'Same input, three modes',
      head: ['Mode', 'Input', 'Output'],
      rows: [
        ['Component', 'https://a.com?q=x y', 'https%3A%2F%2Fa.com%3Fq%3Dx%20y'],
        ['Full URL', 'https://a.com?q=x y', 'https://a.com?q=x%20y'],
        ['Form data', 'x y & z', 'x+y+%26+z'],
      ],
    },
    supports: [
      'RFC 3986 percent-encoding over UTF-8',
      'Component, full-URL and form-data scopes',
      'Full Unicode, including emoji and combining marks',
      'Encoding of ! \' ( ) and * in form mode, which encodeURIComponent leaves alone',
    ],
    limits: [
      'Decoding requires well-formed input: a bare % that is not followed by two hex digits is an error, not a warning.',
      'Punycode for internationalised domain names is a separate conversion and is not applied here.',
    ],
    verified: '2026-08',
  },

  related: ['base64-encoder', 'json-formatter', 'slug-generator', 'hash-generator', 'uuid-generator', 'text-diff'],
  nextSteps: ['base64-encoder', 'slug-generator', 'json-formatter'],

  added: '2026-08-08',
  updated: '2026-08-08',

  run: (input, options) => {
    if (input.trim() === '') return { output: '' };

    try {
      const output =
        options.direction === 'encode' ? encodeUrl(input, options.mode) : decodeUrl(input, options.mode);

      return {
        output,
        filename: 'url.txt',
        stats: [
          { label: 'Direction', value: options.direction === 'encode' ? 'Encoded' : 'Decoded', primary: true },
          { label: 'Characters out', value: output.length, primary: true },
          { label: 'Characters in', value: input.length },
          {
            label: 'Escape sequences',
            value: (output.match(/%[0-9A-Fa-f]{2}/g) ?? []).length,
          },
        ],
      };
    } catch (err) {
      throw new ToolError(
        err instanceof Error ? err.message : 'Could not process this input.',
        'A "%" in the input is not followed by two hex digits. If your text contains a literal percent sign, encode it as %25 first.',
      );
    }
  },
});
