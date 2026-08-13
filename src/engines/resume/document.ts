/**
 * The CV document — model, renderer and export.
 *
 * ── One source for preview and print ────────────────────────────────
 *
 * The single most common defect in CV builders is a preview that does
 * not match the download. It happens because the preview is React and
 * the export is a separate rendering path, and the two drift apart at
 * the first CSS change.
 *
 * So there is exactly one renderer here: data → HTML string, plus one
 * stylesheet string. The preview injects both into a page element; the
 * export injects the identical pair into a print document. They cannot
 * disagree, because they are the same two strings.
 *
 * ── Why the export prints rather than writes a PDF byte stream ───────
 *
 * This codebase writes its own engines, and `pdf.ts` next door proves a
 * PDF can be produced by hand. It is deliberately not done here. A
 * hand-written PDF is limited to the 14 standard fonts unless it also
 * embeds and subsets a TrueType file, and those fonts are Latin-1 only —
 * which means the name "মোঃ ফাহিম" comes out as boxes. A CV builder that
 * mangles the user's own name is not a CV builder.
 *
 * Printing hands typesetting to the browser, which already has the
 * fonts, the shaping engine and the image decoders. The result is a real
 * PDF with real selectable text, which is exactly what the checker next
 * door needs to see.
 *
 * ── Escaping ────────────────────────────────────────────────────────
 *
 * Every value that reaches the HTML goes through `esc`, and every URL
 * through `safeUrl`. This renders user input into markup, so that is not
 * a nicety — it is the whole security boundary of the feature.
 */

export type TemplateId = 'classic' | 'portrait';

export interface CvLink {
  label: string;
  url: string;
}

export interface CvSkillGroup {
  group: string;
  items: string;
}

export interface CvProject {
  name: string;
  summary: string;
  tech: string;
  links: CvLink[];
  bullets: string[];
}

export interface CvRole {
  role: string;
  org: string;
  period: string;
  bullets: string[];
}

export interface CvEducation {
  degree: string;
  institution: string;
  period: string;
  detail: string;
}

export interface CvDocument {
  template: TemplateId;
  /** Data URL. Only rendered by the portrait template. */
  photo: string | null;
  /** Which section leads: a junior CV is usually stronger on projects. */
  lead: 'experience' | 'projects';
  /**
   * Education above the work sections.
   *
   * Not a style preference — the checker next door marks a CV down for
   * getting this wrong, in both directions. With little work history the
   * degree is the strongest evidence on the page and belongs where the
   * eye lands first; past a few years of work it is the least
   * interesting thing about you and belongs at the bottom.
   */
  educationFirst: boolean;

  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  links: CvLink[];

  objective: string;
  skills: CvSkillGroup[];
  experience: CvRole[];
  projects: CvProject[];
  achievements: string[];
  education: CvEducation[];
}

export const TEMPLATES: { id: TemplateId; name: string; note: string }[] = [
  {
    id: 'classic',
    name: 'Classic',
    note: 'Centred header. The safest layout there is — one column, plain headings.',
  },
  {
    id: 'portrait',
    name: 'Left-aligned',
    note: 'Header aligned left, with an optional photo.',
  },
];

/* ═══════════════════════════════════════════════════════════════════
   Empty and sample documents
   ═══════════════════════════════════════════════════════════════════ */

export const emptyDocument = (): CvDocument => ({
  template: 'classic',
  photo: null,
  lead: 'experience',
  educationFirst: false,
  name: '',
  title: '',
  email: '',
  phone: '',
  location: '',
  links: [{ label: 'Portfolio', url: '' }],
  objective: '',
  skills: [{ group: '', items: '' }],
  experience: [{ role: '', org: '', period: '', bullets: [''] }],
  projects: [],
  achievements: [],
  education: [{ degree: '', institution: '', period: '', detail: '' }],
});

/**
 * The sample is written to score well in the checker next door — every
 * bullet opens with a past-tense verb and carries a measurable outcome.
 * It doubles as the worked example of what this builder is asking for.
 */
