/**
 * PDF text extraction — Layer 1 of the CV checker.
 *
 * ── Why this exists rather than a dependency ────────────────────────
 *
 * The claim this tool makes is "here is what a parser sees". A tool that
 * outsources the seeing to a 1 MB library cannot honestly report *why*
 * a CV failed to parse, because the library's job is to succeed anyway —
 * pdf.js will happily recover text that a recruiter's applicant tracking
 * system loses. Recovering it would hide the finding.
 *
 * So this reads the file the way a plain parser does: objects, streams,
 * fonts, content operators. When it cannot map a glyph, that is recorded
 * rather than guessed, because an unmappable glyph is the single most
 * common reason a CV arrives at a recruiter as "�������".
 *
 * It also keeps the platform's promise intact — nothing is uploaded, no
 * dependency is added, and the whole thing is one lazily-loaded chunk.
 *
 * ── What is implemented ─────────────────────────────────────────────
 *
 *   objects · indirect refs · object streams (/ObjStm)
 *   filters · Flate (via DecompressionStream), LZW, ASCII85, ASCIIHex,
 *             RunLength, PNG/TIFF predictors
 *   pages   · page tree walk with inherited attributes, Form XObjects
 *   fonts   · /ToUnicode CMaps, /Differences, WinAnsi + Standard +
 *             MacRoman encodings, Type0/Identity-H two-byte codes,
 *             /Widths and /W advance widths
 *   text    · full text/graphics matrix pipeline, so a rotated or scaled
 *             page still yields correct positions
 *
 * ── What is deliberately not implemented ────────────────────────────
 *
 *   Encryption (reported, not defeated), JBIG2/CCITT image decoding
 *   (images are counted, never decoded), and OCR. A CV that needs OCR to
 *   be read is a CV that fails the screen, which is the finding.
 */

/* ═══════════════════════════════════════════════════════════════════
   Public shape
   ═══════════════════════════════════════════════════════════════════ */

export interface PdfTextRun {
  text: string;
  /** PDF user space: origin bottom-left, y grows upward. */
  x: number;
  y: number;
  width: number;
  /** Font size after the text and graphics matrices are applied. */
  size: number;
  font: string;
  bold: boolean;
  italic: boolean;
  /** 1-based. */
  page: number;
  /**
   * Text a human cannot see: render mode 3/7, or a fill colour close
   * enough to the page background to be invisible. This is how keyword
   * stuffing is done, and it is a hard fail at most agencies.
   */
  invisible: boolean;
  /** Column band this run was assigned to, 0-based, left to right. */
  column: number;
}

export interface PdfLine {
  page: number;
  /** Baseline, PDF user space. */
  y: number;
  x: number;
  right: number;
  text: string;
  size: number;
  bold: boolean;
  invisible: boolean;
  column: number;
}

export interface PdfPage {
  number: number;
  width: number;
  height: number;
  glyphs: number;
  images: number;
  /** Detected text columns. 2 or more is the classic ATS parse failure. */
  columns: number;
  /** Stroked/filled rectangles and line segments — table and box chrome. */
  vectorMarks: number;
  /** Runs that fell inside the top or bottom 7% of the page. */
  marginRuns: number;
}

export interface PdfInfo {
  title: string;
  author: string;
  creator: string;
  producer: string;
}

export interface PdfExtraction {
  /**
   * Column-aware reading order — what a careful reader gets, and what
   * the scoring layer and the AI layer are given.
   */
  text: string;
  /**
   * Naive top-to-bottom order, ignoring columns. This is what a plain
   * parser produces, and on a two-column CV it is visibly scrambled.
   * Showing both side by side is the tool's central demonstration.
   */
  atsText: string;
  lines: PdfLine[];
  runs: PdfTextRun[];
  pages: PdfPage[];
  info: PdfInfo;
  /** Bytes a font could not map to a character. Each is a lost letter. */
  unmappedGlyphs: number;
  /** Fonts referenced by the page but not embedded in the file. */
  nonEmbeddedFonts: string[];
  linkUrls: string[];
  /** Non-fatal problems worth reporting: a page that failed to inflate. */
  warnings: string[];
  bytes: number;
  version: string;
}

export class PdfError extends Error {
  readonly hint?: string;
  constructor(message: string, hint?: string) {
    super(message);
    this.name = 'PdfError';
    this.hint = hint;
  }
}

/** Above this the parse is refused rather than freezing the tab. */
const MAX_BYTES = 12 * 1024 * 1024;
const MAX_PAGES = 30;
/** Form XObjects can reference each other. Bound the recursion. */
const MAX_FORM_DEPTH = 8;

/* ═══════════════════════════════════════════════════════════════════
   Bytes ⇄ latin1
   Every byte maps to exactly one char code, so offsets found by string
   search are byte offsets. That is the whole reason for this detour.
   ═══════════════════════════════════════════════════════════════════ */

function toLatin1(bytes: Uint8Array): string {
  const CHUNK = 0x4000;
  let out = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode(...bytes.subarray(i, Math.min(i + CHUNK, bytes.length)));
  }
  return out;
}

