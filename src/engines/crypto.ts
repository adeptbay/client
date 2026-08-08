/**
 * Crypto engine — a thin wrapper over Web Crypto.
 *
 * Part 4.4: hashing and encoding belong on the client. Web Crypto is
 * native, constant-time where it matters, and available in every target
 * browser — so a "SHA-256 generator" here is genuinely offline, which
 * is the one claim that makes a security tool worth using.
 *
 * MD5 is deliberately absent. Web Crypto does not implement it, and
 * shipping a hand-rolled MD5 to satisfy a keyword would mean adding
 * unaudited crypto code to every page in the cluster. When it is added
 * it will be a lazily-loaded module, not a bundle-wide cost.
 */

export type HashAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';

const encoder = new TextEncoder();

export function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

export function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  // Chunked so a large buffer does not blow the argument limit of apply().
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export async function hash(input: string, algorithm: HashAlgorithm): Promise<ArrayBuffer> {
  return crypto.subtle.digest(algorithm, encoder.encode(input));
}

export async function hashHex(input: string, algorithm: HashAlgorithm): Promise<string> {
  return toHex(await hash(input, algorithm));
}

/** HMAC — for verifying webhook signatures, the common real use. */
export async function hmacHex(
  message: string,
  secret: string,
  algorithm: HashAlgorithm = 'SHA-256',
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: algorithm },
    false,
    ['sign'],
  );
  return toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(message)));
}

/* ── Base64 ─────────────────────────────────────────────────────────
   btoa/atob operate on latin1, so anything above U+00FF throws. Going
   through UTF-8 bytes first is the only correct way to round-trip
   emoji, Bangla, CJK — i.e. most of the reason people reach for a
   Base64 tool in the first place.                                    */

export function encodeBase64(input: string, urlSafe = false): string {
  const b64 = toBase64(encoder.encode(input).buffer as ArrayBuffer);
  return urlSafe ? b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : b64;
}

export function decodeBase64(input: string): string {
  let s = input.trim().replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  // Restore stripped padding; url-safe Base64 usually omits it.
  const pad = s.length % 4;
  if (pad === 2) s += '==';
  else if (pad === 3) s += '=';
  else if (pad === 1) throw new Error('Not valid Base64: the input length is impossible.');

  let binary: string;
  try {
    binary = atob(s);
  } catch {
    throw new Error('Not valid Base64: the input contains characters outside the Base64 alphabet.');
  }

  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

export const isProbablyBase64 = (input: string): boolean => {
  const s = input.trim().replace(/\s+/g, '');
  return s.length > 0 && s.length % 4 !== 1 && /^[A-Za-z0-9+/\-_]*={0,2}$/.test(s);
};

/* ── URL encoding ───────────────────────────────────────────────── */

export type UrlEncodeMode = 'component' | 'full' | 'form';

export function encodeUrl(input: string, mode: UrlEncodeMode): string {
  switch (mode) {
    case 'component':
      return encodeURIComponent(input);
    case 'full':
      return encodeURI(input);
    case 'form':
      // application/x-www-form-urlencoded: space is "+", not "%20".
      return encodeURIComponent(input).replace(/%20/g, '+').replace(/[!'()*]/g, (c) =>
        `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
      );
  }
}

export function decodeUrl(input: string, mode: UrlEncodeMode): string {
  const prepared = mode === 'form' ? input.replace(/\+/g, ' ') : input;
  try {
    return mode === 'full' ? decodeURI(prepared) : decodeURIComponent(prepared);
  } catch {
    throw new Error('Could not decode: the input has a "%" that is not followed by two hex digits.');
  }
}
