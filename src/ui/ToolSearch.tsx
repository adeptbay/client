'use client';

/**
 * Command palette. Step 04 item 25.
 *
 * The single most-used navigation surface on a site with 1000 entry
 * points: a visitor who landed on one tool from Google finds the next
 * one here instead of leaving. Opens on ⌘K / Ctrl-K or the header
 * button, and works entirely from the keyboard.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
// From `search-index`, not `search`: the latter imports the registry,
// which would pull every tool definition into the client bundle.
import { searchTools, type SearchEntry } from '@core/search-index';
import { cx, Kbd } from './primitives';
import { CloseIcon, SearchIcon } from './Icons';

export function ToolSearch({ index }: { index: SearchEntry[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const router = useRouter();
  const listId = useId();

  const results = useMemo(() => searchTools(query, index, 12), [query, index]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActive(0);
  }, []);

  // Global shortcut.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  // Focus the input and lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Keep the highlighted row inside the scroll container.
  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % Math.max(1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === 'Enter') {
      const hit = results[active];
      if (hit) {
        e.preventDefault();
        router.push(`/${hit.category}/${hit.slug}`);
        close();
      }
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex h-9 items-center gap-2 rounded-lg border border-line bg-sunken px-2.5 text-sm
                   text-fg-subtle transition-colors hover:border-line-strong hover:text-fg-muted
                   sm:w-56 lg:w-64"
      >
        <SearchIcon size={16} className="shrink-0" />
        <span className="hidden flex-1 text-left sm:block">Search tools</span>
        <span className="hidden sm:block">
          <Kbd>⌘K</Kbd>
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-ink-950/50 p-4 pt-[10vh] backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search tools"
            className="w-full max-w-xl overflow-hidden rounded-xl border border-line bg-panel shadow-pop"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <SearchIcon size={18} className="shrink-0 text-fg-subtle" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="Search 1000+ tools…"
                aria-controls={listId}
                aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
                className="h-12 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-fg-subtle"
              />
              <button
                type="button"
                onClick={close}
                aria-label="Close search"
                className="shrink-0 text-fg-subtle hover:text-fg"
              >
                <CloseIcon size={18} />
              </button>
            </div>

            {results.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-fg-subtle">
                Nothing matches “{query}”. Try a shorter word, or{' '}
                <Link href="/all-tools" onClick={close} className="text-brand-text underline">
                  browse every tool
                </Link>
                .
              </p>
            ) : (
              <ul ref={listRef} id={listId} role="listbox" className="scroll-slim max-h-80 overflow-y-auto p-2">
                {results.map((r, i) => (
                  <li key={`${r.category}/${r.slug}`} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                    <Link
                      href={`/${r.category}/${r.slug}`}
                      onClick={close}
                      onMouseEnter={() => setActive(i)}
                      className={cx(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                        i === active ? 'bg-brand-soft' : 'hover:bg-sunken',
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-fg">{r.name}</span>
                        <span className="block truncate text-xs text-fg-subtle">{r.tagline}</span>
                      </span>
                      <span className="shrink-0 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
                        {r.category}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center gap-4 border-t border-line bg-sunken px-4 py-2 text-[11px] text-fg-subtle">
              <span className="flex items-center gap-1">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> navigate
              </span>
              <span className="flex items-center gap-1">
                <Kbd>↵</Kbd> open
              </span>
              <span className="flex items-center gap-1">
                <Kbd>esc</Kbd> close
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