function fromLatin1(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

/* ═══════════════════════════════════════════════════════════════════
   PDF object model + parser

   One parser serves two jobs: reading indirect objects (where `12 0 R`
   is a reference) and reading content streams (where a bare keyword is
   an operator). `allowRefs` is the only difference.
   ═══════════════════════════════════════════════════════════════════ */

type PdfValue =
  | { t: 'num'; v: number }
  | { t: 'name'; v: string }
  | { t: 'str'; v: string }
  | { t: 'bool'; v: boolean }
  | { t: 'null' }
  | { t: 'ref'; num: number }
  | { t: 'op'; v: string }
  | { t: 'array'; v: PdfValue[] }
  | { t: 'dict'; v: Map<string, PdfValue> };

const NULL_VALUE: PdfValue = { t: 'null' };

const isWhite = (c: string): boolean =>
  c === ' ' || c === '\n' || c === '\r' || c === '\t' || c === '\f' || c === '\0';

const isDelim = (c: string): boolean =>
  c === '(' || c === ')' || c === '<' || c === '>' || c === '[' || c === ']' ||
  c === '{' || c === '}' || c === '/' || c === '%';

function skipSpace(src: string, i: number): number {
  while (i < src.length) {
    const c = src[i]!;
    if (isWhite(c)) {
      i++;
    } else if (c === '%') {
      while (i < src.length && src[i] !== '\n' && src[i] !== '\r') i++;
    } else {
      break;
    }
  }
  return i;
}

/** `#41` escapes are legal inside names and appear in generated files. */
function decodeNameEscapes(raw: string): string {
  if (!raw.includes('#')) return raw;
  return raw.replace(/#([0-9a-fA-F]{2})/g, (_, hex: string) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
}

function readLiteralString(src: string, start: number): { value: string; next: number } {
  let i = start + 1;
  let depth = 1;
  let out = '';

  while (i < src.length) {
    const c = src[i]!;

    if (c === '\\') {
      const n = src[i + 1];
      i += 2;
      switch (n) {
        case 'n': out += '\n'; break;
        case 'r': out += '\r'; break;
        case 't': out += '\t'; break;
        case 'b': out += '\b'; break;
        case 'f': out += '\f'; break;
        case '\n': break;
        case '\r': if (src[i] === '\n') i++; break;
        default: {
          if (n !== undefined && n >= '0' && n <= '7') {
            let oct = n;
            while (oct.length < 3) {
              const d = src[i];
              if (d === undefined || d < '0' || d > '7') break;
              oct += d;
              i++;
            }
            out += String.fromCharCode(parseInt(oct, 8) & 0xff);
          } else if (n !== undefined) {
            out += n;
          }
        }
      }
      continue;
    }

    if (c === '(') depth++;
    if (c === ')') {
      depth--;
      if (depth === 0) return { value: out, next: i + 1 };
    }
    out += c;
    i++;
  }

  return { value: out, next: i };
}

function readHexString(src: string, start: number): { value: string; next: number } {
  let i = start + 1;
  let hex = '';
  while (i < src.length && src[i] !== '>') {
    const c = src[i]!;
    if (!isWhite(c)) hex += c;
    i++;
  }
  if (hex.length % 2 === 1) hex += '0';

  let out = '';
  for (let k = 0; k + 1 < hex.length; k += 2) {
    const byte = parseInt(hex.slice(k, k + 2), 16);
    out += String.fromCharCode(Number.isNaN(byte) ? 0 : byte);
  }
  return { value: out, next: i + 1 };
}

function parseValue(src: string, start: number, allowRefs: boolean): { value: PdfValue; next: number } {
  let i = skipSpace(src, start);
  if (i >= src.length) return { value: NULL_VALUE, next: i };

  const c = src[i]!;

  /* Name */
  if (c === '/') {
    let j = i + 1;
    while (j < src.length && !isWhite(src[j]!) && !isDelim(src[j]!)) j++;
    return { value: { t: 'name', v: decodeNameEscapes(src.slice(i + 1, j)) }, next: j };
  }

  /* Strings */
  if (c === '(') {
    const { value, next } = readLiteralString(src, i);
    return { value: { t: 'str', v: value }, next };
  }

  /* Dictionary or hex string */
  if (c === '<') {
    if (src[i + 1] === '<') {
      const map = new Map<string, PdfValue>();
      let j = i + 2;
      for (;;) {
        j = skipSpace(src, j);
        if (j >= src.length) break;
        if (src[j] === '>' && src[j + 1] === '>') { j += 2; break; }
        if (src[j] !== '/') {
          // Malformed dictionary — step over the offending token so a
          // single bad entry cannot spin this loop forever.
          const skipped = parseValue(src, j, allowRefs);
          if (skipped.next <= j) { j++; continue; }
          j = skipped.next;
          continue;
        }
        const key = parseValue(src, j, allowRefs);
        j = key.next;
        const val = parseValue(src, j, allowRefs);
        j = val.next;
        if (key.value.t === 'name') map.set(key.value.v, val.value);
      }
      return { value: { t: 'dict', v: map }, next: j };
    }
    const { value, next } = readHexString(src, i);
    return { value: { t: 'str', v: value }, next };
  }

  /* Array */
  if (c === '[') {
    const items: PdfValue[] = [];
    let j = i + 1;
    for (;;) {
      j = skipSpace(src, j);
      if (j >= src.length) break;
      if (src[j] === ']') { j++; break; }
      const item = parseValue(src, j, allowRefs);
      if (item.next <= j) { j++; continue; }
      j = item.next;
      items.push(item.value);
    }
    return { value: { t: 'array', v: items }, next: j };
  }

  if (c === ']' || c === '>' || c === '}' || c === ')') {
    return { value: NULL_VALUE, next: i + 1 };
  }

  /* Number — and, in object context, `N G R` */
  if ((c >= '0' && c <= '9') || c === '+' || c === '-' || c === '.') {
    let j = i;
    if (src[j] === '+' || src[j] === '-') j++;
    while (j < src.length && ((src[j]! >= '0' && src[j]! <= '9') || src[j] === '.' || src[j] === '-')) j++;
    const num = Number.parseFloat(src.slice(i, j));
    const value = Number.isFinite(num) ? num : 0;

    if (allowRefs && Number.isInteger(value) && value >= 0) {
      const save = j;
      let k = skipSpace(src, j);
      const genStart = k;
      while (k < src.length && src[k]! >= '0' && src[k]! <= '9') k++;
      if (k > genStart) {
        const afterGen = skipSpace(src, k);
        if (src[afterGen] === 'R' && (afterGen + 1 >= src.length || isWhite(src[afterGen + 1]!) || isDelim(src[afterGen + 1]!))) {
          return { value: { t: 'ref', num: value }, next: afterGen + 1 };
        }
      }
      j = save;
    }
    return { value: { t: 'num', v: value }, next: j };
  }

  /* Keyword: true / false / null, or a content-stream operator */
  let j = i;
  while (j < src.length && !isWhite(src[j]!) && !isDelim(src[j]!)) j++;
  if (j === i) j = i + 1;
  const word = src.slice(i, j);

  if (word === 'true') return { value: { t: 'bool', v: true }, next: j };
  if (word === 'false') return { value: { t: 'bool', v: false }, next: j };
  if (word === 'null') return { value: NULL_VALUE, next: j };
  return { value: { t: 'op', v: word }, next: j };
}

/* ═══════════════════════════════════════════════════════════════════
   Filters
   ═══════════════════════════════════════════════════════════════════ */

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  // Leading whitespace between `stream` and the zlib header is legal and
  // common; DecompressionStream is not forgiving about it.
  let start = 0;
  while (start < data.length && (data[start] === 0x0a || data[start] === 0x0d || data[start] === 0x20)) start++;
  const body = data.subarray(start);

  for (const format of ['deflate', 'deflate-raw'] as const) {
    try {
      const stream = new Blob([body as BlobPart]).stream().pipeThrough(new DecompressionStream(format));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    } catch {
      /* try the next framing */
    }
  }
  throw new PdfError('A compressed section of this PDF could not be read.');
}

function ascii85Decode(data: Uint8Array): Uint8Array {
  const out: number[] = [];
  let tuple = 0;
  let count = 0;

  for (let i = 0; i < data.length; i++) {
    const c = data[i]!;
    if (c === 0x7e) break; // `~>` terminator
    if (c === 0x7a && count === 0) { out.push(0, 0, 0, 0); continue; } // `z`
    if (c < 0x21 || c > 0x75) continue; // whitespace and noise
    tuple = tuple * 85 + (c - 0x21);
    if (++count === 5) {
      out.push((tuple >>> 24) & 0xff, (tuple >>> 16) & 0xff, (tuple >>> 8) & 0xff, tuple & 0xff);
      tuple = 0;
      count = 0;
    }
  }
  if (count > 0) {
    for (let i = count; i < 5; i++) tuple = tuple * 85 + 84;
    const bytes = [(tuple >>> 24) & 0xff, (tuple >>> 16) & 0xff, (tuple >>> 8) & 0xff, tuple & 0xff];
    for (let i = 0; i < count - 1; i++) out.push(bytes[i]!);
  }
  return Uint8Array.from(out);
}

function asciiHexDecode(data: Uint8Array): Uint8Array {
  const out: number[] = [];
  let hi = -1;
  for (let i = 0; i < data.length; i++) {
    const c = String.fromCharCode(data[i]!);
    if (c === '>') break;
    const d = parseInt(c, 16);
    if (Number.isNaN(d)) continue;
    if (hi < 0) hi = d;
    else { out.push((hi << 4) | d); hi = -1; }
  }
  if (hi >= 0) out.push(hi << 4);
  return Uint8Array.from(out);
}

function runLengthDecode(data: Uint8Array): Uint8Array {
  const out: number[] = [];
  let i = 0;
  while (i < data.length) {
    const len = data[i++]!;
    if (len === 128) break;
    if (len < 128) {
      for (let k = 0; k <= len && i < data.length; k++) out.push(data[i++]!);
    } else {
      const b = data[i++];
      if (b === undefined) break;
      for (let k = 0; k < 257 - len; k++) out.push(b);
    }
  }
  return Uint8Array.from(out);
}

/** LZW as PDF uses it: variable code width 9–12, early change by default. */
function lzwDecode(data: Uint8Array, earlyChange: number): Uint8Array {
  const out: number[] = [];
  const dict: number[][] = [];
  const reset = () => {
    dict.length = 0;
    for (let i = 0; i < 256; i++) dict.push([i]);
    dict.push([], []); // 256 = clear, 257 = EOD
  };
  reset();

  let width = 9;
  let prev: number[] | null = null;
  let buffer = 0;
  let bits = 0;

  for (let i = 0; i < data.length; i++) {
    buffer = (buffer << 8) | data[i]!;
    bits += 8;

    while (bits >= width) {
      const code = (buffer >> (bits - width)) & ((1 << width) - 1);
      bits -= width;

      if (code === 256) { reset(); width = 9; prev = null; continue; }
      if (code === 257) return Uint8Array.from(out);

      let entry: number[];
      const known = dict[code];
      if (known !== undefined && known.length > 0) entry = known;
      else if (prev !== null) entry = [...prev, prev[0]!];
      else continue;

      out.push(...entry);
      if (prev !== null) dict.push([...prev, entry[0]!]);
      prev = entry;

      const limit = dict.length + earlyChange;
      if (limit >= 512 && width === 9) width = 10;
      else if (limit >= 1024 && width === 10) width = 11;
      else if (limit >= 2048 && width === 11) width = 12;
    }
  }
  return Uint8Array.from(out);
}

/** PNG and TIFF predictors, as used by object and cross-reference streams. */
function unpredict(data: Uint8Array, predictor: number, colors: number, bpc: number, columns: number): Uint8Array {
  if (predictor < 2) return data;

  const bpp = Math.max(1, Math.ceil((colors * bpc) / 8));
  const rowLen = Math.ceil((colors * bpc * columns) / 8);

  if (predictor === 2) {
    if (bpc !== 8) return data;
    for (let r = 0; r + rowLen <= data.length; r += rowLen) {
      for (let i = bpp; i < rowLen; i++) {
        data[r + i] = (data[r + i]! + data[r + i - bpp]!) & 0xff;
      }
    }
    return data;
  }

  const rows = Math.floor(data.length / (rowLen + 1));
  const out = new Uint8Array(rows * rowLen);
  let prevRow = new Uint8Array(rowLen);

  for (let r = 0; r < rows; r++) {
    const tag = data[r * (rowLen + 1)]!;
    const src = data.subarray(r * (rowLen + 1) + 1, r * (rowLen + 1) + 1 + rowLen);
    const row = new Uint8Array(rowLen);

    for (let i = 0; i < rowLen; i++) {
      const raw = src[i] ?? 0;
      const left = i >= bpp ? row[i - bpp]! : 0;
      const up = prevRow[i]!;
      const upLeft = i >= bpp ? prevRow[i - bpp]! : 0;

      switch (tag) {
        case 0: row[i] = raw; break;
        case 1: row[i] = (raw + left) & 0xff; break;
        case 2: row[i] = (raw + up) & 0xff; break;
        case 3: row[i] = (raw + ((left + up) >> 1)) & 0xff; break;
        case 4: {
          const p = left + up - upLeft;
          const pa = Math.abs(p - left);
          const pb = Math.abs(p - up);
          const pc = Math.abs(p - upLeft);
          const best = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
          row[i] = (raw + best) & 0xff;
          break;
        }
        default: row[i] = raw;
      }
    }
    out.set(row, r * rowLen);
    prevRow = row;
  }
  return out;
}

/* ═══════════════════════════════════════════════════════════════════
   Document — objects, streams, references
   ═══════════════════════════════════════════════════════════════════ */

interface RawObject {
  dictText: string;
  streamStart: number;
  streamEnd: number;
}

class PdfDocument {
  readonly raw: string;
  private readonly objects = new Map<number, RawObject>();
  private readonly parsed = new Map<number, PdfValue>();
  private readonly streams = new Map<number, Uint8Array>();
  readonly warnings: string[] = [];

  constructor(raw: string) {
    this.raw = raw;
    this.scan();
  }

  /**
   * Scan for `N G obj … endobj` rather than following the cross-reference
   * table. Real-world CVs come out of Word, Canva, LaTeX and half a dozen
   * online builders, and a broken or lying xref is common enough that
   * trusting it loses files a scan recovers. The scan is also immune to
   * incremental updates appending a second copy of the document.
   */
  private scan(): void {
    const re = /(\d+)\s+(\d+)\s+obj\b/g;
    const starts: { num: number; at: number; bodyAt: number }[] = [];

    for (let m = re.exec(this.raw); m !== null; m = re.exec(this.raw)) {
      starts.push({ num: Number(m[1]), at: m.index, bodyAt: m.index + m[0].length });
    }

    for (let i = 0; i < starts.length; i++) {
      const here = starts[i]!;
      const limit = starts[i + 1]?.at ?? this.raw.length;
      const endObj = this.raw.indexOf('endobj', here.bodyAt);
      const bodyEnd = endObj >= 0 && endObj < limit ? endObj : limit;

      const streamAt = this.raw.indexOf('stream', here.bodyAt);
      const hasStream = streamAt >= 0 && streamAt < bodyEnd;

      const dictText = this.raw.slice(here.bodyAt, hasStream ? streamAt : bodyEnd);

      let streamStart = -1;
      let streamEnd = -1;
      if (hasStream) {
        streamStart = streamAt + 'stream'.length;
        if (this.raw[streamStart] === '\r') streamStart++;
        if (this.raw[streamStart] === '\n') streamStart++;

        const endMarker = this.raw.indexOf('endstream', streamStart);
        streamEnd = endMarker >= 0 ? endMarker : Math.min(bodyEnd, this.raw.length);
      }

      // Later definitions win: an incrementally updated PDF appends the
      // revised object, and the last one is the live one.
      this.objects.set(here.num, { dictText, streamStart, streamEnd });
    }
  }

  /** Resolve a value that may be an indirect reference. */
  deref(value: PdfValue | undefined): PdfValue {
    let current = value ?? NULL_VALUE;
    for (let hops = 0; current.t === 'ref' && hops < 32; hops++) {
      current = this.object(current.num);
    }
    return current;
  }

  object(num: number): PdfValue {
    const cached = this.parsed.get(num);
    if (cached !== undefined) return cached;

    const raw = this.objects.get(num);
    if (raw === undefined) {
      this.parsed.set(num, NULL_VALUE);
      return NULL_VALUE;
    }

    // Guard against a cycle: an object whose dictionary refers to itself
    // would otherwise recurse through deref forever.
    this.parsed.set(num, NULL_VALUE);
    const { value } = parseValue(raw.dictText, 0, true);
    this.parsed.set(num, value);
    return value;
  }

  dict(value: PdfValue | undefined): Map<string, PdfValue> | null {
    const resolved = this.deref(value);
    return resolved.t === 'dict' ? resolved.v : null;
  }

  num(value: PdfValue | undefined, fallback = 0): number {
    const resolved = this.deref(value);
    return resolved.t === 'num' ? resolved.v : fallback;
  }

  name(value: PdfValue | undefined): string {
    const resolved = this.deref(value);
    return resolved.t === 'name' ? resolved.v : '';
  }

  array(value: PdfValue | undefined): PdfValue[] {
    const resolved = this.deref(value);
    if (resolved.t === 'array') return resolved.v;
    return resolved.t === 'null' ? [] : [resolved];
  }

  /**
   * Object numbers of the streams a /Contents entry points at, without
   * dereferencing them first.
   *
   * `array()` cannot do this job: it resolves the value it is given, so
   * `/Contents 5 0 R` comes back as the stream's *dictionary* and the
   * object number — the only thing that can fetch the bytes — is gone.
   * /Contents legitimately takes three shapes, and all three appear in
   * files people actually upload.
   */
  contentRefs(value: PdfValue | undefined): number[] {
    if (value === undefined) return [];
    if (value.t === 'array') {
      return value.v.filter((v): v is { t: 'ref'; num: number } => v.t === 'ref').map((v) => v.num);
    }
    if (value.t !== 'ref') return [];

    // A reference to an array of references, or straight to the stream.
    const target = this.object(value.num);
    if (target.t === 'array') {
      return target.v.filter((v): v is { t: 'ref'; num: number } => v.t === 'ref').map((v) => v.num);
    }
    return [value.num];
  }

  text(value: PdfValue | undefined): string {
    const resolved = this.deref(value);
    return resolved.t === 'str' ? decodePdfText(resolved.v) : '';
  }

  hasObject(num: number): boolean {
    return this.objects.has(num);
  }

  objectNumbers(): number[] {
    return [...this.objects.keys()].sort((a, b) => a - b);
  }

  /** Decoded stream bytes for an object, or null if it has no stream. */
  async stream(num: number): Promise<Uint8Array | null> {
    const cached = this.streams.get(num);
    if (cached !== undefined) return cached;

    const raw = this.objects.get(num);
    if (raw === undefined || raw.streamStart < 0) return null;

    const dict = this.dict(this.object(num));
    let end = raw.streamEnd;

    // Trust /Length when it lands on an `endstream`, because compressed
    // bytes can contain the literal word. Fall back to the search when
    // it does not — plenty of generators write the wrong length.
    const declared = dict ? this.num(dict.get('Length'), -1) : -1;
    if (declared >= 0) {
      const candidate = raw.streamStart + declared;
      const tail = this.raw.slice(candidate, candidate + 20);
      if (tail.includes('endstream')) end = candidate;
    }

    let bytes = fromLatin1(this.raw.slice(raw.streamStart, Math.max(raw.streamStart, end)));

    if (dict) {
      try {
        bytes = await this.applyFilters(bytes, dict);
      } catch {
        this.warnings.push(`Object ${num} could not be decompressed.`);
        this.streams.set(num, new Uint8Array(0));
        return new Uint8Array(0);
      }
    }

    this.streams.set(num, bytes);
    return bytes;
  }

  private async applyFilters(input: Uint8Array, dict: Map<string, PdfValue>): Promise<Uint8Array> {
    const filters = this.array(dict.get('Filter'))
      .map((f) => this.name(f))
      .filter(Boolean);
    if (filters.length === 0) return input;

    const parmsRaw = this.deref(dict.get('DecodeParms') ?? dict.get('DP'));
    const parmsList = parmsRaw.t === 'array' ? parmsRaw.v : [parmsRaw];

    let bytes = input;
    for (let i = 0; i < filters.length; i++) {
      const filter = filters[i]!;
      const parms = this.dict(parmsList[i] ?? parmsList[0]);

      switch (filter) {
        case 'FlateDecode':
        case 'Fl':
          bytes = await inflate(bytes);
          break;
        case 'LZWDecode':
        case 'LZW':
          bytes = lzwDecode(bytes, parms ? this.num(parms.get('EarlyChange'), 1) : 1);
          break;
        case 'ASCII85Decode':
        case 'A85':
          bytes = ascii85Decode(bytes);
          break;
        case 'ASCIIHexDecode':
        case 'AHx':
          bytes = asciiHexDecode(bytes);
          break;
        case 'RunLengthDecode':
        case 'RL':
          bytes = runLengthDecode(bytes);
          break;
        default:
          // DCTDecode, JPXDecode, CCITTFaxDecode, JBIG2Decode — image
          // codecs. Nothing here decodes images; the caller only counts
          // them, so stopping the chain is the correct result.
          return bytes;
      }

      if (parms) {
        const predictor = this.num(parms.get('Predictor'), 1);
        if (predictor > 1) {
          bytes = unpredict(
            bytes,
            predictor,
            this.num(parms.get('Colors'), 1),
            this.num(parms.get('BitsPerComponent'), 8),
            this.num(parms.get('Columns'), 1),
          );
        }
      }
    }
    return bytes;
  }

  /**
   * Expand /ObjStm containers. Modern generators put most non-stream
   * objects inside these, so without this step a PDF 1.5+ file looks
   * almost empty: no catalog, no page tree, no fonts.
   */
  async expandObjectStreams(): Promise<void> {
    for (const num of this.objectNumbers()) {
      const dict = this.dict(this.object(num));
      if (!dict || this.name(dict.get('Type')) !== 'ObjStm') continue;

      const bytes = await this.stream(num);
      if (!bytes || bytes.length === 0) continue;

      const src = toLatin1(bytes);
      const count = this.num(dict.get('N'));
      const first = this.num(dict.get('First'));

      // Header: `objnum offset` pairs, then the objects themselves.
      const header = src.slice(0, first).trim().split(/\s+/);
      for (let i = 0; i < count; i++) {
        const objNum = Number(header[i * 2]);
        const offset = Number(header[i * 2 + 1]);
        if (!Number.isFinite(objNum) || !Number.isFinite(offset)) continue;
        if (this.objects.has(objNum)) continue; // a real object outranks a packed one

        const nextOffset = i + 1 < count ? Number(header[i * 2 + 3]) : NaN;
        const end = Number.isFinite(nextOffset) ? first + nextOffset : src.length;
        this.objects.set(objNum, {
          dictText: src.slice(first + offset, end),
          streamStart: -1,
          streamEnd: -1,
        });
      }
    }
  }

  /** The trailer's /Root, wherever it lives: classic trailer or XRef stream. */
  catalogNumber(): number {
    const matches = [...this.raw.matchAll(/\/Root\s+(\d+)\s+\d+\s+R/g)];
    for (let i = matches.length - 1; i >= 0; i--) {
      const num = Number(matches[i]![1]);
      const dict = this.dict(this.object(num));
      if (dict && this.name(dict.get('Type')) === 'Catalog') return num;
    }
    for (const num of this.objectNumbers()) {
      const dict = this.dict(this.object(num));
      if (dict && this.name(dict.get('Type')) === 'Catalog') return num;
    }
    return -1;
  }

  isEncrypted(): boolean {
    return /\/Encrypt\s+\d+\s+\d+\s+R/.test(this.raw) || /trailer[\s\S]{0,400}?\/Encrypt/.test(this.raw);
  }
}

/** PDF text strings are either PDFDocEncoded or UTF-16BE with a BOM. */
function decodePdfText(raw: string): string {
  if (raw.charCodeAt(0) === 0xfe && raw.charCodeAt(1) === 0xff) {
    let out = '';
    for (let i = 2; i + 1 < raw.length; i += 2) {
      out += String.fromCharCode((raw.charCodeAt(i) << 8) | raw.charCodeAt(i + 1));
    }
    return out;
  }
  return raw;
}

/* ═══════════════════════════════════════════════════════════════════
   Encodings and glyph names
   ═══════════════════════════════════════════════════════════════════ */

/** WinAnsi differs from latin-1 only in 0x80–0x9F. Those are the ones
    that matter: “smart quotes”, en-dashes and bullets all live here. */
const WIN_ANSI_HIGH: Record<number, number> = {
  0x80: 0x20ac, 0x82: 0x201a, 0x83: 0x0192, 0x84: 0x201e, 0x85: 0x2026,
  0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02c6, 0x89: 0x2030, 0x8a: 0x0160,
  0x8b: 0x2039, 0x8c: 0x0152, 0x8e: 0x017d, 0x91: 0x2018, 0x92: 0x2019,
  0x93: 0x201c, 0x94: 0x201d, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02dc, 0x99: 0x2122, 0x9a: 0x0161, 0x9b: 0x203a, 0x9c: 0x0153,
  0x9e: 0x017e, 0x9f: 0x0178,
};

/** MacRoman for the punctuation a CV actually contains. */
const MAC_ROMAN_HIGH: Record<number, number> = {
  0xa5: 0x2022, 0xd0: 0x2013, 0xd1: 0x2014, 0xd2: 0x201c, 0xd3: 0x201d,
  0xd4: 0x2018, 0xd5: 0x2019, 0xc9: 0x2026, 0xa9: 0x00a9, 0xa8: 0x00ae,
  0xaa: 0x2122, 0xc7: 0x00ab, 0xc8: 0x00bb, 0x8e: 0x00e9, 0x8f: 0x00e8,
};

/**
 * Adobe glyph names that appear in /Differences arrays in practice.
 * The full Adobe Glyph List is four thousand entries; a CV uses these.
 * Anything outside it falls through to the uniXXXX forms below.
 */
const GLYPH_NAMES: Record<string, number> = {
  space: 32, exclam: 33, quotedbl: 34, numbersign: 35, dollar: 36, percent: 37,
  ampersand: 38, quotesingle: 39, quoteright: 0x2019, quoteleft: 0x2018,
  parenleft: 40, parenright: 41, asterisk: 42, plus: 43, comma: 44,
  hyphen: 45, period: 46, slash: 47, zero: 48, one: 49, two: 50, three: 51,
  four: 52, five: 53, six: 54, seven: 55, eight: 56, nine: 57, colon: 58,
  semicolon: 59, less: 60, equal: 61, greater: 62, question: 63, at: 64,
  bracketleft: 91, backslash: 92, bracketright: 93, asciicircum: 94,
  underscore: 95, grave: 96, braceleft: 123, bar: 124, braceright: 125,
  asciitilde: 126, bullet: 0x2022, endash: 0x2013, emdash: 0x2014,
  quotedblleft: 0x201c, quotedblright: 0x201d, quotedblbase: 0x201e,
  ellipsis: 0x2026, dagger: 0x2020, daggerdbl: 0x2021, perthousand: 0x2030,
  guilsinglleft: 0x2039, guilsinglright: 0x203a, trademark: 0x2122,
  registered: 0xae, copyright: 0xa9, degree: 0xb0, plusminus: 0xb1,
  middot: 0xb7, periodcentered: 0xb7, currency: 0xa4, euro: 0x20ac,
  sterling: 0xa3, yen: 0xa5, cent: 0xa2, section: 0xa7, paragraph: 0xb6,
  fi: 0xfb01, fl: 0xfb02, nbspace: 32, minus: 0x2212, divide: 0xf7,
  multiply: 0xd7, aacute: 0xe1, agrave: 0xe0, acircumflex: 0xe2,
  adieresis: 0xe4, aring: 0xe5, ae: 0xe6, ccedilla: 0xe7, eacute: 0xe9,
  egrave: 0xe8, ecircumflex: 0xea, edieresis: 0xeb, iacute: 0xed,
  icircumflex: 0xee, idieresis: 0xef, ntilde: 0xf1, oacute: 0xf3,
  ograve: 0xf2, ocircumflex: 0xf4, odieresis: 0xf6, oslash: 0xf8,
  uacute: 0xfa, ugrave: 0xf9, ucircumflex: 0xfb, udieresis: 0xfc,
  ydieresis: 0xff, germandbls: 0xdf,
};

function glyphNameToUnicode(name: string): number | null {
  const known = GLYPH_NAMES[name];
  if (known !== undefined) return known;

  const uni = /^uni([0-9A-Fa-f]{4,6})$/.exec(name);
  if (uni) return parseInt(uni[1]!, 16);

  const u = /^u([0-9A-Fa-f]{4,6})$/.exec(name);
  if (u) return parseInt(u[1]!, 16);

  // A one-character name is itself: /A, /b, /7.
  if (name.length === 1) return name.charCodeAt(0);

  // `g12`, `cid45`, `index7` — subset fonts that shipped no ToUnicode.
  // There is no way back to a character from these, and pretending
  // otherwise is how "garbled CV" bugs are born.
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   Fonts
   ═══════════════════════════════════════════════════════════════════ */

interface LoadedFont {
  baseFont: string;
  bold: boolean;
  italic: boolean;
  /** Type0 with Identity encoding: codes are two bytes wide. */
  twoByte: boolean;
  embedded: boolean;
  toUnicode: Map<number, string>;
  differences: Map<number, number>;
  baseEncoding: 'winansi' | 'macroman' | 'standard';
  widths: Map<number, number>;
  defaultWidth: number;
}

/**
 * Used when a `Tf` names a font the resource dictionary does not hold.
 * `embedded` is true on purpose: we have no evidence either way, and
 * reporting "your fonts are not embedded" on the strength of our own
 * missing lookup would be a fabricated finding.
 */
const FALLBACK_FONT: LoadedFont = {
  baseFont: 'Unknown',
  bold: false,
  italic: false,
  twoByte: false,
  embedded: true,
  toUnicode: new Map(),
  differences: new Map(),
  baseEncoding: 'standard',
  widths: new Map(),
  defaultWidth: 500,
};

/**
 * Parse a /ToUnicode CMap. Only the two constructs that carry text
 * matter — bfchar for single codes, bfrange for runs.
 */
function parseCMap(src: string): Map<number, string> {
  const map = new Map<number, string>();

  const utf16 = (hex: string): string => {
    let out = '';
    for (let i = 0; i + 3 < hex.length; i += 4) {
      const unit = parseInt(hex.slice(i, i + 4), 16);
      if (Number.isFinite(unit)) out += String.fromCharCode(unit);
    }
    if (hex.length === 2) out = String.fromCharCode(parseInt(hex, 16));
    return out;
  };

  for (const block of src.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const pair of (block[1] ?? '').matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]*)>/g)) {
      map.set(parseInt(pair[1]!, 16), utf16(pair[2]!));
    }
  }

  for (const block of src.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    const body = block[1] ?? '';

    // `<lo> <hi> [<dst> <dst> …]` — one destination per code.
    for (const row of body.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*\[([\s\S]*?)\]/g)) {
      const lo = parseInt(row[1]!, 16);
      const items = [...(row[3] ?? '').matchAll(/<([0-9A-Fa-f]*)>/g)];
      items.forEach((item, i) => map.set(lo + i, utf16(item[1]!)));
    }

    // `<lo> <hi> <dst>` — consecutive destinations.
    for (const row of body.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>(?!\s*\[)/g)) {
      const lo = parseInt(row[1]!, 16);
      const hi = parseInt(row[2]!, 16);
      const dstHex = row[3]!;
      const dst = parseInt(dstHex, 16);
      if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi < lo) continue;

      // Surrogate pairs and ligature destinations are longer than 4 hex
      // digits; only the trailing unit increments across the range.
      const prefix = dstHex.length > 4 ? utf16(dstHex.slice(0, dstHex.length - 4)) : '';
      const tail = dstHex.length > 4 ? parseInt(dstHex.slice(-4), 16) : dst;

      for (let code = lo; code <= Math.min(hi, lo + 65_535); code++) {
        map.set(code, prefix + String.fromCharCode(tail + (code - lo)));
      }
    }
  }

  return map;
}