export const sampleDocument = (): CvDocument => ({
  template: 'classic',
  photo: null,
  lead: 'projects',
  educationFirst: true,
  name: 'Ayesha Rahman',
  title: 'Junior Full Stack Developer',
  email: 'ayesha.rahman@example.com',
  phone: '+880 1712 345678',
  location: 'Dhaka, Bangladesh',
  links: [
    { label: 'Portfolio', url: 'ayesharahman.dev' },
    { label: 'GitHub', url: 'github.com/ayesharahman' },
    { label: 'LinkedIn', url: 'linkedin.com/in/ayesharahman' },
  ],
  objective:
    'Full stack developer with two years building production web applications in React, Next.js, TypeScript and Node.js. Shipped a multi-vendor storefront handling 4,000 orders a month and cut its checkout drop-off from 34% to 28%. Looking for a product team where front-end performance is treated as a feature.',
  skills: [
    { group: 'Languages', items: 'TypeScript, JavaScript, Java, C++' },
    { group: 'Databases', items: 'PostgreSQL, MongoDB, Redis' },
    { group: 'Frontend', items: 'Next.js, React, Tailwind CSS, Zustand' },
    { group: 'Backend', items: 'Node.js, Express, NestJS, Prisma' },
    { group: 'API', items: 'REST, GraphQL' },
    { group: 'Tools', items: 'Git, Docker, Postman, Vercel' },
  ],
  experience: [
    {
      role: 'Junior Full Stack Developer',
      org: 'NextSoftDev',
      period: 'May 2025 – Nov 2025',
      bullets: [
        'Rebuilt the checkout flow in Next.js, cutting cart abandonment from 34% to 28% across 4,000 monthly orders',
        'Cut median API response time 340ms to 90ms by adding Redis caching to the three heaviest endpoints',
        'Migrated the build from Webpack to Vite, reducing CI time 71% and unblocking same-day releases',
      ],
    },
  ],
  projects: [
    {
      name: 'Furnicraft',
      summary: 'Multi-vendor e-commerce platform with secure payments',
      tech: 'TypeScript, GraphQL, MongoDB, Node.js, Express, Zustand, Stripe',
      links: [
        { label: 'Live', url: 'furnicraft.example.com' },
        { label: 'Code', url: 'github.com/ayesharahman/furnicraft' },
      ],
      bullets: [
        'Built a cart and checkout on Stripe that processed 1,200 test transactions with zero reconciliation errors',
        'Added real-time currency conversion, lifting completed checkouts from overseas visitors 19%',
      ],
    },
  ],
  achievements: [
    'Champion, Intra University Programming Contest 2024',
    'Solved 330+ problems on Codeforces',
  ],
  education: [
    {
      degree: 'BSc in Computer Science & Engineering',
      institution: 'Z. H. Sikder University of Science and Technology',
      period: '2021 – 2025',
      detail: 'CGPA 3.67 / 4.00',
    },
  ],
});

/* ═══════════════════════════════════════════════════════════════════
   Safety
   ═══════════════════════════════════════════════════════════════════ */

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Every user value reaching the markup passes through here. */
export const esc = (value: string): string => value.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);

/**
 * A URL we are willing to put in an href.
 *
 * Allow-list, not deny-list: anything that is not plainly http(s), mail
 * or tel is rejected, so `javascript:` and `data:text/html` never reach
 * the document however they were typed.
 */
export function safeUrl(raw: string): string | null {
  const text = raw.trim();
  if (text.length === 0) return null;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(text)) return text;
  // Bare domains are what people actually type — "github.com/me".
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(text)) return `https://${text}`;
  return null;
}

/** Only real raster data URLs, and only ones we produced from a file. */
export function safePhoto(value: string | null): string | null {
  if (value === null) return null;
  return /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=\s]+$/.test(value) ? value : null;
}

/* ═══════════════════════════════════════════════════════════════════
   Stylesheet

   Plain CSS, not Tailwind. The print document is standalone — it does
   not load the site's stylesheet — so the CV's styles have to travel
   with it as one string that both surfaces share.
   ═══════════════════════════════════════════════════════════════════ */

