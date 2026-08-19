'use client';

/**
 * The CV builder.
 *
 * ── What the competition does, and what this does instead ───────────
 *
 * The dominant pattern is a free editor with a paid download: Zety,
 * Resume.io, Enhancv and Kickresume all let someone spend an hour on
 * their CV and then meet a paywall at the export. Canva exports freely
 * and produces two-column, text-box layouts that parse badly. Every one
 * of them requires an account first.
 *
 * This has no account, no export wall, and no server: the document lives
 * in this tab, is saved to this browser, and is typeset by the browser's
 * own print engine. There is nothing to charge for releasing because
 * there is no server-side copy to release.
 *
 * ── Why the export prints instead of writing a PDF ──────────────────
 *
 * See the note in `engines/resume/document.ts`. Short version: the 14
 * standard PDF fonts are Latin-1, so a hand-written PDF renders "মোঃ
 * ফাহিম" as boxes. The browser already has the fonts and the shaping
 * engine, and it produces real selectable text — which is exactly what
 * the checker next door needs to read.
 *
 * The print layer is a portal to a direct child of `<body>`, not an
 * iframe: the site's CSP sets `frame-src 'none'`, and this way the
 * printed pixels come from the same DOM and the same stylesheet as the
 * preview, so the two cannot drift apart.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  RESUME_CSS,
  TEMPLATES,
  completeness,
  emptyDocument,
  renderResumeHtml,
  safePhoto,
  sampleDocument,
  toPlainText,
  type CvDocument,
  type CvLink,
  type TemplateId,
} from '@engines/resume/document';
import { bulletHints, summaryHints } from '@engines/resume/coach';
import { CopyButton, DownloadButton } from '@ui/Actions';
import { AlertIcon, ArrowRightIcon, CheckIcon, DownloadIcon, ShieldIcon } from '@ui/Icons';
import { Button, Input, cx } from '@ui/primitives';
import { AreaField, BulletEditor, EntryCard, FormSection, TextField } from './fields';

const STORAGE_KEY = 'adeptbay.cv.v1';
/** A4 width in CSS pixels at 96dpi, which is what the preview is drawn at. */
const A4_PX = 794;

/* ── Demo placeholders ──────────────────────────────────────────────
   Every hint in this form belongs to one person: the same person
   "Load sample" fills in (`sampleDocument`). A form whose name hint is
   one person and whose email hint is another reads as broken sample
   data rather than as a worked example. So the hints are read off
   `sampleDocument()` itself rather than retyped — the two cannot drift
   apart, because they are the same document.

   The rows below are indexed, not repeated. Three link rows all hinting
   "Portfolio / github.com/you" is one hint printed three times, and it
   never says what belongs in row two — which is the whole reason the
   row exists. `i % length` keeps a hint on rows the user adds later. */
const DEMO = sampleDocument();

const DEMO_LINKS: CvLink[] = DEMO.links;

const DEMO_PROJECT_LINKS: CvLink[] = [
  DEMO.projects[0]!.links[0]!,
  { label: 'Code', url: 'github.com/muntasir3301/one-click-travel-admin' },
];

const DEMO_SKILLS = DEMO.skills;

type SectionKey = 'basics' | 'summary' | 'skills' | 'experience' | 'projects' | 'achievements' | 'education';

