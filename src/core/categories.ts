/**
 * Part 3.2 — the empire structure.
 *
 *   Company → Division → Cluster → Tool → Guide → Premium → API → SaaS
 *
 * A division is the first URL segment and never changes. Depth before
 * breadth (Part 5.3): finish a division to ~25 tools before opening the
 * next one, or Google never learns what this site is expert in.
 */

export interface Category {
  slug: string;
  name: string;
  /** H1 on the hub page. */
  title: string;
  /** One line under the H1. */
  tagline: string;
  /** Hub page intro + meta description source. */
  description: string;
  /** Planned tool count at maturity (Part 3.2). */
  target: number;
  /** Build order — Part 4.3. 1 = months 1–6, 4 = year 3+. */
  tier: 1 | 2 | 3 | 4;
  /** Why this division exists. Part 4.2. */
  role: string;
  /** 24×24 stroke path, rendered by <CategoryIcon>. */
  icon: string;
  order: number;
  /**
   * Show this division in the header and footer before it has a live
   * tool. The hub then renders its "planned, nothing shipped yet"
   * placeholder, which `seo.ts` already marks `noindex, follow` and
   * `sitemap.ts` already omits — so pinning one costs no index quality.
   *
   * Use it for a division being actively built, and remove the flag
   * once tools ship, at which point `activeCategories()` carries it on
   * its own. A permanently pinned empty hub is a dead end in the
   * primary nav of every page on the site.
   */
  navPin?: boolean;
}

