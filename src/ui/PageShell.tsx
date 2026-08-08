import type { ReactNode } from 'react';
import { Breadcrumb } from './ToolSections';

/**
 * Wrapper for every non-tool page: policies, About, Methodology, the
 * roadmap. One shell means the whole set stays typographically
 * consistent, and adding the next policy page is a matter of writing
 * the words.
 */
export function PageShell({
  title,
  lead,
  updated,
  crumbs = [],
  children,
  wide = false,
}: {
  title: string;
  lead?: string;
  /** ISO date. Shown as "Last updated" — Part 5.10 tactic 5. */
  updated?: string;
  crumbs?: { name: string; href?: string }[];
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`mx-auto ${wide ? 'max-w-5xl' : 'max-w-3xl'} px-4 py-6 sm:px-6 sm:py-10`}>
      <Breadcrumb items={[{ name: 'Home', href: '/' }, ...crumbs, { name: title }]} />

      <header className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">{title}</h1>
        {lead && <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">{lead}</p>}
        {updated && <p className="mt-3 text-xs text-fg-subtle">Last updated {updated}</p>}
      </header>

      <div className="prose-bay mt-8">{children}</div>
    </div>
  );
}
