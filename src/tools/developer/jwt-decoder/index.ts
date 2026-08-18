import { defineTool, ToolError } from '@core/tool';
import { decodeJwt, JwtError, relativeTime, verifyJwt, type SecretEncoding } from '@engines/jwt';

interface Options {
  secret: string;
  secretEncoding: SecretEncoding;
  localTime: boolean;
  leeway: number;
  indent: '2' | '4';
}

export default defineTool<string, Options>({
  slug: 'jwt-decoder',
  category: 'developer',
  cluster: 'tokens',

  name: 'JWT Decoder',
  tagline: 'Decode a JSON Web Token, check its expiry, and verify the HMAC signature.',
  titleBenefit: 'Decode, Check Expiry, Verify',
  description:
    'Decode a JWT header and payload, see every registered claim evaluated against the clock, and verify an HS256, HS384 or HS512 signature — all in your browser.',
  keywords: ['jwt decoder', 'decode jwt', 'jwt debugger', 'json web token decoder', 'verify jwt signature'],

  runtime: 'client',
  status: 'live',
  premium: false,
  apiEnabled: true,

  score: { demand: 8, evergreen: 9, serp: 6, money: 4, ease: 8 },

  input: {
    type: 'text',
    label: 'JSON Web Token',
    placeholder: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.…',
    rows: 6,
    sample:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjIwMjYtMDgta2V5LTEifQ' +
      '.eyJpc3MiOiJodHRwczovL2F1dGguYWRlcHRiYXkuY29tIiwic3ViIjoidXNyXzhmMmM0MSIsImF1ZCI6ImFkZXB0YmF5LWFwaSIsIm5hbWUiOiJBZGEgTG92ZWxhY2UiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3ODY4NzA4MDAsImV4cCI6MTc4Njg3NDQwMH0' +
      '.E9zlID8DmRqJ-t2bC74iYfsDfCUf8NWut1ODQBjX4b0',
  },

  options: [
    {
      key: 'secret',
      type: 'text',
      label: 'HMAC secret — optional',
      default: '',
      secret: true,
      placeholder: 'Leave empty to decode without verifying',
      help: 'Only used for HS256/384/512. It is masked, never written to the address bar, and never sent anywhere. The sample token above verifies against a-string-secret-at-least-256-bits-long.',
    },
    {
      key: 'secretEncoding',
      type: 'enum',
      label: 'Secret is',
      default: 'utf8',
      values: [
        { value: 'utf8', label: 'Plain text' },
        { value: 'base64url', label: 'Base64 / base64url' },
        { value: 'hex', label: 'Hex' },
      ],
      help: 'Auth0 and Keycloak store the signing key Base64-encoded. Verifying it as plain text fails on a correct token.',
    },
    {
      key: 'localTime',
      type: 'bool',
      label: 'Show times in my timezone',
      default: false,
      help: 'Off, times are shown in UTC — which is what the server logs you are comparing against will be using.',
    },
    {
      key: 'leeway',
      type: 'number',
      label: 'Clock skew allowance (seconds)',
      default: 0,
      min: 0,
      max: 600,
      step: 30,
      help: 'What a real verifier tolerates between its clock and the issuer’s. Set it to the value your library uses.',
    },
    {
      key: 'indent',
      type: 'enum',
      label: 'Indentation',
      default: '2',
      values: [
        { value: '2', label: '2 spaces' },
        { value: '4', label: '4 spaces' },
      ],
    },
  ],

  output: { type: 'text', mono: true, language: 'json', label: 'Header and payload' },

  howTo: [
    {
      title: 'Paste the token',
      detail: 'An "Authorization: Bearer " prefix and any line breaks are stripped for you, so you can paste straight from a header or a log line.',
    },
    {
      title: 'Read the status strip first',
      detail: 'Algorithm, signature, expiry. Those three answer almost every "why is this request 401" question before you read a single claim.',
    },
    {
      title: 'Add the secret to verify the signature',
      detail: 'For an HS-family token, pasting the signing key turns "decoded" into "verified". Without it the tool says "not verified" rather than pretending.',
    },
    {
      title: 'Check the warnings',
      detail: 'A missing exp, a millisecond timestamp where seconds belong, alg set to none, or a password sitting in the payload are all called out by name.',
    },
  ],

  faq: [
    {
      q: 'Is a JWT encrypted?',
      a: 'No. The header and payload are Base64url — encoding, not encryption. Anyone holding the token can read every claim in it without any key, which is why a password, an API key or a card number must never be put in a payload. The signature protects it from being changed, not from being read.',
    },
    {
      q: 'Is it safe to paste a real token into this page?',
      a: 'It is safe here because nothing leaves your browser — there is no server to receive it. Treat that as the exception. A JWT is a bearer credential: whoever holds it is you until it expires, so pasting one into a tool that uploads is handing over the session.',
    },
    {
      q: 'Why does my token decode but not verify?',
      a: 'Three usual causes. The secret is stored Base64-encoded and is being verified as plain text — switch the encoding above. The token was signed with RS256, which needs a public key rather than a secret. Or a whitespace character was copied along with the key.',
    },
    {
      q: 'Can it verify RS256 or ES256 tokens?',
      a: 'No. Those are asymmetric: checking one requires the issuer\'s public key from a JWKS endpoint, which is a different input and a different tool. The algorithm is reported as unsupported rather than as invalid, because reporting "invalid" would send you hunting a signing bug that does not exist.',
    },
    {
      q: 'What does "alg": "none" mean?',
      a: 'That the token is unsigned. It exists in the specification for tokens whose integrity is guaranteed some other way, and it is the oldest JWT vulnerability there is: a library that honours the header will accept a payload anyone edited. A verifier must pin the expected algorithm rather than read it from the token.',
    },
    {
      q: 'My token is expired but the API still accepts it. Why?',
      a: 'Verifiers usually allow a small clock skew, commonly 30 to 60 seconds, and some gateways cache a validation result. Set the skew allowance above to the value your library uses and the verdict here will match what your server decides.',
    },
  ],

  infoGain: {
    summary:
      'Most online JWT tools split the token at the dots and Base64-decode two thirds of it. That answers the wrong question: nobody pastes a token to see what is inside, they paste it because a request came back 401. So this evaluates exp, nbf and iat against the clock with a configurable skew, and verifies HS-family signatures with Web Crypto.',
    table: {
      caption: 'What each signature verdict means',
      head: ['Verdict', 'When', 'What to do'],
      rows: [
        ['Verified', 'HS256/384/512 and the secret matches', 'The payload has not been altered since it was signed'],
        ['Does not match', 'The secret is wrong, or the token was tampered with', 'Check the secret encoding first — Base64 keys are the usual cause'],
        ['Not verified', 'HS algorithm, no secret supplied', 'Decoding is complete; only the signature is unchecked'],
        ['Unsupported', 'RS, ES or PS — asymmetric', 'Verification needs the issuer’s public key, not a secret'],
        ['Unsigned', 'alg is none', 'Reject the token; a verifier must pin the algorithm it expects'],
      ],
    },
    supports: [
      'HS256, HS384 and HS512 verification through Web Crypto',
      'Secrets in plain text, Base64/base64url or hex',
      'All seven RFC 7519 registered claims, explained and evaluated',
      'Configurable clock skew, matching what a real verifier allows',
      'Non-ASCII payloads decoded correctly, not through latin1',
    ],
    limits: [
      'RS, ES and PS signatures are reported as unsupported. Verifying one needs the issuer’s public key, which this tool does not fetch.',
      'A five-part token is a JWE — encrypted — and cannot be read without the decryption key, here or anywhere else.',
      'Expiry is judged against your device’s clock. If that is wrong, so is the verdict.',
      'The token is not checked against an issuer, audience or revocation list. Those are policy decisions your server makes.',
    ],
    errors: [
      {
        cause: '"A JWT has three dot-separated parts"',
        fix: 'The token was truncated, usually at a line break in a log file. Copy the whole value; a Bearer prefix is handled for you.',
      },
      {
        cause: 'The signature verifies in one library and not another',
        fix: 'Check how the secret is stored. A key held as Base64 must be decoded to bytes before signing, and libraries disagree about doing that for you.',
      },
      {
        cause: 'exp is decades in the future',
        fix: 'The claim holds milliseconds. RFC 7519 defines it in seconds — divide by 1000 at the issuer.',
      },
    ],
    verified: '2026-08',
  },

  related: [
    'base64-encoder',
    'hash-generator',
    'json-formatter',
    'url-encoder',
    'uuid-generator',
    'text-encryptor',
    'password-generator',
    'json-to-yaml',
  ],
  nextSteps: ['base64-encoder', 'hash-generator', 'json-formatter'],

  added: '2026-08-17',
  updated: '2026-08-17',

  run: async (input, options) => {
    if (input.trim() === '') return { output: '' };

    const indent = options.indent === '4' ? 4 : 2;

    let decoded;
    try {
      decoded = decodeJwt(input, {
        indent,
        localTime: options.localTime,
        leeway: Math.max(0, Math.round(options.leeway)),
      });
    } catch (err) {
      if (err instanceof JwtError) throw new ToolError(err.message, err.hint);
      throw err;
    }

    const verdict = await verifyJwt(input, decoded.algorithm, options.secret, options.secretEncoding);

    const signatureLabel =
      verdict.status === 'valid'
        ? 'Verified'
        : verdict.status === 'invalid'
          ? 'Does not match'
          : verdict.status === 'no-secret'
            ? 'Not verified'
            : verdict.status === 'unsigned'
              ? 'Unsigned'
              : verdict.status === 'bad-secret'
                ? 'Secret unreadable'
                : 'Unsupported';

    const notes: string[] = [...decoded.warnings];

    if (verdict.status === 'invalid') {
      notes.push(
        'The signature does not match this secret. If the key is stored Base64-encoded — Auth0 and Keycloak do this — switch "Secret is" above before concluding the token is forged.',
      );
    }
    if (verdict.status === 'unsupported') {
      notes.push(
        `${verdict.algorithm} is asymmetric, so verification needs the issuer’s public key rather than a shared secret. The decode above is complete and correct; only the signature is unchecked.`,
      );
    }
    if (verdict.status === 'bad-secret') notes.push(verdict.message);
    if (decoded.privateClaims.length > 0) {
      notes.push(
        `Claims outside the registered set: ${decoded.privateClaims.slice(0, 12).join(', ')}${
          decoded.privateClaims.length > 12 ? ', …' : ''
        }. Their meaning is defined by whoever issued the token.`,
      );
    }

    return {
      output: JSON.stringify({ header: decoded.header, payload: decoded.payload }, null, indent),
      filename: 'jwt.json',
      stats: [
        { label: 'Algorithm', value: decoded.algorithm, primary: true },
        { label: 'Signature', value: signatureLabel, primary: true },
        {
          label: 'Status',
          value: decoded.expiresAt ? (decoded.expired ? 'Expired' : 'Active') : 'No expiry',
          primary: true,
        },
        {
          label: decoded.expired ? 'Expired' : 'Expires',
          value: decoded.secondsLeft === undefined ? 'never' : relativeTime(decoded.secondsLeft),
          primary: true,
        },

        { label: 'Type', value: decoded.type ?? 'not set' },
        { label: 'Key id (kid)', value: decoded.keyId ?? 'not set' },
        {
          label: 'Lifetime',
          value: decoded.lifetime === undefined ? '—' : relativeTime(decoded.lifetime).replace('in ', ''),
        },
        { label: 'Claims', value: Object.keys(decoded.payload).length },
        { label: 'Signature size', value: `${decoded.signatureBytes} bytes` },
        { label: 'Token length', value: `${input.trim().length} chars` },
      ],
      table:
        decoded.claims.length > 0
          ? {
              caption: 'Registered claims, evaluated against your clock',
              head: ['Claim', 'Value', 'What it means'],
              rows: decoded.claims.map((c) => [c.claim, c.value, c.meaning]),
            }
          : undefined,
      notes: notes.length > 0 ? notes : undefined,
    };
  },
});