export const RESUME_CSS = `
.cv {
  --ink: #111111;
  --muted: #333333;
  --rule: #111111;
  --link: #0b4fa8;
  width: 210mm;
  min-height: 297mm;
  padding: 13mm 14mm;
  box-sizing: border-box;
  background: #ffffff;
  color: var(--ink);
  font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
  font-size: 10.2pt;
  line-height: 1.4;
  -webkit-font-smoothing: antialiased;
}
.cv * { box-sizing: border-box; }
.cv p { margin: 0; }
.cv a { color: var(--link); text-decoration: underline; }

/* ── Header ── */
.cv-head { margin-bottom: 10px; }
.cv--classic .cv-head { text-align: center; }
.cv--portrait .cv-head {
  display: flex;
  align-items: center;
  gap: 14px;
  text-align: left;
}
.cv--portrait .cv-head-body { flex: 1 1 auto; min-width: 0; }
.cv-photo {
  width: 26mm;
  height: 26mm;
  flex: 0 0 auto;
  object-fit: cover;
  border-radius: 2mm;
  border: 1px solid #cccccc;
}
.cv-name {
  margin: 0;
  font-size: 20pt;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.15;
}
.cv-title { margin-top: 1px; font-size: 11pt; color: var(--muted); }
.cv-contact { margin-top: 4px; font-size: 9.4pt; color: var(--muted); }
.cv-contact span + span::before { content: "  ·  "; color: #999999; }
.cv-links { margin-top: 3px; font-size: 9.4pt; }
.cv-links a + a::before { content: "  |  "; color: #999999; text-decoration: none; }

/* ── Sections ── */
.cv-section { margin-top: 11px; break-inside: auto; }
.cv-section > h2 {
  margin: 0 0 5px;
  padding-bottom: 2px;
  border-bottom: 1.4pt solid var(--rule);
  font-size: 11.5pt;
  font-weight: 700;
  letter-spacing: 0.01em;
  break-after: avoid;
}
.cv-entry { margin-top: 7px; break-inside: avoid; }
.cv-entry:first-of-type { margin-top: 0; }
.cv-entry-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
}
.cv-entry-title { font-weight: 700; }
.cv-entry-meta { font-size: 9.4pt; color: var(--muted); white-space: nowrap; }
.cv-entry-sub { font-size: 9.8pt; color: var(--muted); }
.cv-entry-note { margin-top: 1px; font-size: 9.6pt; }
.cv-label { font-weight: 700; }

.cv ul { margin: 3px 0 0; padding-left: 15px; }
.cv li { margin-top: 1.5px; }
.cv-plain { list-style: none; padding-left: 0; }
.cv-plain li { padding-left: 13px; position: relative; }
.cv-plain li::before {
  content: "▪";
  position: absolute;
  left: 0;
  font-size: 8pt;
  line-height: 1.9;
}

/* ── Skills grid ── */
.cv-skills {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px 20px;
}
.cv-skills > div { break-inside: avoid; }

/* ── Print ── */
@page { size: A4; margin: 0; }
@media print {
  html, body { margin: 0; padding: 0; background: #ffffff; }
  .cv { width: auto; min-height: 0; padding: 13mm 14mm; }
  .cv a { color: var(--link); }
}
`;

/* ═══════════════════════════════════════════════════════════════════
   Renderer
   ═══════════════════════════════════════════════════════════════════ */

const has = (value: string | undefined | null): boolean => (value ?? '').trim().length > 0;