async function loadFont(doc: PdfDocument, fontRef: PdfValue): Promise<LoadedFont> {
  const dict = doc.dict(fontRef);
  if (!dict) return FALLBACK_FONT;

  const subtype = doc.name(dict.get('Subtype'));
  const baseFont = doc.name(dict.get('BaseFont')) || 'Unknown';
  const lower = baseFont.toLowerCase();

  const font: LoadedFont = {
    baseFont: baseFont.replace(/^[A-Z]{6}\+/, ''),
    bold: /bold|black|heavy|semib|demib/.test(lower),
    italic: /italic|oblique/.test(lower),
    twoByte: false,
    embedded: false,
    toUnicode: new Map(),
    differences: new Map(),
    baseEncoding: 'standard',
    widths: new Map(),
    defaultWidth: 500,
  };

  /* ── Encoding ── */
  const encoding = doc.deref(dict.get('Encoding'));
  const encodingName = encoding.t === 'name' ? encoding.v : '';
  const encodingDict = encoding.t === 'dict' ? encoding.v : null;

  const baseName = encodingName || (encodingDict ? doc.name(encodingDict.get('BaseEncoding')) : '');
  if (baseName === 'WinAnsiEncoding') font.baseEncoding = 'winansi';
  else if (baseName === 'MacRomanEncoding') font.baseEncoding = 'macroman';

  if (encodingDict) {
    let code = 0;
    for (const item of doc.array(encodingDict.get('Differences'))) {
      const value = doc.deref(item);
      if (value.t === 'num') code = value.v;
      else if (value.t === 'name') {
        const unicode = glyphNameToUnicode(value.v);
        if (unicode !== null) font.differences.set(code, unicode);
        code++;
      }
    }
  }

  /* ── ToUnicode ── */
  const toUnicodeRef = dict.get('ToUnicode');
  if (toUnicodeRef?.t === 'ref') {
    const bytes = await doc.stream(toUnicodeRef.num);
    if (bytes && bytes.length > 0) font.toUnicode = parseCMap(toLatin1(bytes));
  }

  /* ── Composite (Type0) fonts ── */
  if (subtype === 'Type0') {
    font.twoByte = !encodingName || encodingName.startsWith('Identity');

    const descendant = doc.array(dict.get('DescendantFonts'))[0];
    const descDict = doc.dict(descendant);
    if (descDict) {
      font.defaultWidth = doc.num(descDict.get('DW'), 1000);
      font.embedded = hasEmbeddedFile(doc, doc.dict(descDict.get('FontDescriptor')));

      // /W is `[ c [w w w] cFirst cLast w … ]`.
      const w = doc.array(descDict.get('W'));
      for (let i = 0; i < w.length; ) {
        const first = doc.deref(w[i]);
        if (first.t !== 'num') { i++; continue; }
        const next = doc.deref(w[i + 1]);
        if (next.t === 'array') {
          next.v.forEach((item, k) => {
            const width = doc.deref(item);
            if (width.t === 'num') font.widths.set(first.v + k, width.v);
          });
          i += 2;
        } else if (next.t === 'num') {
          const width = doc.deref(w[i + 2]);
          if (width.t === 'num') {
            for (let c = first.v; c <= Math.min(next.v, first.v + 65_535); c++) {
              font.widths.set(c, width.v);
            }
          }
          i += 3;
        } else {
          i++;
        }
      }
    }
    return font;
  }

  /* ── Simple fonts ── */
  font.embedded = hasEmbeddedFile(doc, doc.dict(dict.get('FontDescriptor')));

  // The 14 standard fonts are never embedded and never need to be.
  if (/^(Helvetica|Times|Courier|Symbol|ZapfDingbats|Arial)/i.test(font.baseFont)) {
    font.embedded = true;
    if (font.baseEncoding === 'standard' && !encodingDict) font.baseEncoding = 'winansi';
  }

  const firstChar = doc.num(dict.get('FirstChar'), 0);
  doc.array(dict.get('Widths')).forEach((item, i) => {
    const width = doc.deref(item);
    if (width.t === 'num') font.widths.set(firstChar + i, width.v);
  });

  return font;
}

