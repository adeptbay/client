/**
 * Layer 2 — the scoring engine.
 *
 * ── The rule this file is built around ──────────────────────────────
 *
 * A score is a summary of findings, never a finding itself. Every point
 * that is taken away is taken by a named check that can say which line
 * of the CV cost it and what to write instead. Nothing here produces a
 * number the tool cannot then explain, because "your CV scores 62" with
 * no attribution is the failure mode of every free scorer on the web:
 * it manufactures anxiety and sells the explanation back.
 *
 * ── Consequences of that rule ───────────────────────────────────────
 *
 * · Checks return a ratio in 0–1, not a boolean. "Nine of your fourteen
 *   bullets carry a number" is worth partial credit and specific advice;
 *   pass/fail would flatten it to a red cross.
 * · A check that fires must produce a `fix`. If we cannot say what to do
 *   about a problem, we have no business charging points for it.
 * · Career breaks, non-Western CV conventions and unconventional job
 *   titles are reported as context, never as errors. A tool that scores
 *   a parent returning to work as a 58 is wrong about them, not about
 *   the market.
 *
 * ── The gate ────────────────────────────────────────────────────────
 *
 * Parse failures are not additive with wording problems. A CV a machine
 * cannot read is not a 70 with a deduction — it is out of the process
 * regardless of how well it is written, so the parse category caps the
 * total rather than merely contributing to it.
 */

import type { PdfExtraction } from '@engines/pdf';
import { getDepartment, LINK_LABEL, type Department, type DepartmentId } from './departments';
import { KNOWN_SKILLS, STOP_WORDS, isKnownSkill } from './vocabulary';
import type {
  CategoryId,
  CategoryResult,
  CheckOutcome,
  Finding,
  Grade,
  KeywordMatch,
  ParsedResume,
  ResumeReport,
  ResumeStats,
  ScoreScope,
  Seniority,
  Severity,
} from './types';

export interface ScoreOptions {
  targetRole: string;
  jobAd: string;
  /** Overrides the inferred level when the user knows better. */
  seniority: Seniority | 'auto';
  /**
   * The field this CV is aimed at. Empty means "not stated", and every
   * department-aware check returns neutral rather than guessing — a
   * checker that assumes software engineering marks down every nurse
   * who uses it.
   */
  department: DepartmentId | '';
}

export const DEFAULT_SCORE_OPTIONS: ScoreOptions = {
  targetRole: '',
  jobAd: '',
  seniority: 'auto',
  department: '',
};

/* ═══════════════════════════════════════════════════════════════════
   Check plumbing
   ═══════════════════════════════════════════════════════════════════ */

interface CheckReport {
  /**
   * 0–1, or **null for "does not apply here"**.
   *
   * The distinction matters more than it looks. Returning 1 for a check
   * that cannot run — keyword coverage with no advert pasted, a
   * portfolio check for an accountant — awards full marks for a question
   * never asked, and enough of those turn a score into a participation
   * medal. A null is struck from the numerator *and* the denominator, so
   * the score is always out of what was actually measurable.
   */
  ratio: number | null;
  title?: string;
  detail?: string;
  fix?: string;
  evidence?: string[];
  /** Shown in the "already right" list when the check passes outright. */
  win?: string;
}

interface Context {
  parsed: ParsedResume;
  doc: PdfExtraction;
  options: ScoreOptions;
  seniority: Seniority;
  keywords: KeywordMatch[] | null;
  /** Null when the user did not state a field. Checks stay neutral then. */
  department: Department | null;
}

interface CheckSpec {
  id: string;
  label: string;
  weight: number;
  severity: Severity;
  /**
   * Overrides the category's scope for this check alone.
   *
   * The department-aware checks live inside quality categories for
   * display — a missing certifications section belongs next to the other
   * structure findings — but they measure *fit*, not how good the
   * document is. Without this override the quality score would drift as
   * the user changed department, which is exactly the confusion the two
   * numbers exist to remove.
   */
  scope?: ScoreScope;
  run: (ctx: Context) => CheckReport;
}

interface CategorySpec {
  id: CategoryId;
  label: string;
  description: string;
  weight: number;
  /**
   * Which of the two headline numbers this category feeds. Everything
   * about the document itself is `quality`; everything about the fit
   * between the document and a target is `relevance`.
   */
  scope: ScoreScope;
  checks: CheckSpec[];
}

const clamp01 = (n: number): number => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/** Proportional credit that only starts paying above a floor. */
const band = (value: number, floor: number, target: number): number =>
  target <= floor ? (value >= target ? 1 : 0) : clamp01((value - floor) / (target - floor));

const sample = (items: string[], count = 3): string[] =>
  items.filter((s) => s.trim().length > 0).slice(0, count).map((s) => (s.length > 160 ? `${s.slice(0, 157)}…` : s));

const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

/** Subject–verb agreement: "1 bullet describes", "4 bullets describe". */
const agree = (n: number, verb: string): string => (n === 1 ? `${verb}s` : verb);
const agreeBe = (n: number): string => (n === 1 ? 'is' : 'are');
const agreeHave = (n: number): string => (n === 1 ? 'has' : 'have');

/**
 * The CV flattened for phrase lookup.
 *
 * Punctuation becomes space so "React, TypeScript" matches both, but
 * `+ # . / -` survive because dropping them would lose c++, c#, node.js,
 * ci/cd and a-levels — which is most of what gets searched for.
 */
const haystackOf = (parsed: ParsedResume): string =>
  ` ${`${parsed.text} ${parsed.skills.join(' ')}`
    .toLowerCase()
    .replace(/[^a-z0-9+#./ -]/g, ' ')
    .replace(/\s+/g, ' ')} `;

/** Whole-phrase presence, tolerating a plural. */
const mentions = (haystack: string, phrase: string): boolean =>
  haystack.includes(` ${phrase} `) || haystack.includes(` ${phrase}s `);

/* ═══════════════════════════════════════════════════════════════════
   Length expectations

   Bands, not targets. The honest version of "how long should a CV be"
   is a range that widens with seniority, and a checker that demands 480
   words is inventing precision it does not have.
   ═══════════════════════════════════════════════════════════════════ */

const LENGTH_BANDS: Record<Seniority, { words: [number, number]; pages: [number, number]; note: string }> = {
  student:    { words: [220, 550],  pages: [1, 1], note: 'One page. Coursework and projects carry it until work does.' },
  entry:      { words: [280, 620],  pages: [1, 1], note: 'One page under three years. There is no exception worth the risk.' },
  mid:        { words: [420, 900],  pages: [1, 2], note: 'One page, two at a push. Two only if the second is full.' },
  senior:     { words: [600, 1150], pages: [2, 2], note: 'Two pages is normal past ten years. A third is read by nobody.' },
  executive:  { words: [650, 1350], pages: [2, 3], note: 'Two pages, three if the board history genuinely needs it.' },
};

/* ═══════════════════════════════════════════════════════════════════
   Job-advert keywords
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Pull the terms an advert actually cares about.
 *
 * Frequency alone is a bad signal — "team" appears six times in every
 * advert ever written. Known skills are promoted, boilerplate is
 * dropped, and two-word phrases are kept whole because "project
 * management" is one requirement and "project" plus "management" is not.
 */