export function ResumeBuilder() {
  const [doc, setDoc] = useState<CvDocument>(emptyDocument);
  const [open, setOpen] = useState<SectionKey>('basics');
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [restored, setRestored] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const patch = useCallback(
    (next: Partial<CvDocument>) => setDoc((current) => ({ ...current, ...next })),
    [],
  );

  /* ── Persistence ───────────────────────────────────────────────
     A CV represents an hour of someone's evening. Losing it to a
     refresh is the one failure this tool is not allowed to have, and
     localStorage keeps the promise that nothing is uploaded. */

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === null) return;
      const parsed = JSON.parse(saved) as Partial<CvDocument>;
      // Merged over a fresh document so a field added in a later version
      // is present rather than undefined.
      setDoc({ ...emptyDocument(), ...parsed });
      setRestored(true);
    } catch {
      /* corrupt or unavailable storage is not worth an error message */
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
      } catch {
        /* private mode, quota — the document is still in memory */
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [doc]);

  /* ── Rendered document ── */
  const html = useMemo(() => renderResumeHtml(doc), [doc]);
  const text = useMemo(() => toPlainText(doc), [doc]);
  const progress = useMemo(() => completeness(doc), [doc]);

  /* ── Preview, scaled to the pane ── */
  const frameRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pageHeight, setPageHeight] = useState(1123);

  useEffect(() => {
    const frame = frameRef.current;
    if (frame === null) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? A4_PX;
      setScale(Math.min(1, width / A4_PX));
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const page = pageRef.current;
    if (page === null) return;
    const observer = new ResizeObserver(() => setPageHeight(page.offsetHeight));
    observer.observe(page);
    setPageHeight(page.offsetHeight);
    return () => observer.disconnect();
  }, [html]);

  /* ── Photo ──────────────────────────────────────────────────────
     Downscaled here rather than stored raw: a 4MB phone photo would
     blow the localStorage quota and bloat the print layer for a stamp
     that renders at 26mm. */

  const onPhoto = async (file: File) => {
    setPhotoError(null);
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      setPhotoError('PNG, JPEG or WebP only.');
      return;
    }
    try {
      const dataUrl = await downscale(file, 420);
      patch({ photo: safePhoto(dataUrl) });
    } catch {
      setPhotoError('That image could not be read.');
    }
  };

  /* ── Export ── */
  const print = () => {
    document.body.classList.add('cv-printing');
    const cleanup = () => {
      document.body.classList.remove('cv-printing');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    // One frame so the print layer is committed before the dialog opens.
    requestAnimationFrame(() => {
      window.print();
      // Safari never fires afterprint reliably; belt and braces.
      setTimeout(cleanup, 1000);
    });
  };

  const reset = () => {
    setDoc(emptyDocument());
    setRestored(false);
    setOpen('basics');
  };

  const fileBase = (doc.name.trim() || 'cv').replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '');

  return (
    <div className="space-y-4">
      {/* The stylesheet the preview and the print layer share. */}
      <style dangerouslySetInnerHTML={{ __html: `${RESUME_CSS}\n${PRINT_LAYER_CSS}` }} />

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-panel p-3">
        <div className="flex items-center gap-1.5">
          {TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => patch({ template: template.id })}
              aria-pressed={doc.template === template.id}
              title={template.note}
              className={cx(
                'rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors',
                doc.template === template.id
                  ? 'border-brand bg-brand-soft text-brand-text'
                  : 'border-line bg-panel text-fg-muted hover:border-line-strong hover:bg-sunken',
              )}
            >
              {template.name}
            </button>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] text-fg-subtle">
            {progress.done}/{progress.total}
          </span>
          <Button size="sm" variant="secondary" onClick={() => setDoc(sampleDocument())}>
            Sample
          </Button>
          <Button size="sm" variant="secondary" onClick={reset}>
            Clear
          </Button>
          <DownloadButton
            value={text}
            filename={`${fileBase}.txt`}
            label=".txt"
            mime="text/plain;charset=utf-8"
          />
          <Button size="md" variant="primary" onClick={print}>
            <DownloadIcon size={15} />
            Download PDF
          </Button>
        </div>
      </div>

      {restored && (
        <p className="flex items-center gap-2 rounded-lg border border-brand-line bg-brand-soft px-3 py-2 text-[12.5px] text-fg">
          <CheckIcon size={13} className="shrink-0 text-brand-text" />
          Restored your draft from this browser.
        </p>
      )}

      {/* ── Mobile tabs ── */}
      <div className="flex gap-1 rounded-lg border border-line bg-sunken p-1 lg:hidden">
        {(['edit', 'preview'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={cx(
              'flex-1 rounded-md px-3 py-1.5 text-[13px] font-medium capitalize transition-colors',
              tab === key ? 'bg-panel text-fg shadow-panel' : 'text-fg-muted',
            )}
          >
            {key}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ── Form ── */}
        <div className={cx('space-y-2.5', tab === 'preview' && 'hidden lg:block')}>
          <FormSection
            title="Basics"
            open={open === 'basics'}
            onToggle={() => setOpen(open === 'basics' ? 'summary' : 'basics')}
          >
            <div className="grid gap-2.5 sm:grid-cols-2">
              <TextField label="Full name" value={doc.name} onChange={(v) => patch({ name: v })} placeholder={DEMO.name} />
              <TextField
                label="Job title"
                value={doc.title}
                onChange={(v) => patch({ title: v })}
                placeholder={DEMO.title}
              />
              <TextField
                label="Email"
                type="email"
                value={doc.email}
                onChange={(v) => patch({ email: v })}
                placeholder={DEMO.email}
              />
              <TextField label="Phone" value={doc.phone} onChange={(v) => patch({ phone: v })} placeholder={DEMO.phone} />
            </div>
            <TextField
              label="Location"
              value={doc.location}
              onChange={(v) => patch({ location: v })}
              placeholder={DEMO.location}
            />

            <LinkRows links={doc.links} onChange={(links) => patch({ links })} />

            {doc.template === 'portrait' && (
              <PhotoField
                photo={doc.photo}
                error={photoError}
                onPick={onPhoto}
                onClear={() => patch({ photo: null })}
              />
            )}
          </FormSection>

          <FormSection
            title="Summary"
            open={open === 'summary'}
            onToggle={() => setOpen(open === 'summary' ? 'basics' : 'summary')}
          >
            <AreaField
              label="Three sentences: what you do, how long, and one result"
              value={doc.objective}
              onChange={(v) => patch({ objective: v })}
              rows={5}
              counter
              hints={summaryHints(doc.objective)}
              placeholder="Full stack developer with two years building production web apps in React and Node. Shipped a storefront handling 4,000 orders a month and cut checkout drop-off from 34% to 28%."
            />
          </FormSection>

          <FormSection
            title="Skills"
            meta={`${doc.skills.filter((s) => s.items.trim()).length}`}
            open={open === 'skills'}
            onToggle={() => setOpen(open === 'skills' ? 'basics' : 'skills')}
          >
            {doc.skills.map((group, i) => {
              const hint = DEMO_SKILLS[i % DEMO_SKILLS.length]!;
              return (
                <div key={i} className="flex items-start gap-1.5">
                  <Input
                    value={group.group}
                    onChange={(e) =>
                      patch({ skills: doc.skills.map((s, k) => (k === i ? { ...s, group: e.target.value } : s)) })
                    }
                    placeholder={hint.group}
                    aria-label={`Skill group ${i + 1}`}
                    // Same cascade trap as the link rows; `basis-1/3` keeps the
                    // third the author intended, since the items field beside it
                    // holds a whole comma-separated list.
                    className="min-w-0 basis-1/3"
                  />
                  <Input
                    value={group.items}
                    onChange={(e) =>
                      patch({ skills: doc.skills.map((s, k) => (k === i ? { ...s, items: e.target.value } : s)) })
                    }
                    placeholder={hint.items}
                    aria-label={`Skills in group ${i + 1}`}
                    className="min-w-0 flex-1"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => patch({ skills: doc.skills.filter((_, k) => k !== i) })}
                    aria-label={`Remove skill group ${i + 1}`}
                  >
                    ×
                  </Button>
                </div>
              );
            })}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => patch({ skills: [...doc.skills, { group: '', items: '' }] })}
            >
              + Add group
            </Button>
            <p className="text-[11.5px] leading-snug text-fg-subtle">
              Group them — Languages, Frontend, Backend, Tools. Concrete and checkable only.
            </p>
          </FormSection>

          <FormSection
            title="Experience"
            meta={`${doc.experience.filter((r) => r.role.trim()).length}`}
            open={open === 'experience'}
            onToggle={() => setOpen(open === 'experience' ? 'basics' : 'experience')}
          >
            <ListEditor
              items={doc.experience}
              onChange={(experience) => patch({ experience })}
              blank={{ role: '', org: '', period: '', bullets: [''] }}
              addLabel="+ Add role"
              titleOf={(r) => r.role}
              render={(role, set) => (
                <>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <TextField label="Job title" value={role.role} onChange={(v) => set({ role: v })} placeholder={DEMO.experience[1]!.role} />
                    <TextField label="Employer" value={role.org} onChange={(v) => set({ org: v })} placeholder={DEMO.experience[1]!.org} />
                  </div>
                  <TextField
                    label="Dates"
                    value={role.period}
                    onChange={(v) => set({ period: v })}
                    placeholder={DEMO.experience[1]!.period}
                  />
                  <BulletEditor
                    label="What changed while you were there"
                    bullets={role.bullets}
                    onChange={(bullets) => set({ bullets })}
                    hintsFor={bulletHints}
                    placeholder={DEMO.experience[1]!.bullets[0]}
                  />
                </>
              )}
            />
          </FormSection>

          <FormSection
            title="Projects"
            meta={`${doc.projects.filter((p) => p.name.trim()).length}`}
            open={open === 'projects'}
            onToggle={() => setOpen(open === 'projects' ? 'basics' : 'projects')}
          >
            <ListEditor
              items={doc.projects}
              onChange={(projects) => patch({ projects })}
              blank={{ name: '', summary: '', tech: '', links: [{ label: 'Live', url: '' }], bullets: [''] }}
              addLabel="+ Add project"
              titleOf={(p) => p.name}
              render={(project, set) => (
                <>
                  <TextField label="Name" value={project.name} onChange={(v) => set({ name: v })} placeholder={DEMO.projects[0]!.name} />
                  <TextField
                    label="One line on what it is"
                    value={project.summary}
                    onChange={(v) => set({ summary: v })}
                    placeholder={DEMO.projects[0]!.summary}
                  />
                  <TextField
                    label="Built with"
                    value={project.tech}
                    onChange={(v) => set({ tech: v })}
                    placeholder={DEMO.projects[0]!.tech}
                  />
                  <LinkRows links={project.links} onChange={(links) => set({ links })} compact />
                  <BulletEditor
                    label="What it does, with a number"
                    bullets={project.bullets}
                    onChange={(bullets) => set({ bullets })}
                    hintsFor={bulletHints}
                    placeholder="Added real-time currency conversion, lifting overseas checkouts 19%"
                  />
                </>
              )}
            />
            <label className="flex items-center gap-2 text-[12px] text-fg-muted">
              <input
                type="checkbox"
                checked={doc.lead === 'projects'}
                onChange={(e) => patch({ lead: e.target.checked ? 'projects' : 'experience' })}
                className="h-3.5 w-3.5 accent-brand"
              />
              Put Projects above Experience
            </label>
          </FormSection>

          <FormSection
            title="Achievements"
            meta={`${doc.achievements.filter(Boolean).length}`}
            open={open === 'achievements'}
            onToggle={() => setOpen(open === 'achievements' ? 'basics' : 'achievements')}
          >
            <BulletEditor
              label="Contests, awards, rankings"
              bullets={doc.achievements}
              onChange={(achievements) => patch({ achievements })}
              hintsFor={() => []}
              placeholder={DEMO.achievements[0]}
            />
          </FormSection>

          <FormSection
            title="Education"
            meta={`${doc.education.filter((e) => e.degree.trim()).length}`}
            open={open === 'education'}
            onToggle={() => setOpen(open === 'education' ? 'basics' : 'education')}
          >
            <ListEditor
              items={doc.education}
              onChange={(education) => patch({ education })}
              blank={{ degree: '', institution: '', period: '', detail: '' }}
              addLabel="+ Add qualification"
              titleOf={(e) => e.degree}
              render={(entry, set) => (
                <>
                  <TextField
                    label="Qualification"
                    value={entry.degree}
                    onChange={(v) => set({ degree: v })}
                    placeholder={DEMO.education[0]!.degree}
                  />
                  <TextField
                    label="Institution"
                    value={entry.institution}
                    onChange={(v) => set({ institution: v })}
                    placeholder={DEMO.education[0]!.institution}
                  />
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <TextField label="Dates" value={entry.period} onChange={(v) => set({ period: v })} placeholder={DEMO.education[0]!.period} />
                    <TextField label="Result" value={entry.detail} onChange={(v) => set({ detail: v })} placeholder={DEMO.education[0]!.detail} />
                  </div>
                </>
              )}
            />
            {/* The checker marks this in both directions, so it is a real
                edit rather than a preference. */}
            <label className="flex items-start gap-2 text-[12px] leading-snug text-fg-muted">
              <input
                type="checkbox"
                checked={doc.educationFirst}
                onChange={(e) => patch({ educationFirst: e.target.checked })}
                className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-brand"
              />
              Put Education above Experience — right for students and new graduates, wrong once you
              have a few years of work.
            </label>
          </FormSection>

          {progress.missing.length > 0 && (
            <p className="flex items-start gap-2 rounded-lg border border-line bg-sunken px-3 py-2.5 text-[12px] leading-relaxed text-fg-muted">
              <AlertIcon size={13} className="mt-0.5 shrink-0 text-warn" />
              Still empty: {progress.missing.join(', ')}.
            </p>
          )}
        </div>

        {/* ── Preview ── */}
        <div className={cx(tab === 'edit' && 'hidden lg:block')}>
          <div className="lg:sticky lg:top-20">
            <div
              ref={frameRef}
              className="scroll-slim max-h-[78vh] overflow-auto rounded-xl border border-line bg-sunken p-3"
            >
              <div style={{ height: pageHeight * scale }}>
                <div
                  ref={pageRef}
                  style={{
                    width: A4_PX,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                  }}
                  className="shadow-pop"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <CopyButton value={text} label="Copy as text" />
              <Link
                href="/career/resume-checker"
                className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-brand-text hover:underline"
              >
                Score this CV
                <ArrowRightIcon size={13} />
              </Link>
              <span className="ml-auto flex items-center gap-1.5 text-[11.5px] text-fg-subtle">
                <ShieldIcon size={12} className="text-brand-text" />
                Saved in this browser only
              </span>
            </div>
          </div>
        </div>
      </div>

      <PrintLayer html={html} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Print layer
   ═══════════════════════════════════════════════════════════════════ */