function hasEmbeddedFile(doc: PdfDocument, descriptor: Map<string, PdfValue> | null): boolean {
  if (!descriptor) return false;
  return ['FontFile', 'FontFile2', 'FontFile3'].some((key) => descriptor.has(key));
}

/** Map one character code to text, or null when the font cannot say. */
function decodeCode(font: LoadedFont, code: number): string | null {
  const mapped = font.toUnicode.get(code);
  if (mapped !== undefined) return mapped === '' ? null : mapped;

  if (font.twoByte) return null;

  const diff = font.differences.get(code);
  if (diff !== undefined) return String.fromCharCode(diff);

  if (code >= 32 && code <= 126) return String.fromCharCode(code);

  if (font.baseEncoding === 'winansi') {
    const high = WIN_ANSI_HIGH[code];
    if (high !== undefined) return String.fromCharCode(high);
    if (code >= 0xa0) return String.fromCharCode(code);
  }
  if (font.baseEncoding === 'macroman') {
    const high = MAC_ROMAN_HIGH[code];
    if (high !== undefined) return String.fromCharCode(high);
  }
  if (code >= 0xa0) return String.fromCharCode(code);

  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   Matrices
   ═══════════════════════════════════════════════════════════════════ */

type Matrix = [number, number, number, number, number, number];

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** m × n, in PDF's row-vector convention. */
function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[1] * n[2],
    m[0] * n[1] + m[1] * n[3],
    m[2] * n[0] + m[3] * n[2],
    m[2] * n[1] + m[3] * n[3],
    m[4] * n[0] + m[5] * n[2] + n[4],
    m[4] * n[1] + m[5] * n[3] + n[5],
  ];
}

