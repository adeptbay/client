/**
 * ⚠ DEMO CONTENT — this tool is not built yet.
 *
 * What is real and permanent here is the URL and the neighbourhood:
 * `/career/resume-builder`, cluster `career-documents`. Part 3.2 —
 * a URL never changes, so it is fixed first and the tool is written
 * into it afterwards.
 *
 * Everything else — the copy, the option set and `run()` — is
 * placeholder. `status` stays 'draft' until it is rewritten, which
 * keeps the page out of the hub, the sitemap, the search index and the
 * homepage while still rendering at its final address for review.
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
  layout: 'ats' | 'classic' | 'compact';
}

export default defineTool<string, Options>({
  slug: 'resume-builder',
  category: 'career',
  cluster: 'career-documents',

  name: 'CV / Resume Builder',
  tagline: 'Fill in the sections, get a clean CV an applicant tracking system can actually read — built in your browser, never uploaded.',
  titleBenefit: 'ATS-Safe, No Upload',
  description:
    'Build a CV or résumé in your browser. Fill in each section, pick a layout and copy or download the result — no sign-up, no watermark, and no upload.',
  keywords: [
    'resume builder',
    'cv maker',
    'free resume builder',
    'cv builder online',
    'resume generator',
  ],

  runtime: 'client',
  status: 'draft', // ← flip to 'live' once the copy and run() below are real
  premium: false,
  apiEnabled: false,

  // Honest score: enormous demand and the best money on the site,
  // against a SERP owned by Zety, Canva and Indeed, and a week of work.
  score: { demand: 10, evergreen: 10, serp: 3, money: 10, ease: 3 },

  input: { type: 'form' },
  runLabel: 'Build my CV',

  options: [
    { key: 'fullName', type: 'text', label: 'Full name', default: '', placeholder: 'Ayesha Rahman' },
    {
      key: 'headline',
      type: 'text',
      label: 'Headline',
      default: '',
      placeholder: 'Front-end Developer',
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
      placeholder: 'linkedin.com/in/you · github.com/you',
    },
    {
      key: 'summary',
      type: 'textarea',
      label: 'Professional summary',
      default: '',
      rows: 3,
      wide: true,
      placeholder: 'Two or three lines. What you do, how long, and the result you are known for.',
    },
    {
      key: 'experience',
      type: 'textarea',
      label: 'Experience',
      default: '',
      rows: 7,
      wide: true,
      placeholder: 'Job title — Company — 2023 to now\n· What you shipped, and the number it moved',
      help: 'One role per block. Start each bullet with a verb and end it with a measurable outcome.',
    },
    {
      key: 'education',
      type: 'textarea',
      label: 'Education',
      default: '',
      rows: 4,
      wide: true,
      placeholder: 'BSc in Computer Science — University — 2022',
    },
    {
      key: 'skills',
      type: 'textarea',
      label: 'Skills',
      default: '',
      rows: 2,
      wide: true,
      placeholder: 'TypeScript, React, PostgreSQL, Figma',
    },
    {
      key: 'layout',
      type: 'enum',
      label: 'Layout',
      default: 'ats',
      values: [
        { value: 'ats', label: 'ATS-safe — single column, plain headings' },
        { value: 'classic', label: 'Classic — single column with rules' },
        { value: 'compact', label: 'Compact — fits one page' },
      ],
      help: 'Two-column CVs look better and parse worse. ATS-safe is the default for that reason.',
    },
  ],

  output: { type: 'text', mono: false, label: 'Your CV' },

  howTo: [
    {
      title: 'Fill in the sections',
      detail:
        'Name, headline and contact details first, then experience. Everything you type stays in this browser tab — there is no upload step and no account.',
    },
    {
      title: 'Write bullets that carry a number',
      detail:
        '"Rebuilt the checkout, cutting drop-off 18%" beats "responsible for checkout". A recruiter reads the first six seconds of a CV as a scan for numbers.',
    },
    {
      title: 'Pick a layout',
      detail:
        'ATS-safe is single column with plain headings, because that is what applicant tracking systems parse without dropping fields.',
    },
    {
      title: 'Copy or download, then check it',
      detail:
        'Run the result through the CV / Resume Checker before you send it — it reads the file the way a parser does, not the way you do.',
    },
  ],

  faq: [
    {
      q: 'Is this CV builder free?',
      a: 'Yes, and there is no export wall. The common pattern elsewhere is a free editor and a paid download; this one builds the document in your browser, so there is no server-side copy to charge you for releasing.',
    },
    {
      q: 'What is an ATS-friendly CV?',
      a: 'One a parser can read: a single column, real text rather than an image, plain section headings like Experience and Education, and no tables or text boxes holding the important details. Most rejections at this stage are parsing failures, not judgements.',
    },
    {
      q: 'CV or résumé — which do I need?',
      a: 'The same document under two names in most of the world. In the US and Canada a résumé is the one to two page job application and a CV is the long academic record; in the UK, Europe, South Asia and Australia, CV means the short one.',
    },
    {
      q: 'How long should a CV be?',
      a: 'One page under about ten years of experience, two pages above it. A third page is read by nobody. If you cannot cut, delete the oldest roles rather than shrinking the type.',
    },
    {
      q: 'Does my data get uploaded anywhere?',
      a: 'No. The document is assembled in your browser tab and never sent to a server, which is why there is no sign-up. Close the tab and nothing remains — so copy or download the result before you leave.',
    },
  ],

  infoGain: {
    summary:
      'Most free CV builders keep the document on their server and put the download behind an account. This one is planned the other way round: the fields stay in your browser, the default layout is a single column because that is what applicant tracking systems parse without dropping data, and the file is yours before any sign-up exists.',
    supports: [
      'Planned: summary, experience, education and skills sections',
      'Planned: single-column ATS-safe layout, plus classic and compact variants',
      'Planned: plain-text and PDF export, generated on your device',
      'Planned: options carried in the URL, so a draft survives a reload',
    ],
    limits: [
      'Not built yet. This page is a placeholder while the builder is written, and the preview below only lays your fields out as plain text.',
      'Two-column and infographic layouts are deliberately not planned — they parse badly, and the whole point of the default is to survive a parser.',
      'It will not write the content for you. A generator that invents achievements produces a CV that collapses in the interview.',
    ],
  },

  related: [
    'resume-checker',
    'readability-checker',
    'word-counter',
    'character-frequency-counter',
    'case-converter',
    'find-and-replace',
    'text-diff',
    'remove-extra-spaces',
  ],
  nextSteps: ['resume-checker', 'readability-checker', 'word-counter'],

  added: '2026-08-12',
  updated: '2026-08-12',

  run: (_input, options) => {
    // Placeholder. The real builder belongs in an engine
    // (src/engines/document.ts) once the layouts are decided.
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
      section('EXPERIENCE', options.experience),
      section('EDUCATION', options.education),
      section('SKILLS', options.skills),
    ]
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return {
      output: cv,
      filename: 'cv.txt',
      notes: [
        'Demo preview — this tool is not built yet. It lays your fields out as plain text and nothing more.',
        `The "${options.layout}" layout, the page rules and PDF export arrive with the real builder.`,
      ],
    };
  },
});
