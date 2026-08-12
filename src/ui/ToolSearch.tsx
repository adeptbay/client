"use client";

/**
 * Command palette. Step 04 item 25.
 *
 * The single most-used navigation surface on a site with 1000 entry
 * points: a visitor who landed on one tool from Google finds the next
 * one here instead of leaving. Opens on ⌘K / Ctrl-K or the header
 * button, and works entirely from the keyboard.
 *
 * ── Why this renders through a portal ───────────────────────────────
 * The trigger lives inside <SiteHeader>, which carries `backdrop-blur`.
 * `backdrop-filter` makes an element a CONTAINING BLOCK for
 * position:fixed descendants — so an overlay with `inset-0` rendered in
 * place resolves to the header's 64px box, not the viewport, and the
 * page behind never dims. The header's `z-40` also traps the overlay in
 * a stacking context it cannot escape.
 *
 * Both problems disappear by rendering the dialog as a direct child of
 * <body>. Do not "simplify" this back into the tree.
 */

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
// From `search-index`, not `search`: the latter imports the registry,
// which would pull every tool definition into the client bundle.
import { searchTools, type SearchEntry } from "@core/search-index";
import { cx, Kbd } from "./primitives";
import { CloseIcon, SearchIcon } from "./Icons";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ToolSearch({ index }: { index: SearchEntry[] }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const router = useRouter();
  const listId = useId();

  const results = useMemo(() => searchTools(query, index, 12), [query, index]);

  // A portal needs `document`, which does not exist during SSR.
  useEffect(() => setMounted(true), []);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
    // Return focus where the user left it, or the keyboard is stranded
    // at the top of the document.
    triggerRef.current?.focus();
  }, []);

  // Global shortcut.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /**
   * Focus the input, and lock background scroll.
   *
   * The lock compensates for the scrollbar it removes. Without the
   * padding, hiding a ~15px Windows scrollbar shifts the entire page
   * right the instant the palette opens — a visible jump, and a CLS
   * contribution on the very interaction we tell people to use.
   */
  useEffect(() => {
    if (!open) return;

    inputRef.current?.focus();

    const { body, documentElement } = document;
    const gutter = window.innerWidth - documentElement.clientWidth;
    const prevOverflow = body.style.overflow;
    const prevPadding = body.style.paddingRight;

    body.style.overflow = "hidden";
    if (gutter > 0) {
      body.style.paddingRight = `${gutter}px`;
    }

    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadding;
    };
  }, [open]);

  // Keep the highlighted row inside the scroll container.
  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  /** Trap Tab inside the dialog. Everything behind it is inert. */
  const trapFocus = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !dialogRef.current) return;

    const nodes = [
      ...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
    ].filter((el) => el.offsetParent !== null);
    if (nodes.length === 0) return;

    const first = nodes[0]!;
    const last = nodes[nodes.length - 1]!;

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const onDialogKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
      return;
    }
    trapFocus(e);
  };

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % Math.max(1, results.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(Math.max(0, results.length - 1));
    } else if (e.key === "Enter") {
      const hit = results[active];
      if (hit) {
        e.preventDefault();
        router.push(`/${hit.category}/${hit.slug}`);
        close();
      }
    }
  };

  const dialog = (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto
                 bg-ink-950/50 p-4 pt-[10vh] backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search tools"
        onKeyDown={onDialogKeyDown}
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
            onKeyDown={onInputKeyDown}
            // The real count, not the target. "Search 1000+ tools" while
            // 14 are live is the kind of claim the voice guide rules out.
            placeholder={`Search ${index.length} tools…`}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              results[active] ? `${listId}-${active}` : undefined
            }
            autoComplete="off"
            spellCheck={false}
            className="h-12 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-fg-subtle"
          />
          <button
            type="button"
            onClick={close}
            aria-label="Close search"
            className="shrink-0 rounded text-fg-subtle hover:text-fg"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {results.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-fg-subtle">
            Nothing matches “{query}”. Try a shorter word, or{" "}
            <Link
              href="/all-tools"
              onClick={close}
              className="text-brand-text underline"
            >
              browse every tool
            </Link>
            .
          </p>
        ) : (
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            className="scroll-slim max-h-80 overflow-y-auto p-2"
          >
            {results.map((r, i) => (
              <li
                key={`${r.category}/${r.slug}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
              >
                <Link
                  href={`/${r.category}/${r.slug}`}
                  onClick={close}
                  onMouseEnter={() => setActive(i)}
                  // Rows are reached with the arrow keys, not Tab — Tab
                  // should move between the input and the close button.
                  tabIndex={-1}
                  className={cx(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                    i === active ? "bg-brand-soft" : "hover:bg-sunken",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-fg">
                      {r.name}
                    </span>
                    <span className="block truncate text-xs text-fg-subtle">
                      {r.tagline}
                    </span>
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
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
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

      {/* Rendered at <body>, outside the header's backdrop-filter
          containing block. See the note at the top of this file. */}
      {open && mounted && createPortal(dialog, document.body)}
    </>
  );
}
