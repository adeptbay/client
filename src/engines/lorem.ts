/**
 * Placeholder text engine.
 *
 * Competitor research: lipsum.com owns this keyword and has since 1999.
 * Beating it head-on is not the play; being genuinely more useful to a
 * developer is. Three things nobody in the top ten does:
 *
 *   1. Output formats — HTML, Markdown, JSX and a JS array, not just
 *      a wall of plain text you then have to wrap by hand.
 *   2. A seed. The same seed always produces the same text, so
 *      placeholder content stops churning your visual-regression
 *      snapshots on every run.
 *   3. Scripts other than Latin. Latin text is the wrong width, the
 *      wrong line-height and the wrong wrapping behaviour for testing a
 *      layout that will actually hold Bangla, Arabic or Japanese.
 */

export type LoremFlavour = 'classic' | 'english' | 'bangla' | 'japanese' | 'arabic';
export type LoremUnit = 'paragraphs' | 'sentences' | 'words' | 'list';
export type LoremFormat = 'plain' | 'html' | 'markdown' | 'jsx' | 'array';

/** Cicero, De finibus bonorum et malorum, 45 BC — sections 1.10.32–33. */
const CLASSIC_OPENING =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

const WORDS: Record<LoremFlavour, string[]> = {
  classic: `lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor
    incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud
    exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure
    in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur
    sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim
    id est laborum perspiciatis unde omnis iste natus error voluptatem accusantium`.split(/\s+/),

  english: `system design pattern content layout interface data model request response
    service client server render component state effect value change update record
    filter search result table column field label action button form input output
    version release branch commit review deploy metric report signal threshold limit
    account session token access policy rule check validate confirm cancel retry queue
    message event stream batch cache index query schema migration backup restore`.split(/\s+/),

  bangla: `সময় মানুষ কাজ দেশ জীবন কথা বছর দিন হাত চোখ মন ঘর পথ নাম গান বই জল আকাশ
    শহর গ্রাম নদী পাখি গাছ ফুল আলো ছায়া বাতাস মাটি সকাল বিকেল রাত সপ্তাহ মাস
    বন্ধু পরিবার শিক্ষা স্বপ্ন আশা গল্প ইতিহাস সংস্কৃতি ভাষা লেখা পড়া শেখা`.split(/\s+/),

  japanese: `時間 場所 世界 生活 仕事 会社 学校 家族 友達 言葉 文化 歴史 社会 経済 技術
    情報 問題 方法 結果 理由 目的 意味 関係 変化 発展 研究 教育 環境 自然 都市
    製品 顧客 市場 価格 品質 設計 開発 管理 分析 記録`.split(/\s+/),

  arabic: `وقت مكان عالم حياة عمل شركة مدرسة عائلة صديق كلمة ثقافة تاريخ مجتمع اقتصاد
    تقنية معلومة مشكلة طريقة نتيجة سبب هدف معنى علاقة تغيير تطور بحث تعليم بيئة
    طبيعة مدينة منتج عميل سوق سعر جودة تصميم تطوير إدارة تحليل تسجيل`.split(/\s+/),
};

/** Sentence-ending punctuation, per script. */
const STOPS: Record<LoremFlavour, { full: string; comma: string }> = {
  classic: { full: '.', comma: ',' },
  english: { full: '.', comma: ',' },
  bangla: { full: '।', comma: ',' },
  japanese: { full: '。', comma: '、' },
  arabic: { full: '.', comma: '،' },
};

/** Japanese does not put spaces between words. */
const JOINER: Record<LoremFlavour, string> = {
  classic: ' ',
  english: ' ',
  bangla: ' ',
  japanese: '',
  arabic: ' ',
};

/**
 * Mulberry32 — a small, fast, well-distributed PRNG.
 *
 * Seeded on purpose: `Math.random` would regenerate different
 * placeholder text on every run, which is exactly what makes
 * screenshot-diff tests fail for no reason.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Turn any seed string into a 32-bit integer (FNV-1a). */
function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface LoremOptions {
  flavour: LoremFlavour;
  unit: LoremUnit;
  count: number;
  format: LoremFormat;
  /** Begin with the canonical "Lorem ipsum dolor sit amet…". */
  startWithLorem: boolean;
  /** Empty string means random each run. */
  seed: string;
}

