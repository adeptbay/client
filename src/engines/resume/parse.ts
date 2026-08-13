/**
 * Layer 1b — structure recognition.
 *
 * Takes positioned lines and rebuilds the document a recruiter reads:
 * who this is, which sections exist, which jobs are claimed, what each
 * bullet asserts, and where the dates leave holes.
 *
 * Every decision here is layout-aware where layout is available and
 * falls back to text where it is not, because the same parser has to
 * serve a PDF (rich) and a plain-text paste (bare). Nothing in this file
 * scores anything — it only observes. Scoring is `score.ts`, and keeping
 * the two apart is what makes the rules auditable one at a time.
 */

import {
  ALL_ACTION_VERBS,
  BULLET_GLYPHS,
  CLICHE_CLAIMS,
  DEGREE_PATTERNS,
  FIRST_PERSON,
  HEDGE_WORDS,
  METRIC_PATTERNS,
  MONTHS,
  PRESENT_WORDS,
  SECTION_SYNONYMS,
  SENSITIVE_FIELDS,
  stemVerb,
  stripBullet,
  tenseOf,
  verbGroupOf,
  KNOWN_SKILLS,
  WEAK_OPENERS,
  type SectionKind,
} from './vocabulary';
import type {
  ContactBlock,
  DateRange,
  EmploymentGap,
  ParsedResume,
  ResumeBullet,
  ResumeRole,
  ResumeSection,
  Seniority,
} from './types';

/** A line with as much layout as the source could supply. */
export interface ResumeLine {
  text: string;
  size: number;
  bold: boolean;
  page: number;
  column: number;
  y: number;
}

/** Plain-text fallback: no layout, so headings are found by wording alone. */
export function linesFromText(text: string): ResumeLine[] {
  return text
    .split(/\r?\n/)
    .map((line, i) => ({
      text: line.trim(),
      size: 10,
      bold: false,
      page: 1,
      column: 0,
      y: -i,
    }))
    .filter((l) => l.text.length > 0);
}

/* ═══════════════════════════════════════════════════════════════════
   Dates
   ═══════════════════════════════════════════════════════════════════ */

interface DateToken {
  year: number;
  month: number | null;
  index: number;
  length: number;
  /** The shape it was written in — used to spot inconsistent formatting. */
  format: string;
  present: boolean;
}

const MONTH_WORDS = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|');
const YEAR_MIN = 1950;

function plausibleYear(year: number): boolean {
  return year >= YEAR_MIN && year <= new Date().getFullYear() + 8;
}

function findDateTokens(text: string): DateToken[] {
  const tokens: DateToken[] = [];
  const claimed: [number, number][] = [];

  const free = (index: number, length: number): boolean =>
    !claimed.some(([from, to]) => index < to && index + length > from);

  const push = (token: DateToken): void => {
    if (!free(token.index, token.length)) return;
    claimed.push([token.index, token.index + token.length]);
    tokens.push(token);
  };

  /* "Present", "Current", "to date" */
  for (const word of PRESENT_WORDS) {
    const re = new RegExp(`\\b${word}\\b`, 'gi');
    for (const m of text.matchAll(re)) {
      push({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        index: m.index,
        length: m[0].length,
        format: 'present',
        present: true,
      });
    }
  }

  /* "March 2021", "Mar. 2021", "Mar-2021" */
  for (const m of text.matchAll(new RegExp(`\\b(${MONTH_WORDS})\\.?[\\s,/-]+(\\d{4})\\b`, 'gi'))) {
    const month = MONTHS[m[1]!.toLowerCase()];
    const year = Number(m[2]);
    if (month === undefined || !plausibleYear(year)) continue;
    push({
      year,
      month,
      index: m.index,
      length: m[0].length,
      format: m[1]!.length <= 4 ? 'Mon YYYY' : 'Month YYYY',
      present: false,
    });
  }

  /* "2021-03", "2021/03" */
  for (const m of text.matchAll(/\b(\d{4})[/-](0[1-9]|1[0-2])\b/g)) {
    const year = Number(m[1]);
    if (!plausibleYear(year)) continue;
    push({ year, month: Number(m[2]), index: m.index, length: m[0].length, format: 'YYYY-MM', present: false });
  }

  /* "03/2021", "3-2021" */
  for (const m of text.matchAll(/\b(0?[1-9]|1[0-2])[/-](\d{4})\b/g)) {
    const year = Number(m[2]);
    if (!plausibleYear(year)) continue;
    push({ year, month: Number(m[1]), index: m.index, length: m[0].length, format: 'MM/YYYY', present: false });
  }

  /* A bare year */
  for (const m of text.matchAll(/\b(19\d{2}|20\d{2})\b/g)) {
    const year = Number(m[1]);
    if (!plausibleYear(year)) continue;
    push({ year, month: null, index: m.index, length: m[0].length, format: 'YYYY', present: false });
  }

  return tokens.sort((a, b) => a.index - b.index);
}