/** Uniform scale factor of a matrix — turns a text matrix into a size. */
function scaleOf(m: Matrix): number {
  const det = Math.abs(m[0] * m[3] - m[1] * m[2]);
  return det > 0 ? Math.sqrt(det) : Math.hypot(m[0], m[1]) || 1;
}

/* ═══════════════════════════════════════════════════════════════════
   Content stream interpreter
   ═══════════════════════════════════════════════════════════════════ */

interface GraphicsState {
  ctm: Matrix;
  fill: [number, number, number];
  fontKey: string;
  fontSize: number;
  charSpacing: number;
  wordSpacing: number;
  horizontalScale: number;
  leading: number;
  rise: number;
  renderMode: number;
}

interface PageAccumulator {
  runs: PdfTextRun[];
  images: number;
  vectorMarks: number;
  unmapped: number;
  fontsSeen: Set<string>;
  nonEmbedded: Set<string>;
}

const cloneState = (s: GraphicsState): GraphicsState => ({ ...s, ctm: [...s.ctm] as Matrix });

/** Near-white fill on a white page: invisible to a human, read by a parser. */
function isInvisibleColour(fill: [number, number, number]): boolean {
  return fill[0] > 0.93 && fill[1] > 0.93 && fill[2] > 0.93;
}

async function runContentStream(
  doc: PdfDocument,
  content: string,
  resources: Map<string, PdfValue> | null,
  fonts: Map<string, LoadedFont>,
  initial: GraphicsState,
  page: number,
  acc: PageAccumulator,
  depth: number,
): Promise<void> {
  let state = cloneState(initial);
  const stack: GraphicsState[] = [];

  let textMatrix: Matrix = [...IDENTITY];
  let lineMatrix: Matrix = [...IDENTITY];

  const operands: PdfValue[] = [];
  const numAt = (i: number): number => {
    const v = operands[i];
    return v?.t === 'num' ? v.v : 0;
  };

  const fontFor = (key: string): LoadedFont => fonts.get(key) ?? FALLBACK_FONT;

  /** Draw one string, advancing the text matrix as the glyphs consume space. */
  const showText = (raw: string): void => {
    const font = fontFor(state.fontKey);
    const size = state.fontSize;
    const hScale = state.horizontalScale;

    const codes: number[] = [];
    if (font.twoByte) {
      for (let i = 0; i + 1 < raw.length; i += 2) {
        codes.push((raw.charCodeAt(i) << 8) | raw.charCodeAt(i + 1));
      }
    } else {
      for (let i = 0; i < raw.length; i++) codes.push(raw.charCodeAt(i) & 0xff);
    }

    let piece = '';
    let advance = 0;

    for (const code of codes) {
      const char = decodeCode(font, code);
      if (char === null) {
        acc.unmapped++;
        piece += '�';
      } else {
        piece += char;
      }

      const width = (font.widths.get(code) ?? font.defaultWidth) / 1000;
      const isSpace = !font.twoByte && code === 32;
      advance += (width * size + state.charSpacing + (isSpace ? state.wordSpacing : 0)) * hScale;
    }

    if (piece.length > 0) {
      // Captured before the advance is applied, so position, width and
      // size all describe the same moment. Using the live text matrix
      // for the width would measure the run from where it ends.
      const placement = multiply(textMatrix, state.ctm);
      const render: Matrix = multiply([size * hScale, 0, 0, size, 0, state.rise], placement);
      const scale = scaleOf(placement);
      const effectiveSize = size * scale;

      acc.runs.push({
        text: piece,
        x: render[4],
        y: render[5],
        width: advance * scale,
        size: effectiveSize > 0.01 ? effectiveSize : size,
        font: font.baseFont,
        bold: font.bold,
        italic: font.italic,
        page,
        invisible: state.renderMode === 3 || state.renderMode === 7 || isInvisibleColour(state.fill),
        column: 0,
      });

      acc.fontsSeen.add(font.baseFont);
      if (!font.embedded) acc.nonEmbedded.add(font.baseFont);
    }

    textMatrix = multiply([1, 0, 0, 1, advance, 0], textMatrix);
  };

  const nextLine = (tx: number, ty: number): void => {
    lineMatrix = multiply([1, 0, 0, 1, tx, ty], lineMatrix);
    textMatrix = [...lineMatrix];
  };

  let i = 0;
  let guard = 0;
  const GUARD_LIMIT = 4_000_000;

  while (i < content.length && guard++ < GUARD_LIMIT) {
    const parsed = parseValue(content, i, false);
    if (parsed.next <= i) { i++; continue; }
    i = parsed.next;

    if (parsed.value.t !== 'op') {
      if (operands.length < 64) operands.push(parsed.value);
      continue;
    }

    const op = parsed.value.v;

    switch (op) {
      /* ── graphics state ── */
      case 'q':
        stack.push(cloneState(state));
        break;
      case 'Q': {
        const restored = stack.pop();
        if (restored) state = restored;
        break;
      }
      case 'cm':
        state.ctm = multiply(
          [numAt(0), numAt(1), numAt(2), numAt(3), numAt(4), numAt(5)],
          state.ctm,
        );
        break;

      /* ── fill colour, for the invisible-text check ── */
      case 'g':
        state.fill = [numAt(0), numAt(0), numAt(0)];
        break;
      case 'rg':
        state.fill = [numAt(0), numAt(1), numAt(2)];
        break;
      case 'k': {
        const k = numAt(3);
        state.fill = [
          (1 - numAt(0)) * (1 - k),
          (1 - numAt(1)) * (1 - k),
          (1 - numAt(2)) * (1 - k),
        ];
        break;
      }
      case 'sc':
      case 'scn': {
        const nums = operands.filter((o): o is { t: 'num'; v: number } => o.t === 'num');
        if (nums.length === 1) state.fill = [nums[0]!.v, nums[0]!.v, nums[0]!.v];
        else if (nums.length >= 3) state.fill = [nums[0]!.v, nums[1]!.v, nums[2]!.v];
        break;
      }

      /* ── text state ── */
      case 'BT':
        textMatrix = [...IDENTITY];
        lineMatrix = [...IDENTITY];
        break;
      case 'ET':
        break;
      case 'Tf': {
        const name = operands[0];
        state.fontKey = name?.t === 'name' ? name.v : state.fontKey;
        state.fontSize = numAt(1);
        break;
      }
      case 'Tc': state.charSpacing = numAt(0); break;
      case 'Tw': state.wordSpacing = numAt(0); break;
      case 'Tz': state.horizontalScale = numAt(0) / 100; break;
      case 'TL': state.leading = numAt(0); break;
      case 'Ts': state.rise = numAt(0); break;
      case 'Tr': state.renderMode = numAt(0); break;

      /* ── text positioning ── */
      case 'Td': nextLine(numAt(0), numAt(1)); break;
      case 'TD':
        state.leading = -numAt(1);
        nextLine(numAt(0), numAt(1));
        break;
      case 'Tm':
        lineMatrix = [numAt(0), numAt(1), numAt(2), numAt(3), numAt(4), numAt(5)];
        textMatrix = [...lineMatrix];
        break;
      case 'T*': nextLine(0, -state.leading); break;

      /* ── text showing ── */
      case 'Tj': {
        const s = operands[0];
        if (s?.t === 'str') showText(s.v);
        break;
      }
      case "'": {
        nextLine(0, -state.leading);
        const s = operands[0];
        if (s?.t === 'str') showText(s.v);
        break;
      }
      case '"': {
        state.wordSpacing = numAt(0);
        state.charSpacing = numAt(1);
        nextLine(0, -state.leading);
        const s = operands[2];
        if (s?.t === 'str') showText(s.v);
        break;
      }
      case 'TJ': {
        const arr = operands[0];
        if (arr?.t === 'array') {
          for (const item of arr.v) {
            if (item.t === 'str') {
              showText(item.v);
            } else if (item.t === 'num') {
              // Kerning only moves the pen. Whether the movement is wide
              // enough to be a word space is decided later, from the
              // geometry — which already includes this shift, because the
              // next run's position is measured after it is applied.
              // Deciding it here as well inserted the space twice.
              textMatrix = multiply(
                [1, 0, 0, 1, (-item.v / 1000) * state.fontSize * state.horizontalScale, 0],
                textMatrix,
              );
            }
          }
        }
        break;
      }

      /* ── vector marks: table rules, boxes, dividers ── */
      case 're':
      case 'l':
      case 'c':
      case 'v':
      case 'y':
        acc.vectorMarks++;
        break;

      /* ── XObjects ── */
      case 'Do': {
        const name = operands[0];
        if (name?.t === 'name' && resources && depth < MAX_FORM_DEPTH) {
          const xobjects = doc.dict(resources.get('XObject'));
          const ref = xobjects?.get(name.v);
          if (ref?.t === 'ref') {
            const xDict = doc.dict(ref);
            const subtype = xDict ? doc.name(xDict.get('Subtype')) : '';

            if (subtype === 'Image') {
              acc.images++;
            } else if (subtype === 'Form' && xDict) {
              const bytes = await doc.stream(ref.num);
              if (bytes && bytes.length > 0) {
                const formMatrix = doc.array(xDict.get('Matrix'))
                  .map((m) => doc.num(m))
                  .slice(0, 6);
                const nested = cloneState(state);
                if (formMatrix.length === 6) {
                  nested.ctm = multiply(formMatrix as Matrix, state.ctm);
                }
                const formResources = doc.dict(xDict.get('Resources')) ?? resources;
                const formFonts = await loadFonts(doc, formResources, fonts);
                await runContentStream(
                  doc, toLatin1(bytes), formResources, formFonts,
                  nested, page, acc, depth + 1,
                );
              }
            }
          }
        }
        break;
      }

      /* ── inline image: skip its binary payload or the parser derails ── */
      case 'BI': {
        const idAt = content.indexOf('ID', i);
        if (idAt < 0) { i = content.length; break; }
        let scan = idAt + 3;
        for (;;) {
          const eiAt = content.indexOf('EI', scan);
          if (eiAt < 0) { scan = content.length; break; }
          const before = content[eiAt - 1];
          const after = content[eiAt + 2];
          if ((before === undefined || isWhite(before)) && (after === undefined || isWhite(after) || isDelim(after))) {
            scan = eiAt + 2;
            break;
          }
          scan = eiAt + 2;
        }
        acc.images++;
        i = scan;
        break;
      }

      default:
        break;
    }

    operands.length = 0;
  }
}

