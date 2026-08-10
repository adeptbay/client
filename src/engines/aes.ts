/**
 * Authenticated symmetric encryption.
 *
 * Competitor research on "encrypt text online" found the same three
 * mistakes repeatedly, and each one is fatal:
 *
 *   1. **The passphrase used directly as the key.** A key must be
 *      derived with a slow KDF and a random salt. Without that, a
 *      dictionary attack on the passphrase is trivially parallel.
 *   2. **CBC or ECB mode with no authentication.** Ciphertext with no
 *      MAC can be modified by anyone who intercepts it, and the
 *      recipient cannot tell. ECB additionally leaks structure.
 *   3. **A fixed or omitted IV.** Reusing an IV/nonce with the same key
 *      breaks the mode outright.
 *
 * What this implements instead:
 *
 *   Key    PBKDF2-HMAC-SHA256, 600,000 iterations, 16-byte random salt
 *          (OWASP Password Storage Cheat Sheet, current recommendation)
 *   Cipher AES-256-GCM — authenticated, so tampering is detected
 *   Nonce  12 random bytes per message, never reused
 *   Format base64( salt ‖ iv ‖ ciphertext‖tag ) with a version byte
 *
 * All of it through Web Crypto — native, audited, and the same code
 * path the browser uses for TLS. No third-party crypto library is
 * involved, and nothing leaves the page.
 */

/** OWASP Password Storage Cheat Sheet, PBKDF2-HMAC-SHA256. */
export const PBKDF2_ITERATIONS = 600_000;

const SALT_BYTES = 16;
const IV_BYTES = 12;
/** Lets the format change later without silently mis-decrypting old data. */
const VERSION = 0x01;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export class CryptoError extends Error {
  readonly hint: string;
  constructor(message: string, hint: string) {
    super(message);
    this.name = 'CryptoError';
    this.hint = hint;
  }
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const cleaned = value.trim().replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  try {
    return Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
  } catch {
    throw new CryptoError(
      'That is not valid encrypted text.',
      'The input should be the Base64 block this tool produced. Check nothing was truncated when it was copied.',
    );
  }
}

/** Wrap Base64 so a long ciphertext is readable and survives email clients. */
const wrap = (value: string, width = 76): string =>
  value.replace(new RegExp(`(.{${width}})`, 'g'), '$1\n').trim();

export interface EncryptResult {
  ciphertext: string;
  saltHex: string;
  ivHex: string;
  bytes: number;
}

export async function encryptText(plaintext: string, passphrase: string): Promise<EncryptResult> {
  if (passphrase.length < 8) {
    throw new CryptoError(
      'The passphrase is shorter than 8 characters.',
      'Everything here depends on the passphrase — the algorithm cannot compensate for a weak one. Use a generated passphrase of 16 characters or more.',
    );
  }

  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt);

  const sealed = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      encoder.encode(plaintext),
    ),
  );

  // version ‖ salt ‖ iv ‖ ciphertext+tag
  const packed = new Uint8Array(1 + SALT_BYTES + IV_BYTES + sealed.length);
  packed[0] = VERSION;
  packed.set(salt, 1);
  packed.set(iv, 1 + SALT_BYTES);
  packed.set(sealed, 1 + SALT_BYTES + IV_BYTES);

  const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');

  return {
    ciphertext: wrap(toBase64(packed)),
    saltHex: hex(salt),
    ivHex: hex(iv),
    bytes: packed.length,
  };
}

export async function decryptText(payload: string, passphrase: string): Promise<string> {
  const packed = fromBase64(payload);

  if (packed.length < 1 + SALT_BYTES + IV_BYTES + 16) {
    throw new CryptoError(
      'That encrypted block is too short to be valid.',
      'It is missing the salt, the nonce or the authentication tag. Part of it was probably lost when it was copied.',
    );
  }

  if (packed[0] !== VERSION) {
    throw new CryptoError(
      `Unknown format version ${packed[0]}.`,
      'This block was not produced by this tool, or it was produced by a later version of it.',
    );
  }

  const salt = packed.slice(1, 1 + SALT_BYTES);
  const iv = packed.slice(1 + SALT_BYTES, 1 + SALT_BYTES + IV_BYTES);
  const sealed = packed.slice(1 + SALT_BYTES + IV_BYTES);

  const key = await deriveKey(passphrase, salt);

  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      sealed as BufferSource,
    );
    return decoder.decode(plain);
  } catch {
    // GCM cannot distinguish "wrong key" from "modified ciphertext" —
    // both fail authentication identically, and saying so is honest.
    throw new CryptoError(
      'Decryption failed: wrong passphrase, or the encrypted text was altered.',
      'AES-GCM verifies integrity, so it refuses rather than returning wrong output. Check the passphrase first, then check the block was copied in full.',
    );
  }
}

/** For the technical-notes table on the page. */
export const CIPHER_SPEC = {
  kdf: 'PBKDF2-HMAC-SHA256',
  iterations: PBKDF2_ITERATIONS,
  saltBits: SALT_BYTES * 8,
  cipher: 'AES-256-GCM',
  ivBits: IV_BYTES * 8,
  tagBits: 128,
} as const;