const RANGE_SEPARATOR = /^\s*(?:[–—‒−-]{1,2}|to|until|through|thru|till|–|—)\s*$/i;

/**
 * A date range is two tokens with nothing but a dash or "to" between
 * them. Requiring that gap to be short is what stops "Graduated 2019 …
 * Certified 2023" three lines apart being read as a four-year job.
 */
export function parseDateRange(text: string): DateRange | null {
  const tokens = findDateTokens(text);
  if (tokens.length === 0) return null;

  for (let i = 0; i + 1 < tokens.length; i++) {
    const a = tokens[i]!;
    const b = tokens[i + 1]!;
    if (a.present) continue;

    const between = text.slice(a.index + a.length, b.index);
    if (between.length > 12 || !RANGE_SEPARATOR.test(between)) continue;

    return finishRange(text.slice(a.index, b.index + b.length), a, b);
  }

  // A single date: a one-off event, or an open-ended role written badly.
  const only = tokens[0]!;
  if (only.present) return null;
  return finishRange(text.slice(only.index, only.index + only.length), only, null);
}

function finishRange(raw: string, start: DateToken, end: DateToken | null): DateRange {
  const months =
    end === null
      ? null
      : Math.max(
          0,
          (end.year - start.year) * 12 + ((end.month ?? 12) - (start.month ?? 1)) + 1,
        );

  return {
    raw: raw.trim(),
    startYear: start.year,
    startMonth: start.month,
    endYear: end?.year ?? null,
    endMonth: end?.month ?? null,
    current: end?.present ?? false,
    months,
  };
}

/* ═══════════════════════════════════════════════════════════════════
   Headings
   ═══════════════════════════════════════════════════════════════════ */

const normalise = (line: string): string =>
  line
    .toLowerCase()
    .replace(/[^a-z& ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Match a line against the section vocabulary.
 *
 * The line must *be* the heading, not merely contain the word — "I have
 * five years of experience" is not an Experience heading, and treating
 * it as one would slice a summary in half. So the matched synonym has to
 * account for most of the line.
 */
function matchSectionKind(line: string): SectionKind | null {
  const text = normalise(line);
  if (text.length === 0 || text.length > 45) return null;

  for (const { kind, patterns } of SECTION_SYNONYMS) {
    for (const pattern of patterns) {
      if (text === pattern) return kind;
      // "Experience 2019 – 2024" or "Skills:" — the synonym plus noise.
      if (text.startsWith(`${pattern} `) && text.length - pattern.length <= 12) return kind;
    }
  }
  return null;
}

interface Heading {
  index: number;
  kind: SectionKind;
  text: string;
}

function findHeadings(lines: ResumeLine[], bodySize: number): Heading[] {
  const headings: Heading[] = [];

  lines.forEach((line, index) => {
    const kind = matchSectionKind(line.text);
    if (kind === null) return;

    const looksLikeHeading =
      line.bold ||
      line.size > bodySize * 1.04 ||
      line.text === line.text.toUpperCase() ||
      // No layout at all (pasted text): wording is all we have, and the
      // wording already had to match a synonym almost exactly.
      lines.every((l) => !l.bold && l.size === bodySize);

    if (!looksLikeHeading) return;

    // A heading needs something under it. A "References" line at the very
    // bottom is a section of nothing, and creating it produces a phantom.
    if (index >= lines.length - 1) return;

    headings.push({ index, kind, text: line.text.trim() });
  });

  // Two headings of the same kind: keep the first, treat the rest as body.
  // "Skills" appearing twice is usually "Technical Skills" then "Soft
  // Skills", and splitting them loses half the list.
  const seen = new Set<SectionKind>();
  return headings.filter((h) => {
    if (seen.has(h.kind) && h.kind !== 'other') return false;
    seen.add(h.kind);
    return true;
  });
}

/** The most common font size, which is the body text by definition. */
function modalSize(lines: ResumeLine[]): number {
  const counts = new Map<number, number>();
  for (const line of lines) {
    const key = Math.round(line.size * 2) / 2;
    counts.set(key, (counts.get(key) ?? 0) + line.text.length);
  }
  let best = 10;
  let bestCount = -1;
  for (const [size, count] of counts) {
    if (count > bestCount) {
      best = size;
      bestCount = count;
    }
  }
  return best || 10;
}

/* ═══════════════════════════════════════════════════════════════════
   Contact block
   ═══════════════════════════════════════════════════════════════════ */

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]{2,}/;
/** Deliberately permissive: international CVs write numbers every way. */
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{1,4}\)[\s.-]?)?\d[\d\s.-]{7,14}\d/;