/** Resolve a resource dictionary's fonts, reusing anything already loaded. */
async function loadFonts(
  doc: PdfDocument,
  resources: Map<string, PdfValue> | null,
  inherited: Map<string, LoadedFont>,
): Promise<Map<string, LoadedFont>> {
  const fonts = new Map(inherited);
  const fontDict = doc.dict(resources?.get('Font'));
  if (!fontDict) return fonts;

  for (const [key, ref] of fontDict) {
    fonts.set(key, await loadFont(doc, ref));
  }
  return fonts;
}

/* ═══════════════════════════════════════════════════════════════════
   Page tree
   ═══════════════════════════════════════════════════════════════════ */

interface PageNode {
  dict: Map<string, PdfValue>;
  resources: Map<string, PdfValue> | null;
  mediaBox: [number, number, number, number];
  rotate: number;
}

function collectPages(doc: PdfDocument): PageNode[] {
  const pages: PageNode[] = [];
  const catalogNum = doc.catalogNumber();

  const walk = (
    node: PdfValue,
    resources: Map<string, PdfValue> | null,
    mediaBox: [number, number, number, number],
    rotate: number,
    seen: Set<number>,
    depth: number,
  ): void => {
    if (pages.length >= MAX_PAGES || depth > 32) return;

    const dict = doc.dict(node);
    if (!dict) return;

    const ownResources = doc.dict(dict.get('Resources')) ?? resources;
    const boxValues = doc.array(dict.get('MediaBox')).map((v) => doc.num(v));
    const ownBox: [number, number, number, number] =
      boxValues.length === 4
        ? [boxValues[0]!, boxValues[1]!, boxValues[2]!, boxValues[3]!]
        : mediaBox;
    const ownRotate = dict.has('Rotate') ? doc.num(dict.get('Rotate'), rotate) : rotate;

    const type = doc.name(dict.get('Type'));

    if (type === 'Page' || (!dict.has('Kids') && dict.has('Contents'))) {
      pages.push({ dict, resources: ownResources, mediaBox: ownBox, rotate: ownRotate });
      return;
    }

    for (const kid of doc.array(dict.get('Kids'))) {
      if (kid.t === 'ref') {
        if (seen.has(kid.num)) continue;
        seen.add(kid.num);
      }
      walk(kid, ownResources, ownBox, ownRotate, seen, depth + 1);
    }
  };

  if (catalogNum >= 0) {
    const catalog = doc.dict(doc.object(catalogNum));
    const pagesRoot = catalog?.get('Pages');
    if (pagesRoot) {
      walk(pagesRoot, null, [0, 0, 612, 792], 0, new Set(), 0);
    }
  }

  // A damaged page tree is common in files produced by online builders.
  // Fall back to every object that calls itself a Page, in file order.
  if (pages.length === 0) {
    for (const num of doc.objectNumbers()) {
      if (pages.length >= MAX_PAGES) break;
      const dict = doc.dict(doc.object(num));
      if (!dict || doc.name(dict.get('Type')) !== 'Page') continue;

      const boxValues = doc.array(dict.get('MediaBox')).map((v) => doc.num(v));
      pages.push({
        dict,
        resources: doc.dict(dict.get('Resources')),
        mediaBox:
          boxValues.length === 4
            ? [boxValues[0]!, boxValues[1]!, boxValues[2]!, boxValues[3]!]
            : [0, 0, 612, 792],
        rotate: doc.num(dict.get('Rotate'), 0),
      });
    }
  }

  return pages;
}

