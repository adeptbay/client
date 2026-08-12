'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Category } from '@core/categories';
import type { SearchEntry } from '@core/search-index';
import { Logo } from './Logo';
import { ToolSearch } from './ToolSearch';
import { ThemeToggle } from './ThemeToggle';
import { CategoryIcon, CloseIcon, MenuIcon } from './Icons';
import { cx } from './primitives';

/**
 * Site header.
 *
 * Fixed height (4rem) and reserved space for every control, so it can
 * never contribute to CLS — which Part 5.8 names as the number one
 * cause of a failing Core Web Vitals score on tool sites.
 */
export function SiteHeader({
  categories,
  searchIndex,
  toolCount,
}: {
  categories: Category[];
  searchIndex: SearchEntry[];
  toolCount: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Route change closes the drawer; otherwise it survives navigation.
  useEffect(() => setMenuOpen(false), [pathname]);

  const primary = categories.slice(0, 5);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="shrink-0 rounded-md" aria-label="AdeptBay home">
          <Logo />
        </Link>

        <nav aria-label="Divisions" className="ml-2 hidden items-center gap-0.5 lg:flex">
          {primary.map((c) => {
            const active = pathname === `/${c.slug}` || pathname.startsWith(`/${c.slug}/`);
            return (
              <Link
                key={c.slug}
                href={`/${c.slug}`}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
                  // Primary navigation is not secondary text. `text-fg-muted`
                  // (#536265) read as disabled next to the wordmark; `text-fg`
                  // is 17:1 on the surface and carries the same weight as the
                  // logo, which is what a top-level nav should do. Hover moves
                  // to brand rather than to a darker grey, because there is
                  // nowhere darker left to go.
                  active ? 'bg-brand-soft text-brand-text' : 'text-fg hover:bg-sunken hover:text-brand-text',
                )}
              >
                {c.name}
              </Link>
            );
          })}
          <Link
            href="/all-tools"
            className="rounded-md px-2.5 py-1.5 text-sm font-medium text-fg transition-colors hover:bg-sunken hover:text-brand-text"
          >
            All tools
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ToolSearch index={searchIndex} />
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-fg-muted hover:bg-sunken hover:text-fg lg:hidden"
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-nav" className="border-t border-line bg-surface lg:hidden">
          <nav aria-label="All divisions" className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
            <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/${c.slug}`}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-fg hover:bg-sunken hover:text-brand-text"
                  >
                    <CategoryIcon path={c.icon} size={17} className="shrink-0 text-fg-subtle" />
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/all-tools"
              className="mt-2 flex items-center justify-between rounded-lg bg-sunken px-3 py-2.5 text-sm font-medium text-fg"
            >
              Browse all tools
              <span className="font-mono text-xs text-fg-subtle">{toolCount}</span>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