const URL_PATTERNS = {
  linkedin: /(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/(?:in|pub)\/[\w%-]+/i,
  github: /(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+/i,
  website: /(?:https?:\/\/)?(?:www\.)?[\w-]+\.(?:com|net|org|io|dev|me|co|design|xyz|app|portfolio|site)(?:\/[\w%./-]*)?/i,
};

const LOCATION_RE =
  /\b([A-Z][a-zA-Z.'-]+(?:\s[A-Z][a-zA-Z.'-]+)*),\s*([A-Z][a-zA-Z.'-]+(?:\s[A-Z][a-zA-Z.'-]+)*)\b/;

function looksLikeName(line: string): boolean {
  const text = line.trim();
  if (text.length < 3 || text.length > 48) return false;
  if (EMAIL_RE.test(text) || /\d/.test(text) || text.includes('@')) return false;
  if (matchSectionKind(text) !== null) return false;

  const words = text.split(/\s+/);
  if (words.length < 1 || words.length > 5) return false;

  // Either Title Case or ALL CAPS — both are how people write their name.
  const titleCase = words.every((w) => /^[A-Z][a-zA-Z.'-]*$/.test(w) || /^[a-z]{1,3}$/.test(w));
  const allCaps = /^[A-Z][A-Z\s.'-]+$/.test(text) && text.split(/\s+/).length <= 5;
  return titleCase || allCaps;
}

function extractContact(
  headLines: ResumeLine[],
  fullText: string,
  linkUrls: string[],
  metaAuthor: string,
): ContactBlock {
  const head = headLines.map((l) => l.text).join('\n');
  const searchable = `${head}\n${linkUrls.join('\n')}`;

  /* Name: the largest line at the top that reads like one, else the
     first that does, else the file's own /Author metadata. */
  let name: string | null = null;
  const candidates = headLines.filter((l) => looksLikeName(l.text));
  if (candidates.length > 0) {
    const biggest = candidates.reduce((a, b) => (b.size > a.size ? b : a));
    name = biggest.text.trim();
  } else if (looksLikeName(metaAuthor)) {
    name = metaAuthor.trim();
  }

  /* Headline: the line under the name that is not contact detail. */
  let headline: string | null = null;
  const nameIndex = headLines.findIndex((l) => l.text.trim() === name);
  for (let i = nameIndex + 1; i < headLines.length && i <= nameIndex + 3; i++) {
    const text = headLines[i]!.text.trim();
    if (text.length < 3 || text.length > 90) continue;
    if (EMAIL_RE.test(text) || PHONE_RE.test(text) || /linkedin|github|https?:/i.test(text)) continue;
    if (matchSectionKind(text) !== null) continue;
    headline = text;
    break;
  }

  const email = EMAIL_RE.exec(searchable)?.[0] ?? null;

  // Phone matching runs on the header only, and after emails and URLs are
  // removed — a version number or a postcode inside a URL is not a phone.
  const phoneSource = head.replace(EMAIL_RE, ' ').replace(/https?:\/\/\S+/g, ' ');
  const phoneMatch = PHONE_RE.exec(phoneSource)?.[0]?.trim() ?? null;
  const phoneDigits = phoneMatch?.replace(/\D/g, '') ?? '';
  const phone = phoneDigits.length >= 8 && phoneDigits.length <= 15 ? phoneMatch : null;

  const linkedin = URL_PATTERNS.linkedin.exec(searchable)?.[0] ?? null;
  const github = URL_PATTERNS.github.exec(searchable)?.[0] ?? null;

  let website: string | null = null;
  const websiteMatch = URL_PATTERNS.website.exec(head.replace(EMAIL_RE, ' '));
  if (websiteMatch && !/linkedin|github/i.test(websiteMatch[0])) website = websiteMatch[0];

  const location = LOCATION_RE.exec(head)?.[0] ?? null;

  const sensitive = SENSITIVE_FIELDS.filter(({ patterns }) =>
    patterns.some((p) => p.test(fullText)),
  ).map((f) => f.label);

  return { name, headline, email, phone, location, linkedin, github, website, sensitive };
}

/* ═══════════════════════════════════════════════════════════════════
   Bullets
   ═══════════════════════════════════════════════════════════════════ */

const BULLET_SET = new Set(BULLET_GLYPHS);

export function analyseBullet(raw: string, roleIndex: number): ResumeBullet {
  const text = raw.trim();
  const lower = ` ${text.toLowerCase()} `;
  const words = text.split(/\s+/).filter(Boolean);

  const firstWord = words[0] ?? '';
  const base = stemVerb(firstWord);
  const startsWithAction = ALL_ACTION_VERBS.has(base);
  const tense = tenseOf(firstWord);

  const metrics: string[] = [];
  for (const { pattern } of METRIC_PATTERNS) {
    // Patterns are module-level and carry /g, so lastIndex has to be
    // reset or every second call silently starts mid-string.
    pattern.lastIndex = 0;
    for (const m of text.matchAll(pattern)) {
      if (metrics.length < 8) metrics.push(m[0].trim());
    }
  }

  const weakOpener =
    WEAK_OPENER_SORTED.find((p) => lower.trimStart().startsWith(p) || lower.includes(` ${p}`)) ?? null;

  const cliches = CLICHE_CLAIMS.filter((c) => lower.includes(c));
  const hedges = HEDGE_WORDS.filter((h) => lower.includes(` ${h} `));
  const firstPerson = FIRST_PERSON.some((p) => lower.includes(` ${p}`)) || /^i\b/i.test(text);

  return {
    text,
    words: words.length,
    verb: startsWithAction ? base : null,
    verbGroup: startsWithAction ? verbGroupOf(base) : null,
    tense,
    startsWithAction,
    quantified: metrics.length > 0,
    metrics,
    weakOpener,
    cliches,
    hedges,
    firstPerson,
    roleIndex,
  };
}

/** Longest first, so "responsible for" is reported rather than "worked". */
const WEAK_OPENER_SORTED = [...WEAK_OPENERS].sort((a, b) => b.length - a.length);

/* ═══════════════════════════════════════════════════════════════════
   Roles
   ═══════════════════════════════════════════════════════════════════ */

const ORG_SEPARATOR = /\s+[|·•–—]\s+|\s+[-–—]\s+|\s+\bat\b\s+|\s*,\s+/;

function splitRoleHeader(header: string, dates: DateRange | null): {
  title: string | null;
  organisation: string | null;
} {
  let text = header;
  if (dates) text = text.replace(dates.raw, ' ');
  text = text.replace(/[|·•]/g, ' | ').replace(/\s{2,}/g, ' ').trim().replace(/[,|–—-]\s*$/, '');

  const parts = text.split(ORG_SEPARATOR).map((p) => p.trim()).filter((p) => p.length > 1);
  if (parts.length === 0) return { title: null, organisation: null };
  if (parts.length === 1) return { title: parts[0]!, organisation: null };

  return { title: parts[0]!, organisation: parts.slice(1).join(', ') };
}

function isBulletLine(line: ResumeLine): boolean {
  const first = line.text.trim()[0];
  return (first !== undefined && BULLET_SET.has(first)) || /^\(?\d{1,2}[.)]\s+/.test(line.text.trim());
}

/**
 * Split an experience section into roles.
 *
 * The signal for "a new job starts here" is a date range on a short line,
 * or a bold short line. Both are needed: LaTeX CVs put the date on the
 * same line as the title, Word CVs put it on the next line, and Canva
 * templates use bold with no dates at all.
 */
function extractRoles(section: ResumeLine[], anyGlyphs: boolean): ResumeRole[] {
  const roles: ResumeRole[] = [];
  let current: { header: string; dates: DateRange | null; body: ResumeLine[] } | null = null;

  const flush = (): void => {
    if (current === null) return;
    const { title, organisation } = splitRoleHeader(current.header, current.dates);

    const bullets: ResumeBullet[] = [];
    let proseWords = 0;

    for (const line of current.body) {
      const { text, hadGlyph } = stripBullet(line.text);
      if (text.split(/\s+/).length < 3) continue;

      // With glyphs present, only glyph lines are bullets — the rest is
      // a wrapped continuation or a prose paragraph. With none present,
      // every substantial line is treated as one, because that is what
      // the CV is using instead.
      if (hadGlyph || !anyGlyphs) bullets.push(analyseBullet(text, roles.length));
      else proseWords += text.split(/\s+/).length;
    }

    roles.push({
      header: current.header.trim(),
      title,
      organisation,
      dates: current.dates,
      bullets,
      proseWords,
    });
    current = null;
  };

  const headerSize = modalSize(section);

  for (const line of section) {
    const text = line.text.trim();
    if (text.length === 0) continue;

    const bulleted = isBulletLine(line);
    const dates = bulleted ? null : parseDateRange(text);
    const datedHeader = dates !== null && dates.months !== null && text.length < 120;
    const styledHeader = !bulleted && (line.bold || line.size > headerSize * 1.04) && text.length < 90;

    if (datedHeader || styledHeader) {
      // A date line immediately under a header belongs to that header
      // rather than starting a second, empty role.
      if (current !== null && current.body.length === 0 && current.dates === null && dates !== null) {
        current.dates = dates;
        current.header = `${current.header} ${text}`;
        continue;
      }
      flush();
      current = { header: text, dates, body: [] };
      continue;
    }

    if (current === null) current = { header: text, dates: null, body: [] };
    else current.body.push(line);
  }
  flush();

  return roles.filter((r) => r.header.length > 0);
}

/* ═══════════════════════════════════════════════════════════════════
   Skills, gaps, seniority
   ═══════════════════════════════════════════════════════════════════ */

const SKILL_SPLIT = /[,;|•·‣▪●○|/]|\s{3,}|\s+[-–—]\s+/;

function extractSkills(sections: ResumeSection[], fullText: string): string[] {
  const found = new Set<string>();

  for (const section of sections) {
    if (section.kind !== 'skills') continue;
    for (const line of section.lines) {
      // "Languages: TypeScript, Go" — drop the group label, keep the list.
      const body = line.includes(':') ? line.slice(line.indexOf(':') + 1) : line;
      for (const piece of body.split(SKILL_SPLIT)) {
        const skill = stripBullet(piece)
          .text.replace(/\((?:[^)]*)\)/g, '')
          // "Familiar with Docker" is a claim about Docker, not a skill
          // called "Familiar with Docker". The hedge is reported by its
          // own check; here it would only corrupt the skill list.
          .replace(/^(?:familiar with|exposure to|knowledge of|working knowledge of|basic understanding of|some experience with|proficient in|experienced? (?:in|with))\s+/i, '')
          .trim();
        if (skill.length < 2 || skill.length > 40) continue;
        if (skill.split(/\s+/).length > 5) continue;
        found.add(skill);
      }
    }
  }

  // Skills named anywhere else in the document count too: a CV that
  // proves Kubernetes in a bullet should not be told it lacks Kubernetes.
  const haystack = ` ${fullText.toLowerCase()} `;
  for (const skill of KNOWN_SKILLS) {
    if (haystack.includes(` ${skill} `) || haystack.includes(` ${skill},`) || haystack.includes(` ${skill}.`)) {
      if (![...found].some((f) => f.toLowerCase() === skill)) found.add(skill);
    }
  }

  return [...found].slice(0, 120);
}

function computeExperience(roles: ResumeRole[]): { months: number; gaps: EmploymentGap[] } {
  const intervals = roles
    .map((r) => r.dates)
    .filter((d): d is DateRange => d !== null && d.startYear !== null && d.months !== null)
    .map((d) => ({
      start: d.startYear! * 12 + ((d.startMonth ?? 1) - 1),
      end: (d.endYear ?? d.startYear!) * 12 + ((d.endMonth ?? 12) - 1),
    }))
    .filter((i) => i.end >= i.start)
    .sort((a, b) => a.start - b.start);

  if (intervals.length === 0) return { months: 0, gaps: [] };

  let months = 0;
  const gaps: EmploymentGap[] = [];
  let cursorStart = intervals[0]!.start;
  let cursorEnd = intervals[0]!.end;

  for (let i = 1; i < intervals.length; i++) {
    const next = intervals[i]!;
    if (next.start <= cursorEnd + 1) {
      cursorEnd = Math.max(cursorEnd, next.end);
      continue;
    }
    months += cursorEnd - cursorStart + 1;

    const gapMonths = next.start - cursorEnd - 1;
    // Under six months is a notice period and a holiday, not a gap.
    if (gapMonths >= 6) {
      gaps.push({
        afterYear: Math.floor(cursorEnd / 12),
        afterMonth: (cursorEnd % 12) + 1,
        beforeYear: Math.floor(next.start / 12),
        beforeMonth: (next.start % 12) + 1,
        months: gapMonths,
      });
    }
    cursorStart = next.start;
    cursorEnd = next.end;
  }
  months += cursorEnd - cursorStart + 1;

  return { months, gaps };
}

function inferSeniority(months: number, roles: ResumeRole[], sections: ResumeSection[]): Seniority {
  const titles = roles.map((r) => (r.title ?? r.header).toLowerCase()).join(' | ');

  if (/\b(chief|cxo|ceo|cto|cfo|coo|vp|vice president|president|partner|managing director)\b/.test(titles)) {
    return 'executive';
  }
  if (/\b(head of|director|principal|staff engineer|senior manager)\b/.test(titles)) {
    return months >= 96 ? 'executive' : 'senior';
  }

  const hasWork = roles.some((r) => r.dates !== null);
  const educationOnly =
    !hasWork && sections.some((s) => s.kind === 'education') && !sections.some((s) => s.kind === 'experience');
  if (educationOnly) return 'student';

  if (/\b(intern|internship|trainee|apprentice|graduate scheme|junior|assistant)\b/.test(titles) && months < 30) {
    return 'entry';
  }
  if (months >= 120) return 'senior';
  if (months >= 36) return 'mid';
  if (months > 0) return 'entry';

  return sections.some((s) => s.kind === 'experience') ? 'entry' : 'student';
}

/* ═══════════════════════════════════════════════════════════════════
   The parse
   ═══════════════════════════════════════════════════════════════════ */

export function parseResume(
  lines: ResumeLine[],
  options: { linkUrls?: string[]; author?: string } = {},
): ParsedResume {
  const clean = lines.filter((l) => l.text.trim().length > 0);
  const text = clean.map((l) => l.text).join('\n');
  const bodySize = modalSize(clean);

  const headings = findHeadings(clean, bodySize);

  /* ── Sections ── */
  const sections: ResumeSection[] = [];
  headings.forEach((heading, i) => {
    const from = heading.index + 1;
    const to = headings[i + 1]?.index ?? clean.length;
    const body = clean.slice(from, to);
    const sectionText = body.map((l) => l.text).join('\n');

    sections.push({
      kind: heading.kind,
      heading: heading.text,
      lines: body.map((l) => l.text),
      text: sectionText,
      words: sectionText.split(/\s+/).filter(Boolean).length,
      position: i,
    });
  });

  /* ── Contact: everything above the first heading ── */
  const headEnd = headings[0]?.index ?? Math.min(clean.length, 12);
  const contact = extractContact(
    clean.slice(0, Math.max(1, headEnd)),
    text,
    options.linkUrls ?? [],
    options.author ?? '',
  );

  /* ── Roles ── */
  const anyGlyphs = clean.some((l) => isBulletLine(l));
  const roles: ResumeRole[] = [];

  headings.forEach((heading, i) => {
    if (heading.kind !== 'experience' && heading.kind !== 'projects' && heading.kind !== 'volunteer') return;
    const from = heading.index + 1;
    const to = headings[i + 1]?.index ?? clean.length;
    roles.push(...extractRoles(clean.slice(from, to), anyGlyphs));
  });

  /* A CV with no recognisable headings still has content. Read the whole
     document as one block rather than reporting zero of everything. */
  if (headings.length === 0) {
    roles.push(...extractRoles(clean, anyGlyphs));
  }

  // Re-index bullets against their final role positions.
  const bullets: ResumeBullet[] = [];
  roles.forEach((role, index) => {
    role.bullets = role.bullets.map((b) => ({ ...b, roleIndex: index }));
    bullets.push(...role.bullets);
  });

  const { months, gaps } = computeExperience(roles);
  const skills = extractSkills(sections, text);

  const degrees = DEGREE_PATTERNS.flatMap((p) => {
    const m = p.exec(text);
    return m ? [m[0].trim()] : [];
  });

  const dateFormats = [
    ...new Set(
      roles
        .map((r) => r.dates)
        .filter((d): d is DateRange => d !== null)
        .flatMap((d) => findDateTokens(d.raw).map((t) => t.format))
        .filter((f) => f !== 'present'),
    ),
  ];

  return {
    contact,
    sections,
    roles,
    bullets,
    skills,
    degrees: [...new Set(degrees)],
    lines: clean.map((l) => l.text),
    text,
    words: text.split(/\s+/).filter(Boolean).length,
    dateFormats,
    experienceMonths: months,
    gaps,
    seniority: inferSeniority(months, roles, sections),
    headingsFound: headings.length > 0,
  };
}
