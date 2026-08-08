/**
 * The public roadmap — Appendix A, the fourteen-stage project plan,
 * tracked honestly.
 *
 * Publishing this is not decoration. Part 5.10 tactic 6 and Part 9 both
 * point at the same thing: a project that shows its plan and its
 * current position reads as a real operation to a person and as a
 * citable, dated source to a retrieval engine. A roadmap that is never
 * updated is worse than none, so `docs/PROJECT-CHECKLIST.md` is the
 * working copy and this is the summary.
 */

export type StageStatus = 'done' | 'in-progress' | 'next' | 'later';

export interface RoadmapStage {
  n: string;
  title: string;
  items: number;
  status: StageStatus;
  summary: string;
  /** The few items worth naming publicly. */
  highlights: string[];
}

export const STAGE_LABELS: Record<StageStatus, string> = {
  done: 'Done',
  'in-progress': 'In progress',
  next: 'Next',
  later: 'Later',
};

export const roadmap: RoadmapStage[] = [
  {
    n: '01',
    title: 'Strategy and foundation',
    items: 18,
    status: 'done',
    summary:
      'Mission, three-year targets, the opportunity database, the ten-question filter, and the 50-point scoring model that decides what gets built.',
    highlights: [
      'Scoring model defined and applied to the first 100 candidates',
      'Three starting divisions chosen: text, developer, security',
      'Categories we will never build, written down',
    ],
  },
  {
    n: '02',
    title: 'Brand and domain',
    items: 16,
    status: 'done',
    summary: 'Name, mark, palette, typography, tone of voice and the asset set.',
    highlights: [
      'AdeptBay name and mark',
      'Bay-teal palette, contrast-checked in both themes',
      'Inter and JetBrains Mono, self-hosted',
    ],
  },
  {
    n: '03',
    title: 'Engineering foundation',
    items: 32,
    status: 'done',
    summary:
      'The platform itself: defineTool, the registry, the dynamic route, the SEO and schema generators, sitemap sharding, and the scaffold CLI.',
    highlights: [
      'One route renders every tool page',
      'Seven schema types generated from the registry',
      'Category-sharded sitemap index',
      'Registry validation fails the build on a thin page',
    ],
  },
  {
    n: '04',
    title: 'Component library',
    items: 26,
    status: 'in-progress',
    summary:
      'The shared components every tool page is assembled from. Most are built; the file-handling set lands with the first PDF and image tools.',
    highlights: [
      'Done: ToolShell, OptionsForm, ResultBox, DiffViewer, StatGrid, FileDropzone',
      'Pending: PdfPreview, LightCodeEditor, ImagePreview — waiting on the tools that need them',
    ],
  },
  {
    n: '05',
    title: 'The first tools',
    items: 15,
    status: 'in-progress',
    summary: 'Text and developer utilities, each with its own benchmarks, limits and failure modes.',
    highlights: ['14 live', 'Next: find and replace, line numbering, text to columns'],
  },
  {
    n: '06',
    title: 'Content system',
    items: 22,
    status: 'in-progress',
    summary:
      'Guides, comparison pages, glossary, and the policy set. Guide pages are live on a template; hand-written replacements are being written three a week.',
    highlights: [
      'Done: About, Methodology, Privacy, Terms, Cookies, Accessibility, DMCA, Contact',
      'In progress: hand-written guides, three per week',
    ],
  },
  {
    n: '07',
    title: 'SEO implementation',
    items: 28,
    status: 'next',
    summary:
      'Search Console and Bing verification, IndexNow, internal-link auditing, and the Core Web Vitals baseline.',
    highlights: [
      'Bing Webmaster Tools verification — not optional; ChatGPT search runs on the Bing index',
      'AI citation tracker: 20 target questions, monthly',
    ],
  },
  {
    n: '08',
    title: 'Infrastructure and security',
    items: 26,
    status: 'next',
    summary:
      'Postgres, Redis, object storage, the job queue, rate limiting and the abuse controls that server-side tools require.',
    highlights: [
      'Not needed until the first server-side tool ships',
      'Security headers and CSP are already live',
    ],
  },
  {
    n: '09',
    title: 'Monetisation',
    items: 24,
    status: 'later',
    summary:
      'Advertising after 100 pages and policy-page approval, then affiliate, email, Premium and the API.',
    highlights: [
      'Gate: 100+ live pages before applying',
      'Ad slots are built and reserve their height; the flag is off',
    ],
  },
  {
    n: '10',
    title: 'Distribution',
    items: 22,
    status: 'later',
    summary:
      'Directories, Show HN, Product Hunt, a browser extension, embeddable widgets and the retention loops.',
    highlights: ['Six channels, so no single one is more than 60% of traffic'],
  },
  {
    n: '11',
    title: 'AI layer',
    items: 16,
    status: 'later',
    summary:
      'The model router, prompt cache, quotas and evaluation set. The abstraction is built and disabled; nothing calls a model yet.',
    highlights: ['Cost controls exist before the first feature, not after the first bill'],
  },
  {
    n: '12',
    title: 'Legal, financial, operational',
    items: 24,
    status: 'later',
    summary: 'Company structure, banking, payments, tax and the first standard operating procedures.',
    highlights: ['Revenue first, structure second'],
  },
  {
    n: '13',
    title: 'Measurement',
    items: 18,
    status: 'later',
    summary:
      'The per-tool dashboard: runs, success rate, p95 duration, clicks, average position and RPM, sortable.',
    highlights: ['Past 50 tools, memory stops being a reliable input to decisions'],
  },
  {
    n: '14',
    title: 'Scale',
    items: 20,
    status: 'later',
    summary: 'Hiring, internationalisation, the public API, and the first genuine SaaS product.',
    highlights: ['Year two and beyond'],
  },
];

export const roadmapTotals = () => {
  const items = roadmap.reduce((sum, stage) => sum + stage.items, 0);
  const done = roadmap.filter((s) => s.status === 'done').reduce((sum, s) => sum + s.items, 0);
  return { items, done, percent: Math.round((done / items) * 100) };
};