export const categories: Category[] = [
  {
    slug: 'text',
    name: 'Text',
    title: 'Text & String Tools',
    tagline: 'Count it, clean it, compare it, convert it — instantly, in your browser.',
    description:
      'Word counters, case converters, deduplicators, diff checkers and formatters. Every text tool here runs on your device and handles files far larger than a paste box normally allows.',
    target: 130,
    tier: 1,
    role: 'Traffic engine. The easiest tools to build well, and the place a new platform earns its first rankings.',
    icon: 'M5 6h14M5 12h14M5 18h9',
    order: 1,
  },
  {
    slug: 'developer',
    name: 'Developer',
    title: 'Developer Tools',
    tagline: 'JSON, Base64, JWT, regex, hashes — the daily utilities, without the ads.',
    description:
      'Formatters, validators, converters and generators for people who work in a terminal. Client-side, keyboard-friendly, and safe to paste a production payload into.',
    target: 180,
    tier: 1,
    role: 'Traffic plus trust. Developers link to good tools from blogs and Stack Overflow answers, which is how backlinks arrive without asking.',
    icon: 'm8 6-6 6 6 6M16 6l6 6-6 6',
    order: 2,
  },
  {
    slug: 'security',
    name: 'Security',
    title: 'Security & Privacy Tools',
    tagline: 'Passwords, hashes and encryption that never touch a server.',
    description:
      'Generate passwords, hash and verify strings, and encrypt text locally. These are exactly the tools you should not paste into a website that uploads — so none of ours do.',
    target: 60,
    tier: 1,
    role: 'Trust. A security tool that provably runs offline is the strongest possible proof of the whole platform’s privacy claim.',
    icon: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
    order: 3,
  },
  {
    slug: 'calculator',
    name: 'Calculators',
    title: 'Calculators',
    tagline: 'Percentages, dates, ratios and finance — with the working shown.',
    description:
      'Everyday calculators that show the formula they used, not just a number. Built for people who have to explain the result to someone else afterwards.',
    target: 150,
    tier: 1,
    role: 'Volume plus seasonality. Student and office traffic, and the on-ramp into the higher-CPC business division.',
    icon: 'M6 3h12v18H6zM9 7h6M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01',
    order: 4,
  },
  {
    slug: 'convert',
    name: 'Convert',
    title: 'Unit & Format Converters',
    tagline: 'Units, encodings, timestamps and data sizes — one engine, exact answers.',
    description:
      'Conversions with the formula, the rounding rule and a precomputed reference table on every page. Only pairs people actually search for, never a generated matrix.',
    target: 160,
    tier: 1,
    role: 'Enormous long tail. One engine drives hundreds of pages — but only where real search demand exists (Part 5.6).',
    icon: 'M4 8h13l-3-3M20 16H7l3 3',
    order: 5,
  },
  {
    slug: 'image',
    name: 'Image',
    title: 'Image Tools',
    tagline: 'Compress, resize, crop and convert — without uploading a single pixel.',
    description:
      'Image processing that happens in your browser using WebAssembly. No upload queue, no watermark, no file size cap beyond what your own device can hold.',
    target: 140,
    tier: 2,
    role: 'Huge volume at zero server cost, because WASM keeps the work on the visitor’s machine.',
    icon: 'M3 5h18v14H3zM8.5 10.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3M3 16l5-5 4 4 3-3 6 6',
    order: 6,
  },
  {
    slug: 'pdf',
    name: 'PDF',
    title: 'PDF Tools',
    tagline: 'Merge, split, compress and convert PDFs on your own device.',
    description:
      'The full PDF toolkit, running locally through WebAssembly. Contracts, invoices and medical records never leave your computer, because there is nowhere for them to go.',
    target: 110,
    tier: 2,
    role: 'The highest volume and the fiercest competition. Also the clearest path to a paid batch API.',
    icon: 'M7 3h7l5 5v13H7zM14 3v5h5',
    order: 7,
  },
  {
    slug: 'seo',
    name: 'SEO',
    title: 'SEO & Marketing Tools',
    tagline: 'Meta tags, schema, robots and redirects — checked against the real spec.',
    description:
      'Practical tools for people who own a site’s traffic. Validators and generators that follow current search engine documentation rather than folklore.',
    target: 70,
    tier: 2,
    role: 'High CPC and high link velocity. Marketers pay attention and marketers write posts.',
    icon: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14M20 21l-4.3-4.3',
    order: 8,
  },
  {
    slug: 'business',
    name: 'Business',
    title: 'Business & Finance Tools',
    tagline: 'Invoices, margins, loans and payroll — the paperwork, minus the software.',
    description:
      'Generators and calculators for running a small business. This is where free utilities turn into a paid product, so these get more care than anything else on the site.',
    target: 90,
    tier: 2,
    role: 'The money division. Highest CPC on the site, and the seed of the first genuine SaaS.',
    icon: 'M3 8h18v11H3zM9 8V5h6v3',
    order: 9,
  },
  {
    slug: 'career',
    name: 'Career',
    title: 'CV & Career Tools',
    tagline: 'CVs, cover letters and applications — written, checked, and never uploaded.',
    description:
      'Build a CV, check it the way an applicant tracking system reads it, and write the letter that goes with it. These documents hold your address, phone number and work history, so all of them run in your browser.',
    target: 60,
    tier: 2,
    role: 'The highest-intent traffic on the site: the CPC of the business division with the volume of the student one, and the shortest path from a free tool to a paid one.',
    icon: 'M6 3h12v18H6zM12 9.3a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 0 1 0 3.4M8.9 13.4c.3-1.7 1.6-2.8 3.1-2.8s2.8 1.1 3.1 2.8M9 17.5h6',
    order: 10,
    // Both CV tools are still drafts. Remove this once one goes live.
    navPin: true,
  },
  {
    slug: 'student',
    name: 'Student',
    title: 'Student & Education Tools',
    tagline: 'Grades, citations, study plans and the maths in between.',
    description:
      'GPA and CGPA calculators, citation formatters and planning tools. Built for coursework deadlines, which means they have to work on a phone at midnight.',
    target: 80,
    tier: 3,
    role: 'Volume with a strong seasonal curve, and unusually loyal returning users.',
    icon: 'M12 4 2 9l10 5 10-5zM6 11.5V17c0 1.5 3 3 6 3s6-1.5 6-3v-5.5',
    order: 11,
  },
  {
    slug: 'ai',
    name: 'AI',
    title: 'AI Tools',
    tagline: 'A thin, honest AI layer over tools that already work without it.',
    description:
      'AI is added only where it genuinely beats a deterministic function. Every result is labelled as generated, capped by a quota, and never the only way to finish the job.',
    target: 70,
    tier: 3,
    role: 'The Premium engine. AI is a margin decision before it is a product decision (Part 7).',
    icon: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 15l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z',
    order: 12,
  },
];

const bySlug = new Map(categories.map((c) => [c.slug, c]));

export const getCategory = (slug: string): Category | undefined => bySlug.get(slug);

export const categorySlugs: string[] = categories.map((c) => c.slug);

export const isCategorySlug = (slug: string): boolean => bySlug.has(slug);