/* ═══════════════════════════════════════════════════════════════════
   Layout reconstruction
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Find the vertical gutter that splits a two-column page.
 *
 * A CV laid out in two columns is the most expensive layout mistake
 * there is, because the parser reads across the gutter and interleaves
 * a skills list into the middle of a job description. Detecting the
 * gutter is what lets the tool *show* that happening.
 */
function detectColumns(runs: PdfTextRun[], pageWidth: number): { gutter: number | null } {
  const body = runs.filter((r) => r.text.trim().length > 0);
  if (body.length < 25 || pageWidth <= 0) return { gutter: null };

  const BUCKETS = 100;
  const covered = new Array<number>(BUCKETS).fill(0);

  for (const run of body) {
    const from = Math.max(0, Math.floor((run.x / pageWidth) * BUCKETS));
    const to = Math.min(BUCKETS - 1, Math.ceil(((run.x + Math.max(run.width, 1)) / pageWidth) * BUCKETS));
    for (let b = from; b <= to; b++) covered[b] = (covered[b] ?? 0) + 1;
  }

  // Only the middle of the page can hold a gutter; a margin is not one.
  let best: { start: number; length: number } | null = null;
  let runStart = -1;

  for (let b = 20; b <= 80; b++) {
    if ((covered[b] ?? 0) === 0) {
      if (runStart < 0) runStart = b;
    } else if (runStart >= 0) {
      const length = b - runStart;
      if (!best || length > best.length) best = { start: runStart, length };
      runStart = -1;
    }
  }
  if (runStart >= 0 && 81 - runStart > (best?.length ?? 0)) best = { start: runStart, length: 81 - runStart };

  // Needs to be a real channel, not the gap between two words.
  if (!best || best.length < 5) return { gutter: null };

  const gutterX = ((best.start + best.length / 2) / BUCKETS) * pageWidth;
  const left = body.filter((r) => r.x + r.width <= gutterX).length;
  const right = body.filter((r) => r.x >= gutterX).length;

  // Both sides must carry real content. A single sidebar date column is
  // not a two-column layout, and flagging it would be a false alarm.
  const minimum = Math.max(8, body.length * 0.18);
  if (left < minimum || right < minimum) return { gutter: null };

  return { gutter: gutterX };
}

