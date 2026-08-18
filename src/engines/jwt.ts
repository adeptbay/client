/**
 * JSON Web Token engine — RFC 7519, with RFC 7515 signature checking.
 *
 * Competitor research: online JWT tools split at the dots, Base64-decode
 * two thirds of the token and stop. That is a decoder, and it answers
 * the wrong question. Nobody pastes a token to find out what is in it;
 * they paste it because a request came back 401 and they need to know
 * *why*. The three real causes — the token expired, it is not valid
 * yet, the signature does not match the secret — are precisely the
 * three a decoder cannot see.
 *
 * So this engine evaluates the time claims against the clock and
 * verifies HMAC signatures with Web Crypto, in the browser. A token is
 * a bearer credential: anyone holding it is the user until it expires,
 * which is exactly why it must not be pasted into a page that uploads.
 */

import { toBase64 } from './crypto';

export type JwtAlgorithm =
  | 'HS256' | 'HS384' | 'HS512'
  | 'RS256' | 'RS384' | 'RS512'
  | 'ES256' | 'ES384' | 'ES512'
  | 'PS256' | 'PS384' | 'PS512'
  | 'none';

export type SecretEncoding = 'utf8' | 'base64url' | 'hex';

export class JwtError extends Error {
  readonly hint?: string;
  constructor(message: string, hint?: string) {
    super(message);
    this.name = 'JwtError';
    this.hint = hint;
  }
}

/* ── Base64url ──────────────────────────────────────────────────────
   JWT uses base64url with the padding stripped (RFC 7515 §2), which is
   not what atob() accepts. Decoding through bytes rather than through
   atob()'s latin1 output is what makes a token carrying a non-ASCII
   name — which is most names — come back as the name instead of as
   mojibake.                                                          */

function base64UrlToBytes(segment: string, label: string): Uint8Array {
  const normalised = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalised + '='.repeat((4 - (normalised.length % 4)) % 4);

  if (normalised.length % 4 === 1 || /[^A-Za-z0-9+/=]/.test(padded)) {
    throw new JwtError(
      `The ${label} is not valid base64url.`,
      'A JWT segment may contain only A–Z, a–z, 0–9, "-" and "_". A "+", "/" or "=" means the token was Base64-encoded a second time, or copied out of a JSON string with the escaping left in.',
    );
  }

  try {
    const binary = atob(padded);
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  } catch {
    throw new JwtError(`The ${label} could not be decoded.`);
  }
}

const decodeSegment = (segment: string, label: string): string =>
  new TextDecoder('utf-8', { fatal: false }).decode(base64UrlToBytes(segment, label));

const toBase64Url = (buffer: ArrayBuffer): string =>
  toBase64(buffer).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/* ── Decoding ───────────────────────────────────────────────────── */

export type ClaimStatus = 'ok' | 'warn' | 'fail' | 'info';

export interface ClaimRow {
  claim: string;
  value: string;
  meaning: string;
  status: ClaimStatus;
}

export interface DecodedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  headerJson: string;
  payloadJson: string;
  algorithm: string;
  /** `typ` from the header — should be "JWT", and often is not set at all. */
  type?: string;
  keyId?: string;
  signature: string;
  signatureBytes: number;
  /** Registered claims (RFC 7519 §4.1) that are present, evaluated. */
  claims: ClaimRow[];
  /** Claim names outside the registered set. */
  privateClaims: string[];
  warnings: string[];
  expiresAt?: Date;
  issuedAt?: Date;
  notBefore?: Date;
  expired: boolean;
  /** Seconds until `exp`; negative once past it. */
  secondsLeft?: number;
  /** Total lifetime in seconds, when both `iat` and `exp` are present. */
  lifetime?: number;
}

/** RFC 7519 §4.1 — the seven claims with defined meanings. */
const REGISTERED: Record<string, string> = {
  iss: 'Issuer — who created and signed this token',
  sub: 'Subject — who the token is about, usually a user id',
  aud: 'Audience — the service this token is meant for',
  exp: 'Expiry — the token must be rejected at or after this time',
  nbf: 'Not before — the token must be rejected before this time',
  iat: 'Issued at — when the token was created',
  jti: 'JWT ID — a unique identifier, for replay prevention',
};

/**
 * Payload keys that should never appear in a JWT. The payload is
 * signed, not encrypted: it is readable by anyone holding the token,
 * including the browser it is stored in and every log the request
 * passes through.
 */
const SENSITIVE_KEY = /^(pass(word|wd|phrase)?|secret|api[_-]?key|private[_-]?key|credit[_-]?card|card[_-]?number|ssn|cvv|pin)$/i;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function formatEpoch(seconds: number, local: boolean): string {
  const date = new Date(seconds * 1000);
  if (Number.isNaN(date.getTime())) return String(seconds);
  return local ? date.toLocaleString() : date.toISOString().replace('.000', '');
}

