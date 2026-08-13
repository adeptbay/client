'use client';

/**
 * ToolSurface — the one seam between the generic tool page and a tool
 * that needs its own interface.
 *
 * ── Why this exists ─────────────────────────────────────────────────
 *
 * `ToolRunner` renders every tool on the platform from its definition:
 * one input, one options form, one result. That contract is the reason
 * 1000 tools are viable, and bending it for each tool that wants
 * something special is how a platform turns back into 1000 websites.
 *
 * But a handful of tools have a *result* that is the product rather than
 * a value — the CV checker returns a score, seven weighted breakdowns,
 * an ordered list of findings each carrying evidence from the user's own
 * file, a side-by-side parser view and an optional model call. Flattened
 * into `stats[]` that is a row of numbers with the advice deleted.
 *
 * ── The rule for adding one ─────────────────────────────────────────
 *
 * A tool goes in this map only when its output cannot be expressed as
 * text, stats, a table or a diff without losing the thing people came
 * for. "It would look nicer" is not that. The generic runner improves
 * for 1000 pages at once; a custom surface improves for one.
 *
 * ── Why it is lazy ──────────────────────────────────────────────────
 *
 * Exactly the reasoning behind `src/tools/runners.ts`: a static import
 * here would put the CV checker — and the PDF engine behind it — into
 * the shared chunk that `/[category]/[slug]` serves for every tool page
 * on the site. `lazy()` keeps it to one chunk, fetched only on the page
 * that renders it.
 */

import { Suspense, lazy, type ComponentType } from 'react';
import type { ToolMeta } from '@core/tool';
import { ToolRunner } from './ToolRunner';
import { Spinner } from './primitives';

const CUSTOM_SURFACES: Record<string, ComponentType> = {
  'resume-checker': lazy(() =>
    import('./tools/resume-checker/ResumeChecker').then((m) => ({ default: m.ResumeChecker })),
  ),
  'resume-builder': lazy(() =>
    import('./tools/resume-builder/ResumeBuilder').then((m) => ({ default: m.ResumeBuilder })),
  ),
};

export function ToolSurface({ tool }: { tool: ToolMeta }) {
  const Custom = CUSTOM_SURFACES[tool.slug];
  if (!Custom) return <ToolRunner tool={tool} />;

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center gap-3 rounded-xl border border-line bg-panel px-4 py-16">
          <Spinner className="text-brand" />
          <span className="text-sm text-fg-muted">Loading {tool.name}…</span>
        </div>
      }
    >
      <Custom />
    </Suspense>
  );
}
