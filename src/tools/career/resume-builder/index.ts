/**
 * CV / Resume Builder.
 *
 * Renders through `ToolSurface`, not `ToolRunner` — a builder is a live
 * document with a preview, not one input and one output.
 *
 * `run()` below is the headless path: it takes the same fields as plain
 * options and lays them out as text. It exists so the tool is a real
 * registry entry rather than a page with a component bolted on. The
 * document model, the templates and the export all live in
 * `src/engines/resume/document.ts`.
 */

import { defineTool } from '@core/tool';

interface Options {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  links: string;
  summary: string;
  experience: string;
  education: string;
  skills: string;
}

export default defineTool<string, Options>({
  slug: 'resume-builder',
  category: 'career',
  cluster: 'career-documents',

  name: 'CV / Resume Builder',
  tagline:
    'Fill in the sections, watch the page build itself, and download the PDF. No account, no paywall at the export, and nothing leaves your browser.',
  titleBenefit: 'Free PDF, No Account',
  description:
    'Build a CV in your browser and download the PDF free. Two ATS-safe templates, live preview, and coaching on every bullet as you write it. No sign-up, no watermark.',
  keywords: [
    'resume builder',
    'cv maker',
    'free resume builder',
    'cv builder online',
    'resume generator',
    'free cv maker no sign up',
    'ats resume builder',
  ],

  runtime: 'client',
  status: 'live',
  premium: false,
  apiEnabled: false,

  // The best money on the site against the hardest SERP on the site:
  // Zety, Resume.io and Canva all bid on every one of these terms.
  score: { demand: 10, evergreen: 10, serp: 3, money: 10, ease: 2 },

  input: { type: 'form' },
  runLabel: 'Build my CV',

  options: [
    { key: 'fullName', type: 'text', label: 'Full name', default: '', placeholder: 'Fahim Muntasir' },
    {
      key: 'headline',
      type: 'text',
      label: 'Job title',
      default: '',
      placeholder: 'Junior Full Stack Developer',
      help: 'The role you are applying for, not the one you currently hold.',
    },
    { key: 'email', type: 'text', label: 'Email', default: '', placeholder: 'you@example.com' },
    { key: 'phone', type: 'text', label: 'Phone', default: '', placeholder: '+880 1XXX XXXXXX' },
    { key: 'location', type: 'text', label: 'Location', default: '', placeholder: 'Dhaka, Bangladesh' },
    {
      key: 'links',
      type: 'text',
      label: 'Links',
      default: '',
      placeholder: 'github.com/you · linkedin.com/in/you',
    },
    {
      key: 'summary',
      type: 'textarea',
      label: 'Summary',
      default: '',
      rows: 3,
      wide: true,
      placeholder: 'Two or three lines. What you do, how long, and the result you are known for.',
    },
    {
      key: 'skills',
      type: 'textarea',
      label: 'Skills',
      default: '',
      rows: 2,
      wide: true,
      placeholder: 'Frontend: Next.js, React, Tailwind\nBackend: Node.js, Express, PostgreSQL',
    },
    {
      key: 'experience',
      type: 'textarea',
      label: 'Experience',
      default: '',
      rows: 7,
      wide: true,
      placeholder: 'Job title — Employer — May 2025 to Nov 2025\n· What you shipped, and the number it moved',
      help: 'One role per block. Start each bullet with a verb and end it with a measurable outcome.',
    },
    {
      key: 'education',
      type: 'textarea',
      label: 'Education',
      default: '',
      rows: 4,
      wide: true,
      placeholder: 'BSc in Computer Science — University — 2021 to 2025\nCGPA 3.67 / 4.00',
    },
  ],

  output: { type: 'text', mono: false, label: 'Your CV' },

  howTo: [
    {
      title: 'Fill in the left, watch the right',
      detail:
        'The page is typeset as you type, at the size it will print. Everything stays in this browser tab and is saved to this browser, so a refresh does not cost you the draft — and there is no account to create.',
    },
    {
      title: 'Write bullets that carry a number',
      detail:
        '"Rebuilt the checkout, cutting drop-off from 34% to 28%" beats "responsible for checkout". Each bullet is checked as you write it: a weak opener, a missing figure or a first-person pronoun is flagged under the field, using the same rules the CV Checker scores against.',
    },
    {
      title: 'Pick the template that suits the market',
      detail:
        'Both are single-column with plain headings, because that is what parses. The left-aligned one adds an optional photo — conventional in Bangladesh, the Gulf and much of Europe, and a reason to be discarded in the US, UK, Canada and Australia.',
    },
    {
      title: 'Download the PDF',
      detail:
        'The export is your browser\'s own print engine, so the text stays real text — selectable, searchable and readable by an applicant tracking system — and non-Latin names typeset correctly. Choose "Save as PDF" as the destination.',
    },
    {
      title: 'Score it before you send it',
      detail:
        'Run the downloaded file through the CV / Resume Checker. It reads the actual PDF the way a recruiter\'s software does, which is the one thing a preview cannot tell you.',
    },
  ],

  faq: [
    {
      q: 'Is the PDF download really free?',
      a: 'Yes, and there is no account. The common pattern elsewhere is a free editor with the export behind a subscription — you build the whole CV, then meet the paywall. Here the document is assembled and typeset in your browser, so there is no server-side copy to charge you for releasing.',
    },
    {
      q: 'Is my CV uploaded anywhere?',
      a: 'No. It is built in this tab and saved to this browser only, which is also why there is no sign-up. Nothing is transmitted, and clearing your browser data clears the draft — so download the PDF once you are happy with it.',
    },
    {
      q: 'Are these templates ATS-friendly?',
      a: 'Both are single-column with plain text headings — Summary, Skills, Experience, Education — and no tables or text boxes, which are the three things that actually break parsing. They are built against the same rules the CV Checker scores with, so the output should come back clean.',
    },
    {
      q: 'Should I put a photo on my CV?',
      a: 'It depends entirely on where you are applying. It is conventional in Bangladesh, the Gulf, and parts of continental Europe. In the US, UK, Canada and Australia recruiters are trained to discard CVs carrying one, to avoid discrimination claims — so for those markets, use the template without it.',
    },
    {
      q: 'Why does the download open a print dialog?',
      a: 'Because the browser\'s print engine is what typesets the page, which is how the PDF ends up with real selectable text and correct Bengali, Arabic or Devanagari characters. Pick "Save as PDF" as the destination. A generated PDF would have been limited to Latin-1 and would have mangled your name.',
    },
    {
      q: 'CV or résumé — which do I need?',
      a: 'The same document under two names in most of the world. In the US and Canada a résumé is the one to two page job application and a CV is the long academic record; in the UK, Europe, South Asia and Australia, CV means the short one.',
    },
    {
      q: 'How long should my CV be?',
      a: 'One page under about ten years of experience, two pages above it. A third page is read by nobody. If you cannot cut, delete the oldest roles rather than shrinking the type — a CV set in 8pt to fit is visibly a CV that did not fit.',
    },
  ],

  infoGain: {
    summary:
      'Most free CV builders keep the document on their server and put the download behind an account or a subscription. This one is built the other way round: the fields stay in your browser, the export is your own print engine, and every bullet is coached as you write it using the same rules the CV Checker on this site scores against.',
    benchmarks: [
      { label: 'Cost to download', value: 'free', note: 'no account, no watermark, no export wall' },
      { label: 'Templates', value: '2', note: 'both single-column, both built against the checker' },
      { label: 'Where it runs', value: 'your browser', note: 'saved to this browser, never transmitted' },
      { label: 'Coaching', value: 'per bullet', note: 'weak openers, missing figures, first person, length' },
    ],
    supports: [
      'Live preview at true print size, and an export that is the same DOM and stylesheet, so the download cannot differ from the preview',
      'Inline coaching from the CV Checker\'s own word lists — a bullet the builder accepts is a bullet the checker scores well',
      'Two single-column templates: centred header, or left-aligned with an optional photo',
      'Full Unicode in the PDF, including Bengali, Arabic and Devanagari names, because the browser typesets it',
      'Automatic draft saving to this browser, with a plain-text export as well as the PDF',
      'Reorderable bullets and entries — the strongest achievement belongs first, and that is a real edit',
    ],
    limits: [
      'The draft lives in one browser on one device. There is no account, which means there is no sync — download the PDF before you clear your browser data.',
      'Two-column and infographic layouts are deliberately not offered. They parse badly, and the whole point of the defaults is to survive a parser.',
      'It will not write the content for you. A generator that invents achievements produces a CV that collapses in the interview.',
      'The export goes through the print dialog, so you choose "Save as PDF" rather than getting an instant file. That is the trade for correct non-Latin text.',
    ],
    verified: '2026-08',
  },

  related: [
    'resume-checker',
    'readability-checker',
    'word-counter',
    'character-frequency-counter',
    'text-diff',
    'find-and-replace',
    'case-converter',
    'remove-extra-spaces',
  ],
  nextSteps: ['resume-checker', 'readability-checker', 'word-counter'],

  added: '2026-08-12',
  updated: '2026-08-13',

  /**
   * Headless path. The page renders its own surface; this is what the
   * generic contract can express — the same sections, laid out as text.
   */
  run: (_input, options) => {
    const section = (heading: string, body: string) =>
      body.trim() ? `${heading}\n${'—'.repeat(heading.length)}\n${body.trim()}\n` : '';

    const contact = [options.email, options.phone, options.location, options.links]
      .map((v) => v.trim())
      .filter(Boolean)
      .join('  ·  ');

    const cv = [
      options.fullName.trim() || 'Your Name',
      options.headline.trim(),
      contact,
      '',
      section('SUMMARY', options.summary),
      section('SKILLS', options.skills),
      section('EXPERIENCE', options.experience),
      section('EDUCATION', options.education),
    ]
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return {
      output: cv,
      filename: 'cv.txt',
      notes: [
        'Plain-text layout. The builder on this page produces the formatted PDF, the live preview and the per-bullet coaching.',
      ],
    };
  },
});