/** Group runs sharing a baseline into lines, left to right. */
function buildLines(runs: PdfTextRun[]): PdfLine[] {
  if (runs.length === 0) return [];

  const sorted = [...runs].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    if (a.column !== b.column) return a.column - b.column;
    if (Math.abs(a.y - b.y) > 0.1) return b.y - a.y;
    return a.x - b.x;
  });

  const lines: PdfLine[] = [];
  let current: PdfTextRun[] = [];

  const flush = (): void => {
    if (current.length === 0) return;

    const ordered = [...current].sort((a, b) => a.x - b.x);
    const first = ordered[0]!;

    let text = '';
    let cursor = first.x;
    for (const run of ordered) {
      const gap = run.x - cursor;
      // A gap wider than a quarter of the type size is a space the file
      // never stored — justified and tab-aligned text relies on it.
      if (text !== '' && gap > run.size * 0.22 && !text.endsWith(' ') && !run.text.startsWith(' ')) {
        text += ' ';
      }
      text += run.text;
      cursor = run.x + run.width;
    }

    const sizes = ordered.map((r) => r.size);
    lines.push({
      page: first.page,
      y: first.y,
      x: first.x,
      right: cursor,
      text: text.replace(/\s+/g, ' ').trim(),
      size: Math.max(...sizes),
      bold: ordered.some((r) => r.bold),
      invisible: ordered.every((r) => r.invisible),
      column: first.column,
    });
    current = [];
  };

  for (const run of sorted) {
    const last = current[current.length - 1];
    const sameLine =
      last !== undefined &&
      last.page === run.page &&
      last.column === run.column &&
      // Half the type size: superscripts and subscripts stay on their line,
      // a genuine new line does not.
      Math.abs(last.y - run.y) <= Math.max(2, Math.min(last.size, run.size) * 0.5);

    if (!sameLine) flush();
    current.push(run);
  }
  flush();

  return lines.filter((l) => l.text.length > 0);
}

/** Join lines into a document, inserting blank lines at paragraph breaks. */
function linesToText(lines: PdfLine[]): string {
  let out = '';
  let previous: PdfLine | null = null;

  for (const line of lines) {
    if (previous !== null) {
      const newBlock = previous.page !== line.page || previous.column !== line.column;
      const drop = previous.y - line.y;
      // More than one and a half line-heights of space is a paragraph
      // break; the section structure of a CV is carried by exactly this.
      const bigGap = drop > Math.max(previous.size, line.size) * 1.7;
      out += newBlock || bigGap ? '\n\n' : '\n';
    }
    out += line.text;
    previous = line;
  }

  return out.replace(/\n{3,}/g, '\n\n').trim();
}

/* ═══════════════════════════════════════════════════════════════════
   Entry point
   ═══════════════════════════════════════════════════════════════════ */

export async function extractPdf(source: ArrayBuffer | Uint8Array): Promise<PdfExtraction> {
  const bytes = source instanceof Uint8Array ? source : new Uint8Array(source);

  if (bytes.length === 0) {
    throw new PdfError('That file is empty.', 'Export the CV again and re-upload it.');
  }
  if (bytes.length > MAX_BYTES) {
    throw new PdfError(
      `That file is ${(bytes.length / 1024 / 1024).toFixed(1)} MB.`,
      'The limit is 12 MB. A text CV is almost always under 1 MB — a large file usually means scanned pages or uncompressed images.',
    );
  }

  const raw = toLatin1(bytes);
  const headerAt = raw.indexOf('%PDF-');
  if (headerAt < 0 || headerAt > 1024) {
    throw new PdfError(
      'That file is not a PDF.',
      'Only .pdf is accepted here, because a .docx tells you nothing about how your CV will be parsed once a recruiter converts it.',
    );
  }

  const doc = new PdfDocument(raw);

  if (doc.isEncrypted()) {
    throw new PdfError(
      'This PDF is password-protected or restricted.',
      'Remove the protection and export a plain PDF. An applicant tracking system cannot open a protected file either — it would be rejected before anyone read it.',
    );
  }

  await doc.expandObjectStreams();

  const version = /^%PDF-(\d\.\d)/.exec(raw.slice(headerAt))?.[1] ?? 'unknown';
  const pageNodes = collectPages(doc);

  if (pageNodes.length === 0) {
    throw new PdfError(
      'No readable pages were found in this PDF.',
      'The file may be truncated. Re-export it from the original document and try again.',
    );
  }

  /* ── Interpret every page ── */
  const allRuns: PdfTextRun[] = [];
  const pages: PdfPage[] = [];
  const nonEmbedded = new Set<string>();
  let unmapped = 0;

  for (let index = 0; index < pageNodes.length; index++) {
    const node = pageNodes[index]!;
    const pageNumber = index + 1;

    const acc: PageAccumulator = {
      runs: [],
      images: 0,
      vectorMarks: 0,
      unmapped: 0,
      fontsSeen: new Set(),
      nonEmbedded: new Set(),
    };

    const contentParts: string[] = [];
    for (const num of doc.contentRefs(node.dict.get('Contents'))) {
      const streamBytes = await doc.stream(num);
      if (streamBytes && streamBytes.length > 0) contentParts.push(toLatin1(streamBytes));
    }

    const width = Math.abs(node.mediaBox[2] - node.mediaBox[0]) || 612;
    const height = Math.abs(node.mediaBox[3] - node.mediaBox[1]) || 792;

    if (contentParts.length > 0) {
      const fonts = await loadFonts(doc, node.resources, new Map());
      const state: GraphicsState = {
        // Shift the origin so a MediaBox that does not start at 0,0 still
        // produces positions the column detector can reason about.
        ctm: [1, 0, 0, 1, -Math.min(node.mediaBox[0], node.mediaBox[2]), -Math.min(node.mediaBox[1], node.mediaBox[3])],
        fill: [0, 0, 0],
        fontKey: '',
        fontSize: 0,
        charSpacing: 0,
        wordSpacing: 0,
        horizontalScale: 1,
        leading: 0,
        rise: 0,
        renderMode: 0,
      };

      try {
        await runContentStream(
          doc, contentParts.join('\n'), node.resources, fonts,
          state, pageNumber, acc, 0,
        );
      } catch {
        doc.warnings.push(`Page ${pageNumber} could not be fully interpreted.`);
      }
      for (const font of acc.nonEmbedded) nonEmbedded.add(font);
    }

    /* Columns, assigned before lines are built so the grouping respects them. */
    const { gutter } = detectColumns(acc.runs, width);
    if (gutter !== null) {
      for (const run of acc.runs) run.column = run.x + run.width / 2 < gutter ? 0 : 1;
    }

    const marginBand = height * 0.07;
    pages.push({
      number: pageNumber,
      width,
      height,
      glyphs: acc.runs.reduce((sum, r) => sum + r.text.length, 0),
      images: acc.images,
      columns: gutter === null ? 1 : 2,
      vectorMarks: acc.vectorMarks,
      marginRuns: acc.runs.filter((r) => r.y > height - marginBand || r.y < marginBand).length,
    });

    unmapped += acc.unmapped;
    allRuns.push(...acc.runs);
  }

  /* ── Document metadata ── */
  const info: PdfInfo = { title: '', author: '', creator: '', producer: '' };
  const infoMatch = /\/Info\s+(\d+)\s+\d+\s+R/.exec(raw);
  if (infoMatch) {
    const infoDict = doc.dict(doc.object(Number(infoMatch[1])));
    if (infoDict) {
      info.title = doc.text(infoDict.get('Title'));
      info.author = doc.text(infoDict.get('Author'));
      info.creator = doc.text(infoDict.get('Creator'));
      info.producer = doc.text(infoDict.get('Producer'));
    }
  }

  /* ── Links: a broken or missing LinkedIn URL is a real finding ── */
  const linkUrls = [
    ...new Set(
      [...raw.matchAll(/\/URI\s*\(([^)]{4,300})\)/g)]
        .map((m) => m[1]!.replace(/\\([()\\])/g, '$1').trim())
        .filter((url) => /^(https?:|mailto:|tel:)/i.test(url)),
    ),
  ].slice(0, 40);

  /* ── Text, both ways ── */
  const visible = allRuns.filter((r) => !r.invisible);

  const readingLines = buildLines(visible);

  // The naive order: ignore columns entirely and read straight down the
  // page, which is what a parser without layout analysis does.
  const atsLines = buildLines(visible.map((r) => ({ ...r, column: 0 })));

  return {
    text: linesToText(readingLines),
    atsText: linesToText(atsLines),
    lines: readingLines,
    runs: allRuns,
    pages,
    info,
    unmappedGlyphs: unmapped,
    nonEmbeddedFonts: [...nonEmbedded].sort(),
    linkUrls,
    warnings: doc.warnings.slice(0, 10),
    bytes: bytes.length,
    version,
  };
}