/** "in 14 minutes", "3 days ago" — an interval a person can act on. */
export function relativeTime(seconds: number): string {
  const abs = Math.abs(seconds);
  const unit =
    abs < 60 ? [abs, 'second'] :
    abs < 3600 ? [abs / 60, 'minute'] :
    abs < 86400 ? [abs / 3600, 'hour'] :
    abs < 2592000 ? [abs / 86400, 'day'] :
    [abs / 2592000, 'month'];

  const n = Math.round(unit[0] as number);
  const plural = `${n} ${unit[1]}${n === 1 ? '' : 's'}`;
  return seconds < 0 ? `${plural} ago` : `in ${plural}`;
}

export interface DecodeOptions {
  indent: string | number;
  localTime: boolean;
  /** Clock skew allowance, in seconds, as a real verifier would apply. */
  leeway: number;
}

export function decodeJwt(token: string, o: DecodeOptions): DecodedJwt {
  const compact = token.trim().replace(/\s+/g, '');
  const bearer = compact.replace(/^Bearer\s*/i, '');

  const parts = bearer.split('.');
  if (parts.length !== 3) {
    throw new JwtError(
      `A JWT has three dot-separated parts; this has ${parts.length}.`,
      parts.length === 5
        ? 'Five parts means this is a JWE — an encrypted token. Its payload cannot be read without the decryption key, by this tool or any other.'
        : 'Check that the whole token was copied. Truncation at a line break is the usual cause, and an "Authorization: Bearer " prefix is stripped automatically.',
    );
  }

  const [headerPart, payloadPart, signature] = parts as [string, string, string];

  let header: unknown;
  let payload: unknown;
  try {
    header = JSON.parse(decodeSegment(headerPart, 'header'));
  } catch (err) {
    if (err instanceof JwtError) throw err;
    throw new JwtError('The header decoded, but it is not valid JSON.');
  }
  try {
    payload = JSON.parse(decodeSegment(payloadPart, 'payload'));
  } catch (err) {
    if (err instanceof JwtError) throw err;
    throw new JwtError(
      'The payload decoded, but it is not valid JSON.',
      'Some systems issue opaque tokens that merely look like a JWT. If the payload is not JSON, this is one of them.',
    );
  }

  if (!isRecord(header)) throw new JwtError('The header is not a JSON object.');
  if (!isRecord(payload)) throw new JwtError('The payload is not a JSON object.');

  const algorithm = typeof header.alg === 'string' ? header.alg : 'unknown';
  const now = Math.floor(Date.now() / 1000);
  const claims: ClaimRow[] = [];
  const warnings: string[] = [];

  const timeClaim = (
    key: 'exp' | 'nbf' | 'iat',
  ): { seconds: number; date: Date } | undefined => {
    const raw = payload[key];
    if (typeof raw !== 'number' || !Number.isFinite(raw)) return undefined;
    // A value in the year 55000 is a millisecond timestamp fed to a
    // field the spec defines in seconds — a common and silent bug.
    if (raw > 1e12) {
      warnings.push(
        `"${key}" looks like a millisecond timestamp. RFC 7519 defines it in seconds, so a verifier will read this as a date far in the future.`,
      );
    }
    return { seconds: raw, date: new Date(raw * 1000) };
  };

  const exp = timeClaim('exp');
  const nbf = timeClaim('nbf');
  const iat = timeClaim('iat');

  for (const [key, meaning] of Object.entries(REGISTERED)) {
    const raw = payload[key];
    if (raw === undefined) continue;

    if (key === 'exp' && exp) {
      const left = exp.seconds - now;
      claims.push({
        claim: 'exp',
        value: `${formatEpoch(exp.seconds, o.localTime)} (${relativeTime(left)})`,
        meaning,
        status: left <= -o.leeway ? 'fail' : left < 300 ? 'warn' : 'ok',
      });
      continue;
    }
    if (key === 'nbf' && nbf) {
      const until = nbf.seconds - now;
      claims.push({
        claim: 'nbf',
        value: `${formatEpoch(nbf.seconds, o.localTime)} (${relativeTime(until)})`,
        meaning,
        status: until > o.leeway ? 'fail' : 'ok',
      });
      continue;
    }
    if (key === 'iat' && iat) {
      claims.push({
        claim: 'iat',
        value: `${formatEpoch(iat.seconds, o.localTime)} (${relativeTime(iat.seconds - now)})`,
        meaning,
        status: iat.seconds - now > o.leeway ? 'warn' : 'info',
      });
      continue;
    }

    claims.push({
      claim: key,
      value: Array.isArray(raw) ? raw.join(', ') : String(raw),
      meaning,
      status: 'info',
    });
  }

  const privateClaims = Object.keys(payload).filter((k) => !(k in REGISTERED));

  /* ── Warnings ── */

  if (algorithm === 'none') {
    warnings.push(
      'The header declares alg: none, which means the token is unsigned. Anyone can edit the payload and it will still "verify" against a library that honours this value. Reject it at the verifier.',
    );
  }
  if (algorithm === 'unknown') {
    warnings.push('The header has no "alg" value, so no verifier can know how to check the signature.');
  }
  if (signature === '' && algorithm !== 'none') {
    warnings.push(`The signature segment is empty but the header claims ${algorithm}. This token cannot verify anywhere.`);
  }
  if (!exp) {
    warnings.push(
      'There is no "exp" claim, so this token never expires on its own. A leaked token stays valid until the signing key is rotated.',
    );
  }
  if (exp && iat && exp.seconds - iat.seconds > 60 * 60 * 24 * 30) {
    warnings.push(
      `The lifetime is ${Math.round((exp.seconds - iat.seconds) / 86400)} days. An access token this long-lived is usually meant to be a refresh token.`,
    );
  }
  const leaked = Object.keys(payload).filter((k) => SENSITIVE_KEY.test(k));
  if (leaked.length > 0) {
    warnings.push(
      `The payload contains ${leaked.map((k) => `"${k}"`).join(', ')}. A JWT payload is signed, not encrypted — it is plain Base64 and readable by anyone holding the token.`,
    );
  }

  const expired = exp !== undefined && exp.seconds - now <= -o.leeway;

  return {
    header,
    payload,
    headerJson: JSON.stringify(header, null, o.indent),
    payloadJson: JSON.stringify(payload, null, o.indent),
    algorithm,
    type: typeof header.typ === 'string' ? header.typ : undefined,
    keyId: typeof header.kid === 'string' ? header.kid : undefined,
    signature,
    signatureBytes: signature === '' ? 0 : base64UrlToBytes(signature, 'signature').length,
    claims,
    privateClaims,
    warnings,
    expiresAt: exp?.date,
    issuedAt: iat?.date,
    notBefore: nbf?.date,
    expired,
    secondsLeft: exp ? exp.seconds - now : undefined,
    lifetime: exp && iat ? exp.seconds - iat.seconds : undefined,
  };
}

