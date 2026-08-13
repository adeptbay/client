/**
 * CV / Resume Checker.
 *
 * The page renders through `ToolSurface`, not `ToolRunner` — the result
 * is a scored report with evidence, not a value (see ToolSurface.tsx).
 *
 * `run()` below is the headless path: the same three layers, returning
 * the summary the generic contract can express. It exists so the tool is
 * a real registry entry rather than a page with a component bolted on,
 * and so the API surface stays honest about what this tool does.
 *
 * The rules live in `src/engines/resume` and nothing about scoring is
 * decided in this file.
 */

import { defineTool, ToolError } from '@core/tool';

interface Options {
  targetRole: string;
  jobAd: string;
  seniority: 'auto' | 'student' | 'entry' | 'mid' | 'senior' | 'executive';
}

export default defineTool<File[], Options>({
  slug: 'resume-checker',
  category: 'career',
  cluster: 'career-documents',

  name: 'CV / Resume Checker',
  tagline:
    'Drop in your PDF and see it the way a recruiter’s software does — the sections it loses, the bullets that prove nothing, and the exact lines to change. Read in your browser, never uploaded.',
  titleBenefit: 'Scored, Not Uploaded',
  description:
    'Check a CV before you send it. Reads your PDF in the browser, scores parsing, structure, evidence and keywords, and names the lines to fix. No upload, no sign-up.',
  keywords: [
    'resume checker',
    'ats resume checker',
    'cv checker',
    'resume score',
    'check my resume',
    'ats scanner',
    'resume analyser',
    'free resume review',
  ],

  runtime: 'client',
  status: 'live',
  premium: false,
  apiEnabled: false,

  // Enormous demand and the best money on the site, against a SERP owned
  // by Jobscan, Zety and Resume Worded, and a build measured in days.
  score: { demand: 10, evergreen: 9, serp: 3, money: 9, ease: 2 },

  input: {
    type: 'files',
    label: 'Your CV',
    accept: ['.pdf'],
    max: 1,
    maxSizeMB: 12,
  },

  options: [
    {
      key: 'targetRole',
      type: 'text',
      label: 'Role you are applying for',
      default: '',
      placeholder: 'Senior Frontend Engineer',
      help: 'Checked against your headline, which is the first thing a screener reads.',
    },
    {
      key: 'jobAd',
      type: 'textarea',
      label: 'Paste the job advert (optional)',
      default: '',
      rows: 6,
      wide: true,
      placeholder: 'Paste the requirements section to see which of its terms your CV never uses.',
      help: 'Nothing here is uploaded. The comparison runs in this tab.',
    },
    {
      key: 'seniority',
      type: 'enum',
      label: 'Career stage',
      default: 'auto',
      values: [
        { value: 'auto', label: 'Work it out from my dates' },
        { value: 'student', label: 'Student or new graduate' },
        { value: 'entry', label: 'Entry — under 3 years' },
        { value: 'mid', label: 'Mid — 3 to 10 years' },
        { value: 'senior', label: 'Senior — 10 years or more' },
        { value: 'executive', label: 'Executive or director' },
      ],
      help: 'Sets the expected length. A senior CV is not a long junior CV.',
    },
  ],

  output: { type: 'stats' },

  howTo: [
    {
      title: 'Drop in the PDF you actually send',
      detail:
        'Not the Word file, not an export made for this — the file a recruiter receives. Half of what is checked here is how that specific file parses, so a different export is a different result.',
    },
    {
      title: 'Name the role, and paste the advert if you have it',
      detail:
        'The role is checked against your headline. The advert turns a generic score into a specific one: which of its own repeated terms your CV never uses once. The score updates as you type — there is no second upload.',
    },
    {
      title: 'Fix the critical findings before anything else',
      detail:
        'They are ordered by what they cost. A two-column layout or an unreadable text layer ends the application before a human sees it; a weak verb only costs you the read. Fixing the wording of a CV a parser cannot open changes nothing.',
    },
    {
      title: 'Open "what a parser sees" and read it',
      detail:
        'That pane is your file after extraction, which is what gets stored, searched and filtered. If a line is missing or scrambled there, it is missing for them — whatever the page looks like on screen.',
    },
    {
      title: 'Download the report and edit against it',
      detail:
        'Every finding quotes the line it came from and says what to write instead, so the report works as a checklist in whichever editor your CV actually lives in.',
    },
  ],

  faq: [
    {
      q: 'Is this a real ATS score?',
      a: 'It is a real measurement, and no tool can be more than that. No applicant tracking system publishes a scoring formula, and they differ — so a tool claiming "your Workday score" is inventing it. This measures the things every system depends on: whether the text extracts, whether the sections are findable, whether contact fields survive, and how the content compares to the advert.',
    },
    {
      q: 'Why does it only take PDF?',
      a: 'Because how your PDF parses is half of what is being checked, and a .docx cannot tell you that. The same CV exported two ways can differ by thirty points — one embeds its fonts and keeps a single column, the other loses a heading into a text box. The file you send is the file that has to be checked.',
    },
    {
      q: 'Is my CV uploaded anywhere?',
      a: 'No. The PDF is parsed inside this browser tab by code that ships with the page, so the file never leaves your device and closing the tab removes it. The optional AI review at the end is the only feature that sends anything, it asks before it runs, and it strips your name, email and phone first.',
    },
    {
      q: 'What score should I be aiming for?',
      a: 'Above 80, with nothing left in Critical. The number matters less than its composition: a 72 with clean parsing is a good CV that needs stronger bullets, and a 72 carrying a parse failure is a CV that will not arrive. Fix the named findings and the number follows.',
    },
    {
      q: 'Why did my beautifully designed CV score badly?',
      a: 'Almost always the layout. Two columns, tables and text boxes look considered and parse badly — a parser reads straight across the page, so a sidebar gets interleaved line by line into your job history. The "what a parser sees" pane shows exactly what that does to your file.',
    },
    {
      q: 'Does this work for non-technical CVs?',
      a: 'Yes. The checks are about evidence, structure and parsing, none of which are industry-specific, and the skills recogniser covers healthcare, finance, education, marketing, operations and trades alongside software. Section headings must be in English.',
    },
    {
      q: 'Will the AI rewrite my CV for me?',
      a: 'It rewrites three to five bullets as examples, using only what your CV already claims, with square-bracket placeholders wherever a number is missing. It cannot invent your results — any rewrite whose "before" text is not genuinely in your file is discarded before you see it. The rest of the report is rules, and runs without it.',
    },
    {
      q: 'Does adding keywords from the advert actually help?',
      a: 'Covering requirements you genuinely meet, in the advert\'s own wording, helps — recruiters search shortlists with those exact terms. Stuffing them does not: it is obvious to a reader, and hidden white-on-white keywords are detected by every major system and treated as grounds to discard the application.',
    },
  ],

  infoGain: {
    summary:
      'Most CV scorers show a percentage and sell the explanation. This one parses the PDF in your browser the way an applicant tracking system does — fonts, columns, text layer and all — then reports 38 named checks across seven weighted categories, each one quoting the line in your CV that cost the points and saying what to write instead.',
    benchmarks: [
      { label: 'Checks run', value: '38', note: 'across parsing, contact, structure, evidence, keywords, language and length' },
      { label: 'Weighting', value: 'parse 25 · impact 22 · structure 15 · keywords 15 · contact 10 · language 8 · length 5' },
      { label: 'Parse gate', value: 'caps the total', note: 'a CV a machine cannot read cannot average its way to a pass on wording' },
      { label: 'Typical run', value: 'under 1s', note: 'for a two-page CV, entirely on your device' },
    ],
    supports: [
      'PDF text extraction with no upload and no third-party library — objects, streams, fonts and content operators, so a parse failure is reported rather than quietly recovered',
      'Two-column detection, with a side-by-side view of how the gutter scrambles your CV when read straight across',
      'Hidden-text detection — white-on-white and invisible render modes, the keyword stuffing that gets applications discarded',
      'Unmappable glyph detection: fonts with no character map look perfect on screen and paste as boxes',
      'Section, role, date and bullet parsing, including gap detection and mixed date formats',
      'Bullet analysis: action verbs, quantified outcomes, duty-list phrasing, hedges, clichés, tense consistency and first person',
      'Keyword gap against a pasted job advert, matched on the advert\'s own wording',
      'Optional AI review whose rewrites are verified against your actual file before they are shown',
    ],
    limits: [
      'It cannot tell you whether you will get the interview. It reports whether the document is readable, findable and evidenced — the parts that are checkable.',
      'No tool knows a specific employer\'s scoring formula, because none of them publish one. Anything claiming a named system\'s score has invented it.',
      'Section headings are detected in English only. A CV in another language parses and scores on structure, but its headings will not be recognised.',
      'Scanned and image-only CVs are reported as unreadable rather than run through OCR — which is the finding, since that is exactly what happens to them downstream.',
      'Complex scripts that reorder glyphs — Bengali, Devanagari, Arabic, Thai — extract with imperfect word spacing, so the word count and language checks are approximate for CVs written in them.',
      'Career gaps, market-specific conventions and unconventional titles are reported as context, never scored as faults.',
    ],
    errors: [
      {
        cause: 'This PDF is password-protected or restricted',
        fix: 'Remove the protection and export a plain PDF. An applicant tracking system cannot open a protected file either, so it would be rejected before anyone read it.',
      },
      {
        cause: 'No readable text — the file is an image',
        fix: 'Export straight to PDF from the original document instead of scanning or printing to image. If the original is gone, retype it: nothing recovers a CV that carries no text layer.',
      },
      {
        cause: 'Characters cannot be read as text',
        fix: 'Re-export with font embedding enabled, or switch to Arial, Calibri, Helvetica or Times. Test it by opening the PDF, selecting all and pasting into a plain text editor.',
      },
      {
        cause: 'Sections were not detected',
        fix: 'Use plain headings on their own line — Summary, Experience, Education, Skills — outside any table or text box. Creative section names cost you the field mapping.',
      },
    ],
    verified: '2026-08',
  },

  /**
   * `resume-builder` is deliberately absent from both lists until it
   * goes live. It is the natural sibling and belongs at the top of each
   * — but `relatedTools()` drops non-live targets silently, so declaring
   * it now buys a link that never renders and an orphan-audit failure
   * that does. Put it back, first in both, on the day the builder ships.
   */
  related: [
    'readability-checker',
    'word-counter',
    'character-frequency-counter',
    'text-diff',
    'find-and-replace',
    'remove-extra-spaces',
    'case-converter',
    'sort-lines',
  ],
  nextSteps: ['readability-checker', 'word-counter', 'text-diff'],

  added: '2026-08-12',
  updated: '2026-08-13',

  /**
   * Headless path. The interactive page renders its own surface, so this
   * runs for the API and for anything else that holds a definition and a
   * file — the same three layers, reduced to what `stats[]` can carry.
   *
   * The engine is imported inside the function so the registry barrel,
   * which is loaded on every server render, does not drag the PDF parser
   * in with it.
   */
  run: async (files, options) => {
    const file = files[0];
    if (!file) {
      throw new ToolError('No file was provided.', 'Add a PDF and run the check again.');
    }

    const { checkResumePdf } = await import('@engines/resume');

    const report = await checkResumePdf(await file.arrayBuffer(), {
      targetRole: options.targetRole,
      jobAd: options.jobAd,
      seniority: options.seniority,
    });

    const criticals = report.findings.filter((f) => f.severity === 'critical');

    return {
      stats: [
        { label: 'Score', value: `${report.score}/100`, hint: `grade ${report.grade}`, primary: true },
        {
          label: 'Critical findings',
          value: criticals.length,
          hint: criticals[0]?.title ?? 'none — the file parses cleanly',
          primary: true,
        },
        {
          label: 'Bullets with a number',
          value: `${report.stats.quantifiedBullets} of ${report.stats.bullets}`,
          hint: 'about half is the working target',
          primary: true,
        },
        {
          label: 'Advert match',
          value: report.keywordCoverage === null ? '—' : `${report.keywordCoverage}%`,
          hint: report.keywordCoverage === null ? 'paste the advert to compare' : 'on the advert’s own wording',
          primary: true,
        },
        ...report.categories.map((category) => ({
          label: category.label,
          value: `${category.score}/100`,
          hint: `${category.points} of ${category.maxPoints} points`,
        })),
        { label: 'Pages', value: report.stats.pages, hint: `${report.stats.words} words` },
        {
          label: 'Layout',
          value: report.stats.columns > 1 ? `${report.stats.columns} columns` : 'single column',
          hint: report.stats.columns > 1 ? 'the first thing to fix' : 'the safest layout there is',
        },
      ],
      notes: [
        ...report.findings.slice(0, 8).map((f) => `${f.severity.toUpperCase()}: ${f.title} — ${f.fix}`),
        'The interactive page reports all of this with the line from your CV that caused each finding.',
      ],
    };
  },
});