function buildSentence(rng: () => number, flavour: LoremFlavour, min = 6, max = 18): string {
  const pool = WORDS[flavour];
  const stops = STOPS[flavour];
  const joiner = JOINER[flavour];
  const length = min + Math.floor(rng() * (max - min + 1));

  const words: string[] = [];
  for (let i = 0; i < length; i++) words.push(pool[Math.floor(rng() * pool.length)]!);

  // A comma somewhere in the middle of longer sentences, so the text has
  // realistic rhythm rather than reading as a word list.
  if (length > 10 && rng() > 0.45) {
    const at = 3 + Math.floor(rng() * (length - 6));
    words[at] = words[at] + stops.comma;
  }

  let sentence = words.join(joiner);
  // Latin scripts capitalise; Bangla, Japanese and Arabic have no case.
  if (flavour === 'classic' || flavour === 'english') {
    sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
  }
  return sentence + stops.full;
}

function buildParagraph(rng: () => number, flavour: LoremFlavour): string {
  const sentences = 3 + Math.floor(rng() * 4);
  const out: string[] = [];
  for (let i = 0; i < sentences; i++) out.push(buildSentence(rng, flavour));
  return out.join(JOINER[flavour] === '' ? '' : ' ');
}

export interface LoremResult {
  text: string;
  /** Paragraph or item blocks, before formatting. Used for the array format. */
  blocks: string[];
  words: number;
  characters: number;
  seedUsed: string;
}

export function generateLorem(o: LoremOptions): LoremResult {
  const seedUsed = o.seed.trim() || String(Math.floor(Math.random() * 1e9));
  const rng = mulberry32(hashSeed(seedUsed));
  const count = Math.max(1, Math.min(200, Math.round(o.count)));

  let blocks: string[] = [];

  switch (o.unit) {
    case 'paragraphs':
      for (let i = 0; i < count; i++) blocks.push(buildParagraph(rng, o.flavour));
      break;
    case 'sentences':
      for (let i = 0; i < count; i++) blocks.push(buildSentence(rng, o.flavour));
      break;
    case 'list':
      for (let i = 0; i < count; i++) blocks.push(buildSentence(rng, o.flavour, 3, 8).replace(/[.。।]$/, ''));
      break;
    case 'words': {
      const pool = WORDS[o.flavour];
      const words: string[] = [];
      for (let i = 0; i < count; i++) words.push(pool[Math.floor(rng() * pool.length)]!);
      let text = words.join(JOINER[o.flavour]);
      if (o.flavour === 'classic' || o.flavour === 'english') {
        text = text.charAt(0).toUpperCase() + text.slice(1);
      }
      blocks = [text + STOPS[o.flavour].full];
      break;
    }
  }

  if (o.startWithLorem && o.flavour === 'classic' && blocks.length > 0 && o.unit !== 'list') {
    blocks[0] = `${CLASSIC_OPENING} ${blocks[0]!.replace(/^\S/, (c) => c.toLowerCase())}`;
  }

  const text = format(blocks, o);
  const plain = blocks.join(' ');

  return {
    text,
    blocks,
    words: plain.split(/\s+/).filter(Boolean).length,
    characters: [...text].length,
    seedUsed,
  };
}

function format(blocks: string[], o: LoremOptions): string {
  const escapeHtml = (s: string) =>
    s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!);

  switch (o.format) {
    case 'plain':
      return blocks.join(o.unit === 'list' ? '\n' : '\n\n');

    case 'html':
      if (o.unit === 'list') {
        return `<ul>\n${blocks.map((b) => `  <li>${escapeHtml(b)}</li>`).join('\n')}\n</ul>`;
      }
      return blocks.map((b) => `<p>${escapeHtml(b)}</p>`).join('\n');

    case 'markdown':
      if (o.unit === 'list') return blocks.map((b) => `- ${b}`).join('\n');
      return blocks.join('\n\n');

    case 'jsx':
      if (o.unit === 'list') {
        return `<ul>\n${blocks.map((b) => `  <li>${escapeHtml(b)}</li>`).join('\n')}\n</ul>`;
      }
      // Curly braces in JSX text would be parsed as an expression.
      return blocks.map((b) => `<p>${escapeHtml(b).replace(/[{}]/g, '')}</p>`).join('\n');

    case 'array':
      return `[\n${blocks.map((b) => `  ${JSON.stringify(b)},`).join('\n')}\n]`;
  }
}

export const LOREM_ORIGIN =
  'The classic text is corrupted Latin from Cicero’s De finibus bonorum et malorum, written in 45 BC. The passage begins at section 1.10.32 — "Neque porro quisquam est qui dolorem ipsum quia dolor sit amet". A 16th-century printer scrambled it into a type specimen, and it has been the default placeholder ever since.';