/* ── Signature verification ─────────────────────────────────────── */

export type VerifyResult =
  | { status: 'valid' }
  | { status: 'invalid' }
  | { status: 'no-secret' }
  | { status: 'unsigned' }
  | { status: 'unsupported'; algorithm: string }
  | { status: 'bad-secret'; message: string };

const HMAC_HASH: Record<string, string> = {
  HS256: 'SHA-256',
  HS384: 'SHA-384',
  HS512: 'SHA-512',
};

function secretToBytes(secret: string, encoding: SecretEncoding): Uint8Array {
  if (encoding === 'utf8') return new TextEncoder().encode(secret);

  if (encoding === 'hex') {
    const clean = secret.replace(/\s+/g, '');
    if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length % 2 !== 0) {
      throw new JwtError('The secret is not valid hex — it needs an even number of 0–9 a–f characters.');
    }
    const out = new Uint8Array(clean.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    return out;
  }

  return base64UrlToBytes(secret.replace(/\s+/g, ''), 'secret');
}

/**
 * Verify an HMAC signature.
 *
 * Only the HS family is checked. RS, ES and PS are asymmetric: checking
 * one needs the issuer's public key, which is a different input and a
 * different tool. Reporting "unsupported" is the honest answer;
 * reporting "invalid" because no key was supplied would be a lie that
 * sends someone hunting a signing bug that does not exist.
 */
export async function verifyJwt(
  token: string,
  algorithm: string,
  secret: string,
  encoding: SecretEncoding,
): Promise<VerifyResult> {
  if (algorithm === 'none') return { status: 'unsigned' };

  const hash = HMAC_HASH[algorithm];
  if (!hash) return { status: 'unsupported', algorithm };
  if (secret === '') return { status: 'no-secret' };

  const parts = token.trim().replace(/\s+/g, '').replace(/^Bearer\s*/i, '').split('.');
  if (parts.length !== 3) return { status: 'invalid' };

  let keyBytes: Uint8Array;
  try {
    keyBytes = secretToBytes(secret, encoding);
  } catch (err) {
    return { status: 'bad-secret', message: err instanceof JwtError ? err.message : 'The secret could not be read.' };
  }

  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes as unknown as ArrayBuffer,
    { name: 'HMAC', hash },
    false,
    ['sign'],
  );

  const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const expected = toBase64Url(await crypto.subtle.sign('HMAC', key, signed as unknown as ArrayBuffer));

  return expected === parts[2] ? { status: 'valid' } : { status: 'invalid' };
}