const linkHtml = (link: CvLink): string | null => {
  const href = safeUrl(link.url);
  if (href === null) return null;
  const label = has(link.label) ? link.label : link.url.replace(/^https?:\/\//, '');
  return `<a href="${esc(href)}">${esc(label)}</a>`;
};

const bulletsHtml = (bullets: string[]): string => {
  const items = bullets.filter(has);
  if (items.length === 0) return '';
  return `<ul>${items.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`;
};

function sectionHtml(title: string, body: string): string {
  if (body.trim().length === 0) return '';
  return `<section class="cv-section"><h2>${esc(title)}</h2>${body}</section>`;
}

function headerHtml(doc: CvDocument): string {
  const contact = [doc.email, doc.phone, doc.location]
    .filter(has)
    .map((v) => `<span>${esc(v)}</span>`)
    .join('');

  const links = doc.links.map(linkHtml).filter((l): l is string => l !== null).join('');

  const body = [
    `<h1 class="cv-name">${esc(doc.name || 'Your Name')}</h1>`,
    has(doc.title) ? `<p class="cv-title">${esc(doc.title)}</p>` : '',
    contact ? `<p class="cv-contact">${contact}</p>` : '',
    links ? `<p class="cv-links">${links}</p>` : '',
  ].join('');

  if (doc.template === 'portrait') {
    const photo = safePhoto(doc.photo);
    return `<header class="cv-head">${
      photo ? `<img class="cv-photo" src="${esc(photo)}" alt="">` : ''
    }<div class="cv-head-body">${body}</div></header>`;
  }
  return `<header class="cv-head">${body}</header>`;
}

function skillsHtml(groups: CvSkillGroup[]): string {
  const rows = groups
    .filter((g) => has(g.items))
    .map(
      (g) =>
        `<div>${has(g.group) ? `<span class="cv-label">${esc(g.group)}:</span> ` : ''}${esc(g.items)}</div>`,
    );
  return rows.length === 0 ? '' : `<div class="cv-skills">${rows.join('')}</div>`;
}

function experienceHtml(roles: CvRole[]): string {
  return roles
    .filter((r) => has(r.role) || has(r.org))
    .map(
      (r) => `<div class="cv-entry">
        <div class="cv-entry-head">
          <span class="cv-entry-title">${esc(r.role)}</span>
          ${has(r.period) ? `<span class="cv-entry-meta">${esc(r.period)}</span>` : ''}
        </div>
        ${has(r.org) ? `<div class="cv-entry-sub">${esc(r.org)}</div>` : ''}
        ${bulletsHtml(r.bullets)}
      </div>`,
    )
    .join('');
}

function projectsHtml(projects: CvProject[]): string {
  return projects
    .filter((p) => has(p.name))
    .map((p) => {
      const links = p.links.map(linkHtml).filter((l): l is string => l !== null).join('');
      return `<div class="cv-entry">
        <div class="cv-entry-head">
          <span class="cv-entry-title">${esc(p.name)}</span>
          ${links ? `<span class="cv-links">${links}</span>` : ''}
        </div>
        ${has(p.summary) ? `<div class="cv-entry-sub">${esc(p.summary)}</div>` : ''}
        ${has(p.tech) ? `<div class="cv-entry-note"><span class="cv-label">Built with:</span> ${esc(p.tech)}</div>` : ''}
        ${bulletsHtml(p.bullets)}
      </div>`;
    })
    .join('');
}

function educationHtml(entries: CvEducation[]): string {
  return entries
    .filter((e) => has(e.degree) || has(e.institution))
    .map(
      (e) => `<div class="cv-entry">
        <div class="cv-entry-head">
          <span class="cv-entry-title">${esc(e.degree)}</span>
          ${has(e.period) ? `<span class="cv-entry-meta">${esc(e.period)}</span>` : ''}
        </div>
        ${has(e.institution) ? `<div class="cv-entry-sub">${esc(e.institution)}</div>` : ''}
        ${has(e.detail) ? `<div class="cv-entry-note">${esc(e.detail)}</div>` : ''}
      </div>`,
    )
    .join('');
}

const achievementsHtml = (items: string[]): string => {
  const list = items.filter(has);
  return list.length === 0
    ? ''
    : `<ul class="cv-plain">${list.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>`;
};

/**
 * The document, as HTML.
 *
 * Section order is fixed apart from the experience/projects swap. It is
 * not a free-for-all on purpose: the order below is what the checker
 * expects to find, and letting someone drag Education above Experience
 * would let this tool build a CV the tool next door marks down.
 */
export function renderResumeHtml(doc: CvDocument): string {
  const experience = sectionHtml('Experience', experienceHtml(doc.experience));
  const projects = sectionHtml('Projects', projectsHtml(doc.projects));

  const education = sectionHtml('Education', educationHtml(doc.education));
  const work = doc.lead === 'projects' ? [projects, experience] : [experience, projects];

  const body = [
    headerHtml(doc),
    sectionHtml('Summary', has(doc.objective) ? `<p>${esc(doc.objective)}</p>` : ''),
    sectionHtml('Skills', skillsHtml(doc.skills)),
    ...(doc.educationFirst ? [education, ...work] : [...work, education]),
    sectionHtml('Achievements', achievementsHtml(doc.achievements)),
  ].join('');

  return `<article class="cv cv--${doc.template === 'portrait' ? 'portrait' : 'classic'}">${body}</article>`;
}

/** A standalone document for printing — no site CSS, nothing external. */
export function renderPrintDocument(doc: CvDocument): string {
  const title = has(doc.name) ? `${doc.name} — CV` : 'CV';
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<style>
  html, body { margin: 0; padding: 0; background: #fff; }
${RESUME_CSS}
</style>
</head><body>${renderResumeHtml(doc)}</body></html>`;
}

/* ═══════════════════════════════════════════════════════════════════
   Plain text

   For the .txt export, and for handing the document to the checker's
   text path without a round trip through a file.
   ═══════════════════════════════════════════════════════════════════ */

export function toPlainText(doc: CvDocument): string {
  const out: string[] = [];
  const heading = (label: string) => out.push('', label.toUpperCase(), '');

  out.push(doc.name || 'Your Name');
  if (has(doc.title)) out.push(doc.title);
  const contact = [doc.email, doc.phone, doc.location].filter(has).join('  ·  ');
  if (contact) out.push(contact);
  const links = doc.links.filter((l) => has(l.url)).map((l) => `${l.label}: ${l.url}`.trim());
  if (links.length > 0) out.push(links.join('  ·  '));

  if (has(doc.objective)) {
    heading('Summary');
    out.push(doc.objective);
  }

  const skills = doc.skills.filter((s) => has(s.items));
  if (skills.length > 0) {
    heading('Skills');
    for (const s of skills) out.push(has(s.group) ? `${s.group}: ${s.items}` : s.items);
  }

  const writeRoles = () => {
    const roles = doc.experience.filter((r) => has(r.role) || has(r.org));
    if (roles.length === 0) return;
    heading('Experience');
    for (const r of roles) {
      out.push([r.role, r.org, r.period].filter(has).join(' — '));
      for (const b of r.bullets.filter(has)) out.push(`- ${b}`);
      out.push('');
    }
  };

  const writeProjects = () => {
    const projects = doc.projects.filter((p) => has(p.name));
    if (projects.length === 0) return;
    heading('Projects');
    for (const p of projects) {
      out.push([p.name, p.summary].filter(has).join(' — '));
      if (has(p.tech)) out.push(`Built with: ${p.tech}`);
      for (const b of p.bullets.filter(has)) out.push(`- ${b}`);
      out.push('');
    }
  };

  const writeEducation = () => {
    const education = doc.education.filter((e) => has(e.degree) || has(e.institution));
    if (education.length === 0) return;
    heading('Education');
    for (const e of education) {
      out.push([e.degree, e.institution, e.period].filter(has).join(' — '));
      if (has(e.detail)) out.push(e.detail);
    }
  };

  const writeWork = () => {
    if (doc.lead === 'projects') {
      writeProjects();
      writeRoles();
    } else {
      writeRoles();
      writeProjects();
    }
  };

  if (doc.educationFirst) {
    writeEducation();
    writeWork();
  } else {
    writeWork();
    writeEducation();
  }

  const achievements = doc.achievements.filter(has);
  if (achievements.length > 0) {
    heading('Achievements');
    for (const a of achievements) out.push(`- ${a}`);
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Rough completeness, for the progress meter. Not a quality score. */
export function completeness(doc: CvDocument): { done: number; total: number; missing: string[] } {
  const checks: { label: string; ok: boolean }[] = [
    { label: 'Name', ok: has(doc.name) },
    { label: 'Job title', ok: has(doc.title) },
    { label: 'Email', ok: has(doc.email) },
    { label: 'Phone', ok: has(doc.phone) },
    { label: 'Location', ok: has(doc.location) },
    { label: 'A link', ok: doc.links.some((l) => safeUrl(l.url) !== null) },
    { label: 'Summary', ok: doc.objective.trim().length > 40 },
    { label: 'Skills', ok: doc.skills.some((s) => has(s.items)) },
    {
      label: 'Experience or projects',
      ok:
        doc.experience.some((r) => has(r.role) && r.bullets.some(has)) ||
        doc.projects.some((p) => has(p.name) && p.bullets.some(has)),
    },
    { label: 'Education', ok: doc.education.some((e) => has(e.degree)) },
  ];

  return {
    done: checks.filter((c) => c.ok).length,
    total: checks.length,
    missing: checks.filter((c) => !c.ok).map((c) => c.label),
  };
}