const PRINT_LAYER_CSS = `
#cv-print-layer { display: none; }
@media print {
  body > *:not(#cv-print-layer) { display: none !important; }
  #cv-print-layer { display: block !important; }
  #cv-print-layer .cv { width: auto; box-shadow: none; }
}
`;

/**
 * The CV, mounted as a direct child of `<body>`.
 *
 * That position is the whole trick: `body > *:not(#cv-print-layer)`
 * hides the entire site in one selector at print time, with no
 * dependence on where in the React tree the builder happens to sit.
 */
function PrintLayer({ html }: { html: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div id="cv-print-layer" aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />,
    document.body,
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Small pieces
   ═══════════════════════════════════════════════════════════════════ */

function LinkRows({
  links,
  onChange,
  compact = false,
}: {
  links: CvLink[];
  onChange: (next: CvLink[]) => void;
  compact?: boolean;
}) {
  const set = (i: number, patch: Partial<CvLink>) =>
    onChange(links.map((l, k) => (k === i ? { ...l, ...patch } : l)));

  // A project links to its deployment and its repository; a person links
  // to a portfolio, a profile and a network. Different rows, different hints.
  const hints = compact ? DEMO_PROJECT_LINKS : DEMO_LINKS;

  return (
    <div>
      <span className="block text-[12px] font-medium text-fg-muted">Links</span>
      <div className="mt-1 space-y-1.5">
        {links.map((link, i) => {
          const hint = hints[i % hints.length]!;
          return (
            <div key={i} className="flex items-center gap-1.5">
              {/* Both fields size from flex-basis, not width. `Input`'s base
                  class already sets `w-full`, and Tailwind emits `w-full`
                  after any arbitrary width, so a `w-[30%]` here silently lost
                  the cascade and collapsed the URL field. `min-w-0` lets them
                  shrink past an input's intrinsic ~20ch width in this column. */}
              <Input
                value={link.label}
                onChange={(e) => set(i, { label: e.target.value })}
                placeholder={hint.label}
                aria-label={`Link label ${i + 1}`}
                className="min-w-0 flex-1"
              />
              <Input
                value={link.url}
                onChange={(e) => set(i, { url: e.target.value })}
                placeholder={hint.url}
                aria-label={`Link URL ${i + 1}`}
                className="min-w-0 flex-1"
              />
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0"
                onClick={() => onChange(links.filter((_, k) => k !== i))}
                aria-label={`Remove link ${i + 1}`}
              >
                ×
              </Button>
            </div>
          );
        })}
      </div>
      <Button size="sm" variant="ghost" className="mt-1" onClick={() => onChange([...links, { label: '', url: '' }])}>
        + Add link
      </Button>
    </div>
  );
}

function PhotoField({
  photo,
  error,
  onPick,
  onClear,
}: {
  photo: string | null;
  error: string | null;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  return (
    <div>
      <span className="block text-[12px] font-medium text-fg-muted">Photo</span>
      <div className="mt-1 flex items-center gap-3">
        {photo !== null && (
          // Rendering a user-selected data URL; next/image adds nothing here.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="h-14 w-14 rounded-md border border-line object-cover" />
        )}
        <label className="cursor-pointer rounded-md border border-line bg-panel px-3 py-1.5 text-[12.5px] text-fg-muted hover:bg-sunken">
          {photo === null ? 'Choose image' : 'Replace'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onPick(file);
              e.target.value = '';
            }}
          />
        </label>
        {photo !== null && (
          <Button size="sm" variant="ghost" onClick={onClear}>
            Remove
          </Button>
        )}
      </div>

      {error !== null && <p className="mt-1 text-[11.5px] text-danger">{error}</p>}

      {/* The same market nuance the checker reports, said before the
          mistake rather than after it. */}
      <p className="mt-1.5 flex items-start gap-1.5 text-[11.5px] leading-snug text-fg-subtle">
        <AlertIcon size={12} className="mt-0.5 shrink-0 text-warn" />
        Conventional in Bangladesh, the Gulf and much of Europe. Leave it off for the US, UK, Canada
        and Australia, where recruiters are trained to discard CVs carrying a photo.
      </p>
    </div>
  );
}

/** Generic add / remove / reorder over a list of entries. */
function ListEditor<T>({
  items,
  onChange,
  blank,
  addLabel,
  titleOf,
  render,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  blank: T;
  addLabel: string;
  titleOf: (item: T) => string;
  render: (item: T, set: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    if (moved !== undefined) next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <div className="space-y-2.5">
      {items.map((item, i) => (
        <EntryCard
          key={i}
          title={titleOf(item)}
          index={i}
          count={items.length}
          onRemove={() => onChange(items.filter((_, k) => k !== i))}
          onMove={move}
        >
          {render(item, (patch) => onChange(items.map((x, k) => (k === i ? { ...x, ...patch } : x))))}
        </EntryCard>
      ))}
      <Button size="sm" variant="ghost" onClick={() => onChange([...items, structuredClone(blank)])}>
        {addLabel}
      </Button>
    </div>
  );
}

/* ── Image downscaling ──────────────────────────────────────────── */

/** Reduce to `max` on the long edge and re-encode, as a data URL. */
function downscale(file: File, max: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(1, max / Math.max(image.width, image.height));
      const width = Math.round(image.width * ratio);
      const height = Math.round(image.height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (context === null) {
        reject(new Error('canvas unavailable'));
        return;
      }
      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode failed'));
    };
    image.src = url;
  });
}
