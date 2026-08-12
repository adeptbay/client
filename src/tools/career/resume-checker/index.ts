/**
 * ⚠ DEMO CONTENT — this tool is not built yet.
 *
 * The permanent decisions are the URL and the neighbourhood:
 * `/career/resume-checker`, cluster `career-documents`, sitting
 * beside the CV / Resume Builder so the two link to each other for
 * free (see `src/core/related.ts`).
 *
 * The copy, the option set and `run()` are placeholder. `status` stays
 * 'draft' until they are rewritten — a scoring tool that ships a made-up
 * score is worse than no tool.
 */

import { defineTool } from '@core/tool';

interface Options {
  targetRole: string;
  jobAd: string;
  seniority: 'entry' | 'mid' | 'senior';
}

const EXPECTED_WORDS = {
  entry: { min: 250, max: 500, note: 'One page is right at this stage.' },
  mid: { min: 400, max: 800, note: 'One page, two at a push.' },
  senior: { min: 600, max: 1100, note: 'Two pages is normal above ten years.' },
} as const;

const SECTIONS = ['summary', 'experience', 'education', 'skills'];

export default defineTool<string, Options>({
  slug: 'resume-checker',
  category: 'career',
  cluster: 'career-documents',

  name: 'CV / Resume Checker',
  tagline: 'Paste your CV and see what a parser sees — missing sections, weak bullets, keyword gaps and length, scored.',
  titleBenefit: 'ATS Score in Seconds',
  description:
    'Check a CV or résumé before you send it. Scores the sections, length, contact details and keyword match against the job ad — in your browser, no upload.',
  keywords: [
    'resume checker',
    'ats resume checker',
    'cv checker',
    'resume score',
    'check my resume',
  ],

  runtime: 'client',
  status: 'draft', // ← flip to 'live' once the copy and run() below are real
  premium: false,
  apiEnabled: false,

  score: { demand: 7, evergreen: 9, serp: 5, money: 9, ease: 6 },

  input: {
    type: 'text',
    label: 'Paste your CV or résumé',
    placeholder: 'Paste the text of your CV — not the PDF, the text inside it…',
    mono: false,
    rows: 14,
    sample: `Ayesha Rahman
Front-end Developer — Dhaka, Bangladesh
ayesha@example.com · +880 1700 000000

SUMMARY
Front-end developer with four years building checkout and dashboard
interfaces for e-commerce teams.

EXPERIENCE
Front-end Developer — ShopBase — 2023 to now
· Rebuilt the checkout flow, cutting drop-off from 34% to 28%
· Responsible for the component library

EDUCATION
BSc in Computer Science — University of Dhaka — 2021

SKILLS
TypeScript, React, Next.js, PostgreSQL, Figma`,
  },

  options: [
    {
      key: 'targetRole',
      type: 'text',
      label: 'Role you are applying for',
      default: '',
      placeholder: 'Front-end Developer',
      help: 'Used to check the headline matches the job, which is the first thing a screener looks for.',
    },
    {
      key: 'jobAd',
      type: 'textarea',
      label: 'Paste the job advert (optional)',
      default: '',
      rows: 6,
      wide: true,
      placeholder: 'Paste the requirements section to see which of its terms your CV never mentions.',
      help: 'Nothing here is uploaded. The comparison runs in this tab.',
    },
    {
      key: 'seniority',
      type: 'enum',
      label: 'Career stage',
      default: 'mid',
      values: [
        { value: 'entry', label: 'Entry — under 3 years' },
        { value: 'mid', label: 'Mid — 3 to 10 years' },
        { value: 'senior', label: 'Senior — 10 years or more' },
      ],
      help: 'Sets the expected length. A senior CV is not a long junior CV.',
    },
  ],

  output: { type: 'stats' },

  howTo: [
    {
      title: 'Paste the text, not the file',
      detail:
        'Open your PDF, select all and copy. If large parts refuse to select, that is the finding — a parser cannot read them either, because they are an image or sit inside a text box.',
    },
    {
      title: 'Name the role you are applying for',
      detail:
        'The check compares your headline against it. A CV whose headline names your current job rather than the one advertised loses the screener in the first two seconds.',
    },
    {
      title: 'Paste the job advert as well',
      detail:
        'That turns a generic score into a specific one: which terms the advert repeats that your CV never mentions once.',
    },
    {
      title: 'Fix the parsing failures before the wording',
      detail:
        'A missing phone number or an unreadable Experience heading costs you the application outright. Weak verbs only cost you the read.',
    },
  ],

  faq: [
    {
      q: 'What does an ATS actually reject?',
      a: 'Almost nothing, on its own. An applicant tracking system parses your CV into fields and ranks it; a human filters the list. Most damage is done at the parsing step — a two-column layout, a header image or a table can lose whole sections before anyone reads them.',
    },
    {
      q: 'Will this tool rewrite my CV for me?',
      a: 'No. It reports what is missing, what is unreadable and which terms from the job advert never appear, then leaves the writing to you. A rewritten CV that does not match how you actually speak fails at the interview instead of the screen.',
    },
    {
      q: 'How many keywords from the job advert should my CV contain?',
      a: 'Cover the requirements you genuinely meet, in the advert’s own words — if it says "TypeScript" do not write "TS". Stuffing every term is visible to a reader and pointless to a parser, which counts context, not repetition.',
    },
    {
      q: 'Is my CV uploaded when I check it?',
      a: 'No. The text stays in this browser tab, which matters here more than on most tools — a CV holds your phone number, address and work history. Nothing is sent, stored or logged.',
    },
    {
      q: 'What score should I aim for?',
      a: 'Anything above the structural checks passing. A score is a summary of specific problems: sections a parser cannot find, missing contact details, length far outside the norm for your stage. Fix the named problems and the number follows.',
    },
  ],

  infoGain: {
    summary:
      'Most CV scorers return a percentage and sell you the explanation. This one is planned to report only findings you can act on — the sections a parser could not locate, the contact fields that are missing, the length against the norm for your career stage, and the terms the job advert repeats that your CV never uses.',
    supports: [
      'Planned: section detection — summary, experience, education, skills',
      'Planned: contact-field check for email, phone and location',
      'Planned: length against the norm for entry, mid and senior CVs',
      'Planned: keyword gap against a pasted job advert',
      'Planned: weak-bullet detection — bullets with no verb and no number',
    ],
    limits: [
      'Not built yet. This page is a placeholder while the checker is written, and the numbers below are a rough demo, not a score.',
      'It reads text, not PDFs. A CV whose text cannot be selected is exactly the CV a parser fails on, and that is worth knowing before you send it.',
      'No tool can tell you whether you will get the interview. It can only tell you whether the document is readable and relevant.',
      'English only at first. Section headings in other languages will not be detected.',
    ],
  },

  related: [
    'resume-builder',
    'readability-checker',
    'word-counter',
    'character-frequency-counter',
    'text-diff',
    'find-and-replace',
    'remove-extra-spaces',
    'case-converter',
  ],
  nextSteps: ['resume-builder', 'readability-checker', 'word-counter'],

  added: '2026-08-12',
  updated: '2026-08-12',

  run: (input, options) => {
    // Placeholder heuristics. The real scoring model belongs in an
    // engine once the checks are agreed — not in this file.
    const text = input.trim();
    const lower = text.toLowerCase();
    const words = text.split(/\s+/).filter(Boolean).length;

    const found = SECTIONS.filter((s) => lower.includes(s));
    const hasEmail = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(text);
    const hasPhone = /(\+?\d[\d\s-]{7,})/.test(text);
    const expected = EXPECTED_WORDS[options.seniority];

    const adTerms = options.jobAd
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/)
      .filter((w) => w.length > 3);
    const missing = [...new Set(adTerms)].filter((w) => !lower.includes(w));

    return {
      stats: [
        { label: 'Sections found', value: `${found.length} of ${SECTIONS.length}`, hint: found.join(', ') || 'none detected', primary: true },
        { label: 'Words', value: words, hint: `${expected.min}–${expected.max} expected`, primary: true },
        { label: 'Contact details', value: hasEmail && hasPhone ? 'Email + phone' : hasEmail ? 'Email only' : hasPhone ? 'Phone only' : 'Missing', primary: true },
        {
          label: 'Terms from the job advert missing',
          value: options.jobAd.trim() ? missing.length : '—',
          hint: options.jobAd.trim() ? missing.slice(0, 6).join(', ') : 'paste the advert to compare',
          primary: true,
        },
        { label: 'Career stage', value: options.seniority, hint: expected.note },
        { label: 'Target role', value: options.targetRole.trim() || 'not set' },
      ],
      notes: [
        'Demo preview — this tool is not built yet. These are rough counts, not a score.',
        'The real checker adds bullet-quality analysis, date-gap detection and a parser-eye view of the layout.',
      ],
    };
  },
});