export function extractKeywords(jobAd: string, resumeText: string): KeywordMatch[] {
  const ad = jobAd.toLowerCase();
  if (ad.trim().length < 40) return [];

  const resume = ` ${resumeText.toLowerCase().replace(/[^a-z0-9+#./ -]/g, ' ').replace(/\s+/g, ' ')} `;
  const counts = new Map<string, number>();

  const add = (term: string, boost = 1): void => {
    if (term.length < 2 || term.length > 32) return;
    counts.set(term, (counts.get(term) ?? 0) + boost);
  };

  /* Multi-word skills first, so their tokens are not double counted:
     "project management" is one requirement, not two. */
  const claimed = new Set<string>();
  for (const skill of KNOWN_MULTIWORD) {
    if (ad.includes(skill)) {
      add(skill, 4);
      for (const word of skill.split(' ')) claimed.add(word);
    }
  }

  const tokens = ad.match(/[a-z][a-z0-9+#.]{1,24}/g) ?? [];
  for (const token of tokens) {
    if (STOP_WORDS.has(token) || claimed.has(token)) continue;
    if (token.length < 3) continue;
    add(token, isKnownSkill(token) ? 4 : 1);
  }

  const present = (term: string): boolean => {
    if (resume.includes(` ${term} `) || resume.includes(` ${term},`)) return true;
    // Tolerate plurals and simple inflections in either direction.
    if (resume.includes(` ${term}s `) || (term.endsWith('s') && resume.includes(` ${term.slice(0, -1)} `))) return true;
    return new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(resume);
  };

  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 28)
    .map(([term, count]) => ({ term, adCount: count, inResume: present(term) }));
}

/**
 * The multi-word entries of the skill list, longest first, so that
 * "machine learning" is claimed before "learning" can be counted alone.
 */
const KNOWN_MULTIWORD: string[] = KNOWN_SKILLS.filter((s) => s.includes(' ')).sort(
  (a, b) => b.length - a.length,
);

/* ═══════════════════════════════════════════════════════════════════
   Category 1 · Parse safety — 25 points
   ═══════════════════════════════════════════════════════════════════ */

const PARSE_CHECKS: CheckSpec[] = [
  {
    id: 'text-layer',
    label: 'The file contains real text',
    weight: 30,
    severity: 'critical',
    run: ({ doc }) => {
      const glyphs = doc.pages.reduce((sum, p) => sum + p.glyphs, 0);
      if (glyphs >= 400) return { ratio: 1, win: 'The text layer is intact — a parser can read the whole file.' };

      const imagePages = doc.pages.filter((p) => p.glyphs < 40 && p.images > 0).length;
      return {
        ratio: glyphs < 40 ? 0 : band(glyphs, 40, 400) * 0.5,
        title: imagePages > 0 ? 'This CV is an image, not text' : 'Almost no readable text in this file',
        detail:
          imagePages > 0
            ? `${plural(imagePages, 'page')} contain a picture of a CV rather than a CV. Every applicant tracking system sees a blank document, and so does the search that would have surfaced you.`
            : 'Only a handful of characters could be read out of this file. Whatever a recruiter sees on screen, the parser is receiving almost nothing.',
        fix: 'Export straight to PDF from the original document — do not scan, screenshot or "print to image". If the original is gone, retype it: there is no version of this that survives the screen.',
        evidence: [],
      };
    },
  },
  {
    id: 'single-column',
    label: 'Single-column layout',
    weight: 22,
    severity: 'critical',
    run: ({ doc }) => {
      const multi = doc.pages.filter((p) => p.columns > 1);
      if (multi.length === 0) return { ratio: 1, win: 'Single column throughout — the safest layout there is.' };

      const scrambled = doc.atsText
        .split('\n')
        .filter((l) => l.trim().length > 25)
        .slice(2, 5);

      return {
        ratio: clamp01(1 - multi.length / doc.pages.length) * 0.35,
        title: `Two-column layout on ${plural(multi.length, 'page')}`,
        detail:
          'A parser reads straight across the page, so a sidebar is interleaved line by line into the main column. Your skills list ends up spliced into the middle of a job description, and the result is what a recruiter searches against.',
        fix: 'Rebuild as a single column. Sidebars, tables and text boxes all cause this — the visual balance they buy costs you the parse, and the parse happens first.',
        evidence: sample(scrambled),
      };
    },
  },
  {
    id: 'glyph-mapping',
    label: 'Characters map to real letters',
    weight: 16,
    severity: 'critical',
    run: ({ doc }) => {
      const glyphs = doc.pages.reduce((sum, p) => sum + p.glyphs, 0);
      if (glyphs === 0) return { ratio: 0 };

      const share = doc.unmappedGlyphs / glyphs;
      if (share < 0.005) return { ratio: 1, win: 'Every character survives copy and paste intact.' };

      return {
        ratio: clamp01(1 - share * 6),
        title: `${Math.round(share * 100)}% of the characters cannot be read as text`,
        detail:
          'The fonts in this file ship no character map, so the letters are shapes with no identity. On screen it looks perfect; copied out, it is a row of boxes — and copying out is exactly what the recruiter\'s system does.',
        fix: 'Re-export with "embed fonts" enabled, or switch to a standard face (Arial, Calibri, Helvetica, Times). Test it yourself: open the PDF, select all, paste into a plain text editor. What you see there is what they get.',
        evidence: [],
      };
    },
  },
  {
    id: 'hidden-text',
    label: 'No hidden keyword stuffing',
    weight: 12,
    severity: 'critical',
    run: ({ doc }) => {
      const hidden = doc.runs.filter((r) => r.invisible && r.text.trim().length > 2);
      if (hidden.length === 0) return { ratio: 1 };

      const words = hidden.map((r) => r.text.trim()).join(' ').trim();
      return {
        ratio: 0,
        title: 'This file contains text a human cannot see',
        detail:
          'White-on-white or zero-opacity text is in this PDF. Whether or not it was deliberate — some templates leave it behind — every major applicant tracking system flags it, and the standard response is to discard the application and, at agencies, the candidate.',
        fix: 'Open the file, select all, and look for text that appears where nothing is visible. Delete it. If this came from a template, get a different template.',
        evidence: sample([words.slice(0, 200)]),
      };
    },
  },
  {
    id: 'headings-detectable',
    label: 'Section headings a parser recognises',
    weight: 10,
    severity: 'critical',
    run: ({ parsed }) => {
      const known = new Set(parsed.sections.map((s) => s.kind));
      const core = ['experience', 'education', 'skills'].filter((k) => known.has(k as never)).length;

      if (!parsed.headingsFound) {
        return {
          ratio: 0,
          title: 'No section headings could be identified',
          detail:
            'A parser files your CV by looking for headings it knows — Experience, Education, Skills. Without them every line lands in one undifferentiated blob, and the recruiter\'s search for "3 years experience" has nothing to match against.',
          fix: 'Add plain headings on their own line: Summary, Experience, Education, Skills. Bold them if you like. Do not stylise them ("My Journey", "What I Bring") and do not put them inside a text box.',
          evidence: sample(parsed.lines.slice(0, 6)),
        };
      }
      if (core === 3) return { ratio: 1, win: 'Experience, Education and Skills all sit under headings a parser knows.' };

      const missing = ['experience', 'education', 'skills'].filter((k) => !known.has(k as never));
      return {
        ratio: core / 3,
        title: `${missing.map((m) => m[0]!.toUpperCase() + m.slice(1)).join(' and ')} has no standard heading`,
        detail: 'The content may be there, but under a heading the parser does not recognise it never reaches the right field.',
        fix: `Rename the heading to the plain word: ${missing.join(', ')}. Creative section names cost you the field mapping and buy nothing.`,
        evidence: sample(parsed.sections.map((s) => s.heading)),
      };
    },
  },
  {
    id: 'contact-in-body',
    label: 'Contact details outside the page margins',
    weight: 6,
    severity: 'important',
    run: ({ doc, parsed }) => {
      const marginRuns = doc.pages.reduce((sum, p) => sum + p.marginRuns, 0);
      const firstPage = doc.pages[0];
      if (!firstPage || marginRuns === 0) return { ratio: 1 };

      const contactInMargin = doc.runs.some(
        (r) =>
          r.page === 1 &&
          (r.y > firstPage.height * 0.93 || r.y < firstPage.height * 0.07) &&
          (parsed.contact.email !== null && r.text.includes('@')),
      );
      if (!contactInMargin) return { ratio: 1 };

      return {
        ratio: 0.2,
        title: 'Your email sits in the page header or footer',
        detail:
          'A significant share of applicant tracking systems strip headers and footers before parsing, on the assumption they hold page numbers. Contact details placed there are silently deleted, and the application arrives with no way to reply to it.',
        fix: 'Move your email, phone and links into the body of the first page, directly under your name.',
        evidence: [],
      };
    },
  },
  {
    id: 'fonts-embedded',
    label: 'Fonts embedded in the file',
    weight: 8,
    severity: 'important',
    run: ({ doc }) => {
      if (doc.nonEmbeddedFonts.length === 0) return { ratio: 1 };
      return {
        ratio: clamp01(1 - doc.nonEmbeddedFonts.length / 4),
        title: `${plural(doc.nonEmbeddedFonts.length, 'font')} ${agreeBe(doc.nonEmbeddedFonts.length)} not embedded in the PDF`,
        detail:
          'A font the file does not carry is substituted by whatever the reader has installed. Line breaks move, the second page grows a third, and the layout you approved is not the one being read.',
        fix: 'Re-export with font embedding on. In Word: File → Save As → PDF → Options → tick "ISO 19005-1 compliant". In Google Docs, download as PDF rather than printing.',
        evidence: sample(doc.nonEmbeddedFonts),
      };
    },
  },
  {
    id: 'table-chrome',
    label: 'No tables or boxes around the content',
    weight: 6,
    severity: 'important',
    run: ({ doc }) => {
      const perPage = doc.pages.reduce((sum, p) => sum + p.vectorMarks, 0) / Math.max(1, doc.pages.length);
      if (perPage < 45) return { ratio: 1 };
      return {
        ratio: clamp01(1 - (perPage - 45) / 180),
        title: 'Heavy table or box graphics detected',
        detail:
          'Roughly ' + Math.round(perPage) + ' drawn rules and boxes per page. Content inside table cells is read cell by cell, which reorders it, and content inside a text box is frequently skipped altogether.',
        fix: 'Keep rules for visual separation if you want them, but make sure no experience, skill or date lives inside a table cell or a floating text box. Plain paragraphs parse; cells do not.',
        evidence: [],
      };
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════
   Category 2 · Contact and identity — 10 points
   ═══════════════════════════════════════════════════════════════════ */

const CONTACT_CHECKS: CheckSpec[] = [
  {
    id: 'name',
    label: 'Name detected at the top',
    weight: 22,
    severity: 'critical',
    run: ({ parsed }) =>
      parsed.contact.name !== null
        ? { ratio: 1 }
        : {
            ratio: 0,
            title: 'No name could be found at the top of the CV',
            detail:
              'The parser takes the candidate name from the first lines of page one. If it is inside a logo, an image, a text box or a header band, the record is created with a blank name field.',
            fix: 'Put your name as the first line of the document, as plain text, larger than the body but not inside a graphic.',
            evidence: sample(parsed.lines.slice(0, 3)),
          },
  },
  {
    id: 'email',
    label: 'Email address',
    weight: 26,
    severity: 'critical',
    run: ({ parsed }) =>
      parsed.contact.email !== null
        ? { ratio: 1 }
        : {
            ratio: 0,
            title: 'No email address found',
            detail: 'This is the single field a recruiter needs and the one most often lost — usually because it is in a header, an image, or written as "name [at] domain".',
            fix: 'Write it in full, in plain text, on the first page: you@example.com. No obfuscation, no icon-only link.',
            evidence: [],
          },
  },
  {
    id: 'phone',
    label: 'Phone number',
    weight: 16,
    severity: 'important',
    run: ({ parsed }) =>
      parsed.contact.phone !== null
        ? { ratio: 1 }
        : {
            ratio: 0,
            title: 'No phone number found',
            detail: 'Recruiters working a shortlist call before they write. A CV with no number is answered last.',
            fix: 'Add your number with the country code, in the contact line under your name: +880 1XXX XXXXXX.',
            evidence: [],
          },
  },
  {
    id: 'location',
    label: 'City and country',
    weight: 12,
    severity: 'important',
    run: ({ parsed }) =>
      parsed.contact.location !== null
        ? { ratio: 1 }
        : {
            ratio: 0,
            title: 'No location given',
            detail: 'Location filters run early on almost every applicant tracking system. A blank location field is excluded from a filtered search rather than shown as a maybe.',
            fix: 'Add city and country under your name — "Dhaka, Bangladesh". Never the full street address; that is a privacy risk with no upside.',
            evidence: [],
          },
  },
  {
    id: 'profile-link',
    label: 'A professional profile link',
    weight: 14,
    severity: 'polish',
    run: ({ parsed }) => {
      const links = [parsed.contact.linkedin, parsed.contact.github, parsed.contact.website].filter(Boolean);
      if (links.length > 0) return { ratio: 1, win: 'A profile link is present and readable as text.' };
      return {
        ratio: 0,
        title: 'No LinkedIn or portfolio link',
        detail: 'The overwhelming majority of recruiters check a profile before replying. Not linking it means they search for you, and find whoever shares your name.',
        fix: 'Add the full URL as text — linkedin.com/in/yourname. An icon hyperlinked to it does not survive parsing, because the parser reads text, not pictures.',
        evidence: [],
      };
    },
  },
  {
    id: 'sensitive-fields',
    label: 'No unnecessary personal data',
    weight: 10,
    severity: 'polish',
    run: ({ parsed }) => {
      if (parsed.contact.sensitive.length === 0) return { ratio: 1 };
      return {
        ratio: clamp01(1 - parsed.contact.sensitive.length / 4),
        title: `Personal details on the CV: ${parsed.contact.sensitive.join(', ')}`,
        detail:
          'Convention differs by market — this is normal on a CV in parts of South Asia, the Gulf and continental Europe, and a liability in the US, UK, Canada and Australia, where recruiters are trained to discard CVs carrying it to avoid discrimination claims.',
        fix: 'If you are applying outside your home market, delete these fields. They never help a decision, and in some places they force the file to be binned unread.',
        evidence: sample(parsed.contact.sensitive),
      };
    },
  },
  {
    id: 'department-link',
    label: 'The link this field expects first',
    weight: 12,
    severity: 'important',
    scope: 'relevance',
    run: ({ parsed, department }) => {
      // 'profile' is already covered by `profile-link` above, and 'none'
      // means the field has no such convention. Charging for either here
      // would be double-counting or inventing a standard.
      if (!department || department.link === 'none' || department.link === 'profile') {
        return { ratio: null };
      }

      const { github, website } = parsed.contact;
      const has = department.link === 'repository' ? github !== null || website !== null : website !== null;
      if (has) return { ratio: 1, win: `Your ${LINK_LABEL[department.link]} is linked as readable text.` };

      return {
        ratio: 0,
        title:
          department.link === 'portfolio'
            ? 'No portfolio link — in this field that is the first thing opened'
            : 'No repository or personal site linked',
        detail:
          department.link === 'portfolio'
            ? `A ${department.label.toLowerCase()} screener judges the work, not the description of it. Without a link there is nothing to judge, and the CV is competing on adjectives against people who attached the work.`
            : 'Technical screeners open the code before they read the bullets. A repository or a personal site is the cheapest evidence on the page.',
        fix: `Put the full URL under your name as plain text — yourname.com or github.com/you. An icon linked to it does not survive parsing, because a parser reads text, not pictures.`,
        evidence: [],
      };
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════
   Category 3 · Structure — 15 points
   ═══════════════════════════════════════════════════════════════════ */

const STRUCTURE_CHECKS: CheckSpec[] = [
  {
    id: 'core-sections',
    label: 'The sections a CV is expected to have',
    weight: 26,
    severity: 'critical',
    run: ({ parsed, seniority }) => {
      const kinds = new Set(parsed.sections.map((s) => s.kind));
      const required: { kind: string; name: string }[] = [
        { kind: 'experience', name: 'Experience' },
        { kind: 'education', name: 'Education' },
        { kind: 'skills', name: 'Skills' },
        { kind: 'summary', name: 'Summary' },
      ];
      const missing = required.filter((r) => !kinds.has(r.kind as never));
      if (missing.length === 0) return { ratio: 1, win: 'All four expected sections are present and labelled.' };

      // A student with no work history is not missing an Experience
      // section; they have not had one yet. Penalising that is nonsense.
      const excusable = seniority === 'student' ? missing.filter((m) => m.kind === 'experience').length : 0;
      const counted = missing.length - excusable;
      if (counted === 0) return { ratio: 0.9 };

      return {
        ratio: clamp01(1 - counted / 4),
        title: `Missing ${missing.map((m) => m.name).join(', ')}`,
        detail:
          'Each missing section is a field the recruiter\'s system stores as empty, and an empty field is invisible to the filters they search with.',
        fix:
          missing.some((m) => m.kind === 'summary')
            ? 'Add the missing headings. The summary matters most of the four: three lines at the top naming the role you want, your years in it, and one result. It is the only part guaranteed to be read.'
            : 'Add the missing headings as plain lines of text.',
        evidence: sample(parsed.sections.map((s) => s.heading)),
      };
    },
  },
  {
    id: 'roles-dated',
    label: 'Every role carries dates',
    weight: 22,
    severity: 'critical',
    run: ({ parsed }) => {
      if (parsed.roles.length === 0) {
        return {
          ratio: 0,
          title: 'No job entries could be identified',
          detail: 'The Experience section could not be split into roles, which usually means the titles, employers and dates are not on distinguishable lines.',
          fix: 'Give each role its own header line: Job Title — Employer — Month Year to Month Year. Then bullets underneath.',
          evidence: [],
        };
      }
      const dated = parsed.roles.filter((r) => r.dates !== null).length;
      const ratio = dated / parsed.roles.length;
      if (ratio === 1) return { ratio: 1, win: 'Every role is dated — the tenure calculation will be right.' };

      return {
        ratio,
        title: `${parsed.roles.length - dated} of ${parsed.roles.length} roles have no dates`,
        detail:
          'Tenure is computed from these dates and is one of the first things filtered on. An undated role contributes nothing to your years of experience, so the CV reads as shorter than your career.',
        fix: 'Add "Mon YYYY – Mon YYYY" to every role, and "– Present" to the current one. Use the same format for all of them.',
        evidence: sample(parsed.roles.filter((r) => r.dates === null).map((r) => r.header)),
      };
    },
  },
  {
    id: 'date-format',
    label: 'One date format throughout',
    weight: 12,
    severity: 'polish',
    run: ({ parsed }) => {
      if (parsed.dateFormats.length <= 1) return { ratio: 1 };
      return {
        ratio: clamp01(1 - (parsed.dateFormats.length - 1) / 3),
        title: `${parsed.dateFormats.length} different date formats used`,
        detail: `The file mixes ${parsed.dateFormats.join(', ')}. Parsers normalise dates by pattern, and the formats that do not match the dominant one are dropped rather than guessed.`,
        fix: 'Pick one — "Mar 2021 – Aug 2024" is unambiguous in every market, unlike 03/04/2021 — and rewrite every date to match.',
        evidence: sample(parsed.roles.map((r) => r.dates?.raw ?? '').filter(Boolean)),
      };
    },
  },
  {
    id: 'bullets-per-role',
    label: 'Bullets, and the right number of them',
    weight: 22,
    severity: 'important',
    run: ({ parsed }) => {
      if (parsed.roles.length === 0) return { ratio: 0.5 };

      const proseHeavy = parsed.roles.filter((r) => r.bullets.length === 0 && r.proseWords > 40);
      if (proseHeavy.length > 0) {
        return {
          ratio: clamp01(1 - proseHeavy.length / parsed.roles.length),
          title: `${plural(proseHeavy.length, 'role')} written as a paragraph rather than bullets`,
          detail:
            'A recruiter scans a CV before deciding to read it, and a paragraph offers nothing to scan. The achievements inside it are real; they are simply not being found in the six seconds available.',
          fix: 'Break each paragraph into three to five bullets. One achievement per bullet, verb first, number at the end.',
          evidence: sample(proseHeavy.map((r) => r.header)),
        };
      }

      const bad = parsed.roles.filter((r) => r.bullets.length > 8);
      const empty = parsed.roles.filter((r) => r.bullets.length === 0);
      if (bad.length === 0 && empty.length === 0) {
        return { ratio: 1, win: 'Each role carries a readable number of bullets.' };
      }
      if (bad.length > 0) {
        return {
          ratio: clamp01(1 - bad.length / parsed.roles.length / 2),
          title: `${plural(bad.length, 'role')} ${agreeHave(bad.length)} more than eight bullets`,
          detail: 'Past roughly the fifth bullet a reader stops. The weakest entries are diluting the strongest ones rather than adding to them.',
          fix: 'Cut each role to its best three to five bullets. The oldest roles need two, or one line each.',
          evidence: sample(bad.map((r) => r.header)),
        };
      }
      return {
        ratio: clamp01(1 - empty.length / parsed.roles.length),
        title: `${plural(empty.length, 'role')} ${agreeHave(empty.length)} no bullets at all`,
        detail: 'A job title with no content underneath tells a reader you were employed and nothing else.',
        fix: 'Give every role from the last ten years at least two bullets. Older roles can be a single line.',
        evidence: sample(empty.map((r) => r.header)),
      };
    },
  },
  {
    id: 'section-order',
    label: 'Sections in the order they are read',
    weight: 10,
    severity: 'polish',
    run: ({ parsed, seniority }) => {
      const order = parsed.sections.map((s) => s.kind);
      const experience = order.indexOf('experience');
      const education = order.indexOf('education');
      if (experience < 0 || education < 0) return { ratio: null };

      const studentLike = seniority === 'student' || seniority === 'entry';
      const correct = studentLike ? education < experience : experience < education;
      if (correct) return { ratio: 1 };

      return {
        ratio: 0.4,
        title: studentLike ? 'Education should come before Experience here' : 'Education is placed above Experience',
        detail: studentLike
          ? 'With little work history, the degree is the strongest evidence on the page and belongs where the eye lands first.'
          : 'Past a few years of work, the degree is the least interesting thing about you. It is occupying the space a recruiter reads first.',
        fix: studentLike
          ? 'Move Education directly under your summary, and keep Experience below it.'
          : 'Move Experience directly under your summary. Education drops to the bottom, one line per qualification.',
        evidence: sample(parsed.sections.map((s) => s.heading)),
      };
    },
  },
  {
    id: 'career-gaps',
    label: 'Gaps in the timeline',
    weight: 8,
    severity: 'polish',
    run: ({ parsed }) => {
      if (parsed.gaps.length === 0) return { ratio: 1 };
      const longest = parsed.gaps.reduce((a, b) => (b.months > a.months ? b : a));
      return {
        // Small deduction on purpose. A gap is a fact, not a fault; the
        // only actionable part is that an unexplained one invites a guess.
        ratio: 0.55,
        title: `${plural(parsed.gaps.length, 'gap')} of six months or more in the dates`,
        detail: `The longest runs about ${Math.round(longest.months / 12 * 10) / 10} years, from ${longest.afterYear} to ${longest.beforeYear}. Nothing is wrong with a break — but an unlabelled one gets filled in by whoever is reading, and their guess is rarely generous.`,
        fix: 'Name it in one line where it falls: "Career break — caregiving", "Full-time study", "Contract search". A labelled gap stops being a question.',
        evidence: [],
      };
    },
  },
  {
    id: 'department-section',
    label: 'The section this field expects',
    weight: 12,
    severity: 'important',
    scope: 'relevance',
    run: ({ parsed, department, seniority }) => {
      if (!department || department.section === null) return { ratio: null };

      const wanted = department.section;
      if (parsed.sections.some((s) => s.kind === wanted)) {
        return { ratio: 1, win: `Your ${wanted} section is where a ${department.label} screener looks for it.` };
      }

      // Projects earn their place while the work history is thin. Asking a
      // fifteen-year engineer for a projects section is asking them to pad.
      if (wanted === 'projects' && seniority !== 'student' && seniority !== 'entry') {
        return { ratio: null };
      }

      const COPY: Record<'certifications' | 'publications' | 'projects', { detail: string; fix: string }> = {
        certifications: {
          detail: `In ${department.label.toLowerCase()} the qualification is often a gate rather than a bonus — screeners filter on it before reading anything else, and an unlisted licence reads as an absent one.`,
          fix: 'Add a Certifications section listing each one with its issuing body and year, and put anything currently required to practise at the top.',
        },
        publications: {
          detail: 'Research CVs are read publications-first. Without the list, the work has no citable record and the CV is judged only on job titles.',
          fix: 'Add a Publications section in a consistent citation style, newest first, with your position in the author list visible.',
        },
        projects: {
          detail: 'With limited work history, projects are the only place a reader can see what you can actually do.',
          fix: 'Add a Projects section with two or three entries: what you built, what you used, and what the result was. Link each one.',
        },
      };

      return {
        ratio: 0.2,
        title: `No ${wanted} section`,
        detail: COPY[wanted].detail,
        fix: COPY[wanted].fix,
        evidence: sample(parsed.sections.map((s) => s.heading)),
      };
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════
   Category 4 · Impact — 22 points
   ═══════════════════════════════════════════════════════════════════ */

const IMPACT_CHECKS: CheckSpec[] = [
  {
    id: 'quantified',
    label: 'Bullets carrying a measurable result',
    weight: 32,
    severity: 'critical',
    run: ({ parsed }) => {
      const bullets = parsed.bullets;
      if (bullets.length === 0) {
        return {
          ratio: 0,
          title: 'No achievement bullets found',
          detail: 'Nothing in this CV states an outcome, so there is nothing for a reader to be impressed by.',
          fix: 'Under each role, write three bullets in the form: verb, what you did, what changed. "Rebuilt the checkout flow, cutting drop-off from 34% to 28%."',
          evidence: [],
        };
      }

      const quantified = bullets.filter((b) => b.quantified);
      const share = quantified.length / bullets.length;
      // Half is the working target. Every bullet carrying a number reads
      // as invented, so there is no extra credit above ~60%.
      if (share >= 0.45) {
        return { ratio: 1, win: `${quantified.length} of ${bullets.length} bullets carry a number — that is the half that gets read.` };
      }

      const without = bullets.filter((b) => !b.quantified).map((b) => b.text);
      return {
        ratio: band(share, 0, 0.45),
        title: `Only ${quantified.length} of ${bullets.length} bullets contain a measurable result`,
        detail:
          'A number is the only part of a bullet a screener treats as evidence rather than claim. Without one, "improved the reporting process" and "did nothing" are indistinguishable on paper.',
        fix:
          'Add scale, change or time to the bullets below: how many, how much, how fast, from what to what. If you genuinely cannot measure the outcome, measure the input — team size, budget, volume, frequency.',
        evidence: sample(without, 4),
      };
    },
  },
  {
    id: 'action-verbs',
    label: 'Bullets opening with an action verb',
    weight: 24,
    severity: 'important',
    run: ({ parsed }) => {
      const bullets = parsed.bullets;
      if (bullets.length === 0) return { ratio: 0 };

      const strong = bullets.filter((b) => b.startsWithAction);
      const share = strong.length / bullets.length;
      if (share >= 0.85) return { ratio: 1, win: 'Nearly every bullet opens with a verb — the CV reads as active.' };

      return {
        ratio: band(share, 0.2, 0.85),
        title: `${bullets.length - strong.length} bullets do not start with an action verb`,
        detail:
          'The first word of a bullet is the one that gets read in a scan. A noun or a hedge there wastes the position, and a gerund ("Managing…") reads as a job description rather than a thing you did.',
        fix: 'Start each one with a past-tense verb: Led, Built, Cut, Launched, Negotiated, Rebuilt. Delete the words in front of it.',
        evidence: sample(bullets.filter((b) => !b.startsWithAction).map((b) => b.text), 4),
      };
    },
  },
  {
    id: 'weak-openers',
    label: 'No duty-list phrasing',
    weight: 18,
    severity: 'important',
    run: ({ parsed }) => {
      const bullets = parsed.bullets;
      if (bullets.length === 0) return { ratio: 0.5 };

      const weak = bullets.filter((b) => b.weakOpener !== null);
      if (weak.length === 0) return { ratio: 1, win: 'No "responsible for" phrasing anywhere.' };

      return {
        ratio: clamp01(1 - (weak.length / bullets.length) * 2.2),
        title: `${plural(weak.length, 'bullet')} ${agree(weak.length, 'describe')} duties rather than results`,
        detail:
          'Phrases like "responsible for" and "worked on" describe the job that was advertised, not the person who did it. The next applicant held the same responsibilities; what separates you is what changed while you held them.',
        fix: 'Delete the phrase and start at the verb. "Responsible for managing the vendor budget" becomes "Managed a £2.4m vendor budget, cutting spend 12%".',
        evidence: sample(weak.map((b) => b.text), 4),
      };
    },
  },
  {
    id: 'bullet-length',
    label: 'Bullets short enough to scan',
    weight: 12,
    severity: 'polish',
    run: ({ parsed }) => {
      const bullets = parsed.bullets;
      if (bullets.length === 0) return { ratio: 0.5 };

      const long = bullets.filter((b) => b.words > 34);
      const stub = bullets.filter((b) => b.words < 5);
      const bad = long.length + stub.length;
      if (bad === 0) return { ratio: 1 };

      return {
        ratio: clamp01(1 - bad / bullets.length / 0.6),
        title:
          long.length >= stub.length
            ? `${plural(long.length, 'bullet')} ${agree(long.length, 'run')} past two lines`
            : `${plural(stub.length, 'bullet')} ${agreeBe(stub.length)} too short to say anything`,
        detail:
          long.length >= stub.length
            ? 'A bullet that wraps onto a third line stops being scannable and becomes a paragraph wearing a dot.'
            : 'A three-word bullet is a label. It occupies a line that could carry evidence.',
        fix:
          long.length >= stub.length
            ? 'Cut to one idea per bullet, 12 to 28 words. If two things happened, that is two bullets.'
            : 'Expand each to a full claim: what you did and what it changed.',
        evidence: sample([...long, ...stub].map((b) => b.text), 3),
      };
    },
  },
  {
    id: 'verb-variety',
    label: 'Varied verbs',
    weight: 8,
    severity: 'polish',
    run: ({ parsed }) => {
      const verbs = parsed.bullets.map((b) => b.verb).filter((v): v is string => v !== null);
      if (verbs.length < 5) return { ratio: null };

      const counts = new Map<string, number>();
      for (const verb of verbs) counts.set(verb, (counts.get(verb) ?? 0) + 1);
      const repeated = [...counts.entries()].filter(([, n]) => n >= 3);
      if (repeated.length === 0) return { ratio: 1 };

      const worst = repeated.sort((a, b) => b[1] - a[1])[0]!;
      return {
        ratio: clamp01(1 - repeated.length / 4),
        title: `"${worst[0]}" opens ${worst[1]} different bullets`,
        detail: 'Repetition flattens the CV: by the third identical opener the reader is skimming rather than reading, and the strongest bullet loses the same attention as the weakest.',
        fix: `Swap the duplicates for verbs that say something more specific than ${repeated.map(([v]) => `"${v}"`).join(', ')} — Rebuilt, Negotiated, Consolidated, Automated, Recovered, Doubled.`,
        evidence: sample(parsed.bullets.filter((b) => b.verb === worst[0]).map((b) => b.text), 3),
      };
    },
  },
  {
    id: 'leadership-signal',
    label: 'Scope appropriate to the level',
    weight: 6,
    severity: 'polish',
    run: ({ parsed, seniority }) => {
      if (seniority !== 'senior' && seniority !== 'executive') return { ratio: null };
      const groups = new Set(parsed.bullets.map((b) => b.verbGroup).filter(Boolean));
      if (groups.has('leadership')) return { ratio: 1 };

      return {
        ratio: 0.3,
        title: 'No bullet shows leadership or ownership',
        detail: `The dates put you at ${Math.floor(parsed.experienceMonths / 12)}+ years, but every bullet is written from an individual contributor's point of view. At this level a reader is looking for what you were accountable for, not only what you produced.`,
        fix: 'Rewrite two or three bullets around scope: people led, budget owned, decisions made, systems you were the accountable owner of.',
        evidence: [],
      };
    },
  },
  {
    id: 'department-evidence',
    label: 'Results stated in this field’s own terms',
    weight: 14,
    severity: 'critical',
    scope: 'relevance',
    run: ({ parsed, department }) => {
      if (!department || department.outcomeWords.length === 0) return { ratio: null };
      if (parsed.bullets.length === 0) return { ratio: 0.5 };

      // A number alone is not evidence here — "12 years" is a number. It
      // has to be attached to something this field actually measures.
      const relevant = parsed.bullets.filter((bullet) => {
        if (!bullet.quantified) return false;
        const lower = bullet.text.toLowerCase();
        return department.outcomeWords.some((word) => lower.includes(word));
      });

      if (relevant.length >= 3) {
        return {
          ratio: 1,
          win: `${relevant.length} bullets carry the kind of result a ${department.label} screener is scanning for.`,
        };
      }

      return {
        ratio: band(relevant.length, 0, 3),
        title:
          relevant.length === 0
            ? `Nothing measured in the terms ${department.label.toLowerCase()} is judged on`
            : `Only ${plural(relevant.length, 'bullet')} states a result this field recognises`,
        detail: `Screeners in this field scan for a specific vocabulary — ${department.outcomeWords
          .slice(0, 6)
          .join(', ')} — and skip past achievements phrased outside it. Your bullets may describe real results without using any of those words, in which case the work is invisible rather than absent.`,
        fix: `Rewrite two or three bullets so the outcome is named the way this field names it. For example: ${department.outcomeExample}.`,
        evidence: sample(
          parsed.bullets.filter((b) => !relevant.includes(b)).map((b) => b.text),
          3,
        ),
      };
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════
   Category 5 · Keywords and skills — 15 points
   ═══════════════════════════════════════════════════════════════════ */

const KEYWORD_CHECKS: CheckSpec[] = [
  {
    id: 'jd-coverage',
    label: 'Coverage of the job advert',
    weight: 45,
    severity: 'critical',
    run: ({ keywords, options }) => {
      if (keywords === null || keywords.length === 0) {
        // The user declined to paste an advert. That is not a defect in
        // the CV, and it is not a pass either — there is nothing here to
        // measure, so the check leaves the denominator entirely.
        return { ratio: null };
      }
      const matched = keywords.filter((k) => k.inResume);
      const coverage = matched.length / keywords.length;
      if (coverage >= 0.7) {
        return { ratio: 1, win: `${matched.length} of ${keywords.length} terms from the advert already appear in your CV.` };
      }

      const missing = keywords.filter((k) => !k.inResume);
      return {
        ratio: band(coverage, 0.15, 0.7),
        title: `Your CV never mentions ${plural(missing.length, 'term')} the advert repeats`,
        detail:
          `The advert${options.targetRole ? ` for ${options.targetRole}` : ''} uses these words as its own shorthand for the requirements. A screener searching the shortlist searches with them, in the advert's spelling, not yours.`,
        fix:
          'Work the ones you genuinely meet into the bullets that prove them, in the advert\'s exact wording — if it says "TypeScript", do not write "TS". Never list a term you cannot answer a question about.',
        evidence: sample(missing.map((k) => k.term), 8),
      };
    },
  },
  {
    id: 'skills-listed',
    label: 'A usable skills list',
    weight: 30,
    severity: 'important',
    // Completeness of the document, not fit to a target: a thin skills
    // list is a defect whether or not a field has been chosen.
    scope: 'quality',
    run: ({ parsed }) => {
      const count = parsed.skills.length;
      if (count >= 8 && count <= 40) return { ratio: 1, win: `${count} skills listed — enough to match against without reading as a keyword dump.` };
      if (count === 0) {
        return {
          ratio: 0,
          title: 'No skills could be extracted',
          detail: 'Skills are the field recruiters filter on most. With none parsed, the CV is excluded from every filtered search regardless of what the bullets say.',
          fix: 'Add a Skills section listing 10 to 20 concrete, checkable things — tools, systems, methods, languages. Not "communication"; that is not filterable.',
          evidence: [],
        };
      }
      if (count > 40) {
        return {
          ratio: 0.5,
          title: `${count} skills listed`,
          detail: 'Past about thirty entries the list reads as everything the candidate has heard of, and a reader stops treating any single item as a claim.',
          fix: 'Cut to the 15 or 20 you would be comfortable being interviewed on. Group them: Languages, Frameworks, Tools, Methods.',
          evidence: sample(parsed.skills.slice(0, 8)),
        };
      }
      return {
        ratio: band(count, 0, 8),
        title: `Only ${plural(count, 'skill')} listed`,
        detail: 'A short skills list gives the filters very little surface to match on, and most recruiter searches are filter-first.',
        fix: 'Expand to 10–20 specific, checkable items. Read your own bullets and pull out the tools and methods already proved there.',
        evidence: sample(parsed.skills),
      };
    },
  },
  {
    id: 'headline-matches-role',
    label: 'Headline names the target role',
    weight: 15,
    severity: 'important',
    run: ({ parsed, options }) => {
      const target = options.targetRole.trim().toLowerCase();
      if (target.length < 3) return { ratio: null };

      const top = `${parsed.contact.headline ?? ''} ${parsed.sections.find((s) => s.kind === 'summary')?.text ?? ''}`.toLowerCase();
      const words = target.split(/\s+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w));
      const hit = words.filter((w) => top.includes(w)).length;
      const share = words.length === 0 ? 1 : hit / words.length;
      if (share >= 0.6) return { ratio: 1, win: 'Your headline names the role you are applying for.' };

      return {
        ratio: band(share, 0, 0.6),
        title: `The top of your CV does not say "${options.targetRole.trim()}"`,
        detail:
          'The first two seconds are spent deciding whether this is a CV for the advertised job. A headline naming your current title, or no headline at all, makes that a guess.',
        fix: `Put "${options.targetRole.trim()}" directly under your name, and open the summary with it.`,
        evidence: sample([parsed.contact.headline ?? '(no headline line found)']),
      };
    },
  },
  {
    id: 'weak-skill-claims',
    label: 'Skills claimed without hedging',
    weight: 10,
    severity: 'polish',
    // A hedged claim is weak writing, independent of the target.
    scope: 'quality',
    run: ({ parsed }) => {
      const hedged = parsed.lines.filter((l) =>
        /\b(familiar with|exposure to|basic understanding|working knowledge|some experience with)\b/i.test(l),
      );
      if (hedged.length === 0) return { ratio: 1 };
      return {
        ratio: clamp01(1 - hedged.length / 5),
        title: `${plural(hedged.length, 'skill claim')} ${agreeBe(hedged.length)} hedged`,
        detail: '"Familiar with Kubernetes" reads as "cannot use Kubernetes". The hedge is honest, but it spends a line to disqualify itself.',
        fix: 'Either claim it plainly and be ready for the question, or cut it and give the line to something you can defend.',
        evidence: sample(hedged, 3),
      };
    },
  },
  {
    id: 'department-skills',
    label: 'Skills this field is filtered on',
    weight: 25,
    severity: 'important',
    run: ({ parsed, department }) => {
      if (!department || department.coreSkills.length === 0) return { ratio: null };

      const haystack = haystackOf(parsed);
      const found = department.coreSkills.filter((skill) => mentions(haystack, skill));
      const share = found.length / department.coreSkills.length;

      // A third of the list is a well-covered CV. Nobody holds all of
      // them, and demanding more would reward keyword stuffing over work.
      if (share >= 0.3) {
        return {
          ratio: 1,
          win: `${found.length} of the terms a ${department.label} recruiter searches on are already in your CV.`,
        };
      }

      const missing = department.coreSkills.filter((skill) => !found.includes(skill));
      return {
        ratio: band(share, 0, 0.3),
        title: `Your CV names ${found.length} of the ${department.coreSkills.length} skills this field is filtered on`,
        detail:
          'Recruiter searches in this field run on a small, predictable vocabulary. A CV that never writes those words down is excluded from the result set before anyone judges the work behind it.',
        fix: `Add the ones you genuinely use — to the Skills section, and inside the bullet that proves each. Commonly searched here: ${missing
          .slice(0, 10)
          .join(', ')}.`,
        evidence: [],
      };
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════
   Category 6 · Language — 8 points
   ═══════════════════════════════════════════════════════════════════ */

const LANGUAGE_CHECKS: CheckSpec[] = [
  {
    id: 'first-person',
    label: 'No first person',
    weight: 22,
    severity: 'important',
    run: ({ parsed }) => {
      const offenders = parsed.bullets.filter((b) => b.firstPerson);
      if (offenders.length === 0) return { ratio: 1 };
      return {
        ratio: clamp01(1 - offenders.length / Math.max(4, parsed.bullets.length / 3)),
        title: `${plural(offenders.length, 'bullet')} written in the first person`,
        detail: 'CV convention drops the pronoun in every market. "I led the migration" costs a word and reads as a cover letter that wandered in.',
        fix: 'Delete "I", "my" and "we". "I was responsible for leading the team" becomes "Led the team".',
        evidence: sample(offenders.map((b) => b.text), 3),
      };
    },
  },
  {
    id: 'cliches',
    label: 'No filler claims',
    weight: 24,
    severity: 'important',
    run: ({ parsed }) => {
      const found = new Set<string>();
      for (const bullet of parsed.bullets) for (const c of bullet.cliches) found.add(c);

      const summary = parsed.sections.find((s) => s.kind === 'summary')?.text.toLowerCase() ?? '';
      for (const cliche of ['team player', 'hard worker', 'detail-oriented', 'results-driven', 'self-motivated', 'proven track record', 'passionate about', 'excellent communication skills']) {
        if (summary.includes(cliche)) found.add(cliche);
      }

      if (found.size === 0) return { ratio: 1, win: 'No filler claims — every line asserts something checkable.' };
      return {
        ratio: clamp01(1 - found.size / 5),
        title: `${plural(found.size, 'unprovable claim')} on the CV`,
        detail: `Phrases like "${[...found].slice(0, 2).join('" and "')}" appear on nearly every CV in the pile, which is exactly why they carry no information. They cost the reader's attention and return nothing.`,
        fix: 'Replace each with the evidence you would have given if asked to prove it. "Team player" becomes "Coordinated three teams across two time zones to ship on a fixed date".',
        evidence: sample([...found], 4),
      };
    },
  },
  {
    id: 'tense-consistency',
    label: 'Consistent tense',
    weight: 20,
    severity: 'polish',
    run: ({ parsed }) => {
      const currentRole = parsed.roles.find((r) => r.dates?.current === true);
      const pastRoles = parsed.roles.filter((r) => r.dates !== null && r.dates.current === false);

      const pastInPresent = pastRoles.flatMap((r) => r.bullets.filter((b) => b.tense === 'present'));
      const mixedCurrent =
        currentRole !== undefined &&
        currentRole.bullets.some((b) => b.tense === 'past') &&
        currentRole.bullets.some((b) => b.tense === 'present');

      if (pastInPresent.length === 0 && !mixedCurrent) return { ratio: 1 };

      const total = Math.max(1, parsed.bullets.length);
      return {
        ratio: clamp01(1 - (pastInPresent.length + (mixedCurrent ? 2 : 0)) / total / 0.5),
        title: mixedCurrent && pastInPresent.length === 0
          ? 'Your current role mixes past and present tense'
          : `${plural(pastInPresent.length, 'bullet')} in a finished role ${agreeBe(pastInPresent.length)} written in the present tense`,
        detail: 'The convention is present tense for the job you hold and past tense for every job you have left. Mixing them makes it unclear which roles are current.',
        fix: 'Past roles: "Led", "Built", "Delivered". Current role: "Lead", "Build", "Deliver" — and keep it consistent within the role.',
        evidence: sample(pastInPresent.map((b) => b.text), 3),
      };
    },
  },
  {
    id: 'hedge-words',
    label: 'Few vague qualifiers',
    weight: 16,
    severity: 'polish',
    run: ({ parsed }) => {
      const hedgy = parsed.bullets.filter((b) => b.hedges.length > 0);
      if (hedgy.length === 0) return { ratio: 1 };
      const words = [...new Set(hedgy.flatMap((b) => b.hedges))];
      return {
        ratio: clamp01(1 - hedgy.length / Math.max(6, parsed.bullets.length) / 0.5),
        title: `Vague qualifiers in ${plural(hedgy.length, 'bullet')}`,
        detail: `Words like "${words.slice(0, 3).join('", "')}" are doing the work a number should be doing. "Significantly reduced costs" is weaker than "Cut costs 18%", and longer.`,
        fix: 'Delete the qualifier and put the figure in its place. If there is no figure, the claim was never as strong as the adverb implied.',
        evidence: sample(hedgy.map((b) => b.text), 3),
      };
    },
  },
  {
    id: 'caps-abuse',
    label: 'No shouting',
    weight: 10,
    severity: 'polish',
    run: ({ parsed }) => {
      const shouty = parsed.lines.filter(
        (l) => l.length > 30 && l === l.toUpperCase() && /[A-Z]{4,}/.test(l),
      );
      if (shouty.length <= 1) return { ratio: 1 };
      return {
        ratio: clamp01(1 - shouty.length / 8),
        title: `${plural(shouty.length, 'line')} set entirely in capitals`,
        detail: 'Capitals are fine for a heading and unreadable for a sentence — they remove the word shapes a reader scans by, which measurably slows reading.',
        fix: 'Keep capitals for section headings only. Sentence case everywhere else.',
        evidence: sample(shouty, 2),
      };
    },
  },
  {
    id: 'bullet-punctuation',
    label: 'Consistent bullet punctuation',
    weight: 8,
    severity: 'polish',
    run: ({ parsed }) => {
      const bullets = parsed.bullets;
      if (bullets.length < 4) return { ratio: null };
      const withStop = bullets.filter((b) => /[.;]$/.test(b.text.trim())).length;
      const share = withStop / bullets.length;
      if (share <= 0.15 || share >= 0.85) return { ratio: 1 };
      return {
        ratio: 0.5,
        title: 'Bullets end inconsistently — some with a full stop, some without',
        detail: `${withStop} of ${bullets.length} end in punctuation. It is a small thing that a detail-conscious reader notices, and this is a document whose entire purpose is to look considered.`,
        fix: 'Pick one and apply it to every bullet. No full stop is the more common convention when bullets are not full sentences.',
        evidence: [],
      };
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════
   Category 7 · Length — 5 points
   ═══════════════════════════════════════════════════════════════════ */

const LENGTH_CHECKS: CheckSpec[] = [
  {
    id: 'word-count',
    label: 'Length for the career stage',
    weight: 55,
    severity: 'important',
    run: ({ parsed, seniority }) => {
      const band_ = LENGTH_BANDS[seniority];
      const [min, max] = band_.words;
      const words = parsed.words;
      if (words >= min && words <= max) return { ratio: 1, win: `${words} words — inside the range for this career stage.` };

      const short = words < min;
      return {
        ratio: short ? band(words, min * 0.4, min) : clamp01(1 - (words - max) / max),
        title: short ? `${words} words is thin for this stage` : `${words} words is long for this stage`,
        detail: short
          ? `The expected range is ${min}–${max}. A CV this short usually means the roles are listed but the achievements under them are not.`
          : `The expected range is ${min}–${max}. Length past that is almost always old roles kept at full detail, or duties written out that a reader assumes anyway.`,
        fix: short
          ? 'Add two or three achievement bullets to each recent role. Depth on the last two jobs beats breadth across eight.'
          : 'Cut the oldest roles to one line each and delete any bullet that describes a duty rather than a result. ' + band_.note,
        evidence: [],
      };
    },
  },
  {
    id: 'page-count',
    label: 'Page count',
    weight: 30,
    severity: 'important',
    run: ({ doc, seniority }) => {
      const band_ = LENGTH_BANDS[seniority];
      const pages = doc.pages.length;
      if (pages <= band_.pages[1]) return { ratio: 1 };
      return {
        ratio: clamp01(1 - (pages - band_.pages[1]) / 3),
        title: `${plural(pages, 'page')} — ${band_.pages[1]} is the expectation here`,
        detail: band_.note,
        fix: 'Cut from the bottom: oldest roles first, then duties, then anything that is not evidence. Shrinking the font instead is visible and counts against you.',
        evidence: [],
      };
    },
  },
  {
    id: 'density',
    label: 'Words per page',
    weight: 15,
    severity: 'polish',
    run: ({ parsed, doc }) => {
      const perPage = parsed.words / Math.max(1, doc.pages.length);
      if (perPage >= 260 && perPage <= 700) return { ratio: 1 };
      const sparse = perPage < 260;
      return {
        ratio: sparse ? band(perPage, 90, 260) : clamp01(1 - (perPage - 700) / 400),
        title: sparse ? `About ${Math.round(perPage)} words per page — the pages are mostly empty` : `About ${Math.round(perPage)} words per page — the pages are crowded`,
        detail: sparse
          ? 'Large type and wide spacing padding a thin CV to length is a recognisable pattern, and it reads as having little to say.'
          : 'Dense pages with narrow margins get skimmed rather than read, and the strongest lines are lost in the mass.',
        fix: sparse
          ? 'Add substance rather than spacing: two more achievement bullets per role, at 10–11pt with normal margins.'
          : 'Cut content rather than margins. Anything below 10pt or under 1.5cm margins reads as a CV that would not fit.',
        evidence: [],
      };
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════
   The categories
   ═══════════════════════════════════════════════════════════════════ */

const CATEGORIES: CategorySpec[] = [
  {
    id: 'parse',
    label: 'ATS parse safety',
    description: 'Whether the software between you and the recruiter can read the file at all.',
    weight: 25,
    scope: 'quality',
    checks: PARSE_CHECKS,
  },
  {
    id: 'contact',
    label: 'Contact & identity',
    description: 'The fields a recruiter needs to act, and whether they survive parsing.',
    weight: 10,
    scope: 'quality',
    checks: CONTACT_CHECKS,
  },
  {
    id: 'structure',
    label: 'Structure & sections',
    description: 'Whether the document is organised the way a screener and a parser both expect.',
    weight: 15,
    scope: 'quality',
    checks: STRUCTURE_CHECKS,
  },
  {
    id: 'impact',
    label: 'Impact & evidence',
    description: 'Whether the bullets prove anything, or only describe the job.',
    weight: 22,
    scope: 'quality',
    checks: IMPACT_CHECKS,
  },
  {
    id: 'keywords',
    label: 'Keywords & skills',
    description: 'How well the CV matches what is being searched for.',
    weight: 15,
    scope: 'relevance',
    checks: KEYWORD_CHECKS,
  },
  {
    id: 'language',
    label: 'Language & polish',
    description: 'The wording habits that make a CV read as considered or careless.',
    weight: 8,
    scope: 'quality',
    checks: LANGUAGE_CHECKS,
  },
  {
    id: 'length',
    label: 'Length & density',
    description: 'Whether the document is the size a reader expects for this career stage.',
    weight: 5,
    scope: 'quality',
    checks: LENGTH_CHECKS,
  },
];

/**
 * How many named checks run. Derived rather than written down, so the
 * number quoted in the UI and on the marketing copy cannot drift away
 * from the number actually executed.
 */
export const TOTAL_CHECKS = CATEGORIES.reduce((sum, c) => sum + c.checks.length, 0);

/* ═══════════════════════════════════════════════════════════════════
   Grades
   ═══════════════════════════════════════════════════════════════════ */

const GRADE_BANDS: { min: number; grade: Grade; verdict: string }[] = [
  { min: 90, grade: 'A+', verdict: 'This CV is ready to send. What is left is preference, not correctness.' },
  { min: 80, grade: 'A',  verdict: 'Strong. Fix the handful of items below and this competes on content alone.' },
  { min: 68, grade: 'B',  verdict: 'Solid structure, unfinished evidence. The fixes below are an afternoon of work with a real effect.' },
  { min: 55, grade: 'C',  verdict: 'Readable, but it is describing a job rather than making a case. Start with the critical items.' },
  { min: 40, grade: 'D',  verdict: 'Something structural is costing you applications before anyone reads the words. Fix the critical items first.' },
  { min: 0,  grade: 'F',  verdict: 'This file is unlikely to survive the first automated screen. The critical items below are not optional.' },
];

function gradeFor(score: number): { grade: Grade; verdict: string } {
  const band_ = GRADE_BANDS.find((b) => score >= b.min) ?? GRADE_BANDS[GRADE_BANDS.length - 1]!;
  return { grade: band_.grade, verdict: band_.verdict };
}

/* ═══════════════════════════════════════════════════════════════════
   Scoring
   ═══════════════════════════════════════════════════════════════════ */

export function scoreResume(
  parsed: ParsedResume,
  doc: PdfExtraction,
  options: ScoreOptions = DEFAULT_SCORE_OPTIONS,
): ResumeReport {
  const seniority: Seniority = options.seniority === 'auto' ? parsed.seniority : options.seniority;

  const keywords = options.jobAd.trim().length >= 40 ? extractKeywords(options.jobAd, parsed.text) : null;
  const department = getDepartment(options.department || undefined);

  const ctx: Context = { parsed, doc, options, seniority, keywords, department };

  const categories: CategoryResult[] = [];
  const findings: Finding[] = [];
  const wins: string[] = [];

  /* Each check contributes to exactly one of the two headline numbers.
     Buckets are filled here and divided at the end, so a check that did
     not apply never reaches either denominator. */
  const bucket: Record<ScoreScope, { earned: number; max: number }> = {
    quality: { earned: 0, max: 0 },
    relevance: { earned: 0, max: 0 },
  };

  for (const spec of CATEGORIES) {
    const outcomes: CheckOutcome[] = [];

    // Run first, so the applicable weight is known before anything is
    // divided by it.
    const results = spec.checks.map((check) => {
      let report: CheckReport;
      try {
        report = check.run(ctx);
      } catch {
        // A single broken rule must never take down the report. Treat it
        // as unmeasurable rather than as a failure the user cannot act on.
        report = { ratio: null };
      }
      return { check, report };
    });

    const applicable = results.filter((r) => r.report.ratio !== null);
    /** Applicable weight — drives the category's own displayed score. */
    const available = applicable.reduce((sum, r) => sum + r.check.weight, 0);
    /**
     * Total weight — drives each check's share of the headline scores.
     *
     * Deliberately not the applicable weight. Renormalising over what
     * happened to apply makes every remaining check heavier, so choosing
     * a department would nudge the *quality* score simply by changing
     * which fit checks ran. Fixed shares keep quality a property of the
     * document and nothing else; the weight of a check that did not run
     * is just unused.
     */
    const total = spec.checks.reduce((sum, c) => sum + c.weight, 0);
    let earned = 0;

    for (const { check, report } of results) {
      if (report.ratio === null) {
        outcomes.push({
          id: check.id,
          label: check.label,
          ratio: 1,
          // Zero weight is how the UI knows this one did not apply.
          weight: 0,
          severity: check.severity,
          finding: null,
        });
        continue;
      }

      const ratio = clamp01(report.ratio);
      earned += ratio * check.weight;

      // This check's fixed share of the category, times the category's weight.
      const share = total === 0 ? 0 : (check.weight / total) * spec.weight;
      const scope = check.scope ?? spec.scope;
      bucket[scope].earned += ratio * share;
      bucket[scope].max += share;

      const hasFinding = ratio < 0.999 && report.title !== undefined;
      // What this check costs on the 0–100 scale.
      const pointsLost = (1 - ratio) * share;

      outcomes.push({
        id: check.id,
        label: check.label,
        ratio,
        weight: check.weight,
        severity: check.severity,
        finding: hasFinding
          ? {
              severity: check.severity,
              title: report.title!,
              detail: report.detail ?? '',
              fix: report.fix ?? '',
              evidence: report.evidence ?? [],
            }
          : null,
      });

      if (hasFinding) {
        findings.push({
          id: `${spec.id}.${check.id}`,
          category: spec.id,
          severity: check.severity,
          title: report.title!,
          detail: report.detail ?? '',
          fix: report.fix ?? '',
          evidence: report.evidence ?? [],
          pointsLost: Math.round(pointsLost * 10) / 10,
        });
      } else if (report.win !== undefined) {
        wins.push(report.win);
      }
    }

    const score = available === 0 ? 100 : (earned / available) * 100;
    categories.push({
      id: spec.id,
      label: spec.label,
      description: spec.description,
      score: Math.round(score),
      weight: spec.weight,
      points: Math.round((score / 100) * spec.weight * 10) / 10,
      maxPoints: spec.weight,
      scope: spec.scope,
      checks: outcomes,
    });
  }

  /* ── Two roll-ups, not one ───────────────────────────────────────
     A CV can be excellent and still be the wrong CV for the job. Rolled
     into a single number those two facts cancel out, and the candidate
     is left unable to tell whether to rewrite the document or apply
     somewhere else — which are opposite actions. So quality and fit are
     computed separately and shown separately.

     Quality is deliberately department-independent: changing the field
     must move the fit number and leave the document's own quality
     exactly where it was.                                            */

  let overall = bucket.quality.max === 0 ? 0 : (bucket.quality.earned / bucket.quality.max) * 100;

  const parseCategory = categories.find((c) => c.id === 'parse');
  if (parseCategory) {
    // A CV a machine cannot read does not get to average its way to a
    // pass on the strength of its wording.
    if (parseCategory.score < 25) overall = Math.min(overall, 28);
    else if (parseCategory.score < 50) overall = Math.min(overall, 48);
    else if (parseCategory.score < 70) overall = Math.min(overall, 68);
  }

  const score = Math.max(0, Math.min(100, Math.round(overall)));
  const { grade, verdict } = gradeFor(score);

  /* Relevance is only meaningful against something. With neither a
     department nor an advert every relevance check returns null, the
     bucket stays empty, and the number is absent rather than invented. */
  const relevance =
    bucket.relevance.max === 0
      ? null
      : Math.max(0, Math.min(100, Math.round((bucket.relevance.earned / bucket.relevance.max) * 100)));

  const relevanceLabel = keywords !== null ? 'Job match' : 'Field match';
  const relevanceVerdict =
    relevance === null
      ? 'Pick a department, or paste the advert, to measure fit.'
      : relevance >= 80
        ? `Strongly aligned${department ? ` with ${department.label.toLowerCase()}` : ''} — the vocabulary a screener searches for is already here.`
        : relevance >= 60
          ? 'Recognisable as a fit, with terms missing that you probably qualify for. See the findings below.'
          : relevance >= 40
            ? 'Reads as adjacent rather than aimed. The CV needs the field’s own words for the work you have already done.'
            : 'This CV is not currently written for this target. That is a rewrite of the wording, not necessarily of the career.';

  /* ── Order the findings: what costs most, first ── */
  const severityRank: Record<Severity, number> = { critical: 0, important: 1, polish: 2 };
  findings.sort(
    (a, b) => severityRank[a.severity] - severityRank[b.severity] || b.pointsLost - a.pointsLost,
  );

  const stats: ResumeStats = {
    pages: doc.pages.length,
    words: parsed.words,
    bullets: parsed.bullets.length,
    roles: parsed.roles.length,
    quantifiedBullets: parsed.bullets.filter((b) => b.quantified).length,
    actionBullets: parsed.bullets.filter((b) => b.startsWithAction).length,
    skills: parsed.skills.length,
    readingSeconds: Math.round(parsed.words / 3.3),
    fileKb: Math.round(doc.bytes / 1024),
    columns: Math.max(1, ...doc.pages.map((p) => p.columns)),
    images: doc.pages.reduce((sum, p) => sum + p.images, 0),
    unmappedGlyphs: doc.unmappedGlyphs,
    invisibleRuns: doc.runs.filter((r) => r.invisible && r.text.trim().length > 2).length,
  };

  return {
    score,
    grade,
    relevance,
    relevanceGrade: relevance === null ? null : gradeFor(relevance).grade,
    relevanceLabel,
    verdict,
    relevanceVerdict,
    categories,
    findings,
    wins,
    stats,
    keywords,
    keywordCoverage:
      keywords === null || keywords.length === 0
        ? null
        : Math.round((keywords.filter((k) => k.inResume).length / keywords.length) * 100),
    parsed,
    atsText: doc.atsText,
    document: doc,
  };
}

/** The band descriptions, exposed so the UI can explain the score. */
export { GRADE_BANDS, LENGTH_BANDS };
