'use client';

/**
 * Form surfaces for the builder.
 *
 * Two rules shape everything here:
 *
 *  1. **The hint sits under the field it is about.** Advice printed at
 *     the top of a form is advice nobody reads; advice attached to the
 *     bullet it describes gets acted on while the bullet is still being
 *     written.
 *  2. **Nothing blocks.** Hints never prevent a save, never rewrite the
 *     input and never gate the export. This is someone's career history,
 *     and a form that argues back is a form that loses the true thing
 *     they were trying to say.
 */

import { useId, type ReactNode } from 'react';
import type { Hint } from '@engines/resume/coach';
import { AlertIcon, ChevronDownIcon, CloseIcon, InfoIcon } from '@ui/Icons';
import { Button, IconButton, Input, Textarea, cx } from '@ui/primitives';

/* ── Hints ──────────────────────────────────────────────────────── */

export function Hints({ hints }: { hints: Hint[] }) {
  if (hints.length === 0) return null;

  return (
    <ul className="mt-1 space-y-0.5">
      {hints.map((hint, i) => (
        <li
          key={i}
          className={cx(
            'flex items-start gap-1.5 text-[11.5px] leading-snug',
            hint.level === 'warn' ? 'text-warn' : 'text-fg-subtle',
          )}
        >
          {hint.level === 'warn' ? (
            <AlertIcon size={12} className="mt-0.5 shrink-0" />
          ) : (
            <InfoIcon size={12} className="mt-0.5 shrink-0" />
          )}
          {hint.text}
        </li>
      ))}
    </ul>
  );
}

/* ── Fields ─────────────────────────────────────────────────────── */

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  hints = [],
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  type?: string;
  hints?: Hint[];
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-[12px] font-medium text-fg-muted">
        {label}
      </label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="mt-1"
      />
      <Hints hints={hints} />
    </div>
  );
}

export function AreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  hints = [],
  counter,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
  hints?: Hint[];
  counter?: boolean;
}) {
  const id = useId();
  const words = value.trim() === '' ? 0 : value.trim().split(/\s+/).length;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="block text-[12px] font-medium text-fg-muted">
          {label}
        </label>
        {counter && <span className="font-mono text-[11px] text-fg-subtle">{words} words</span>}
      </div>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="mt-1"
      />
      <Hints hints={hints} />
    </div>
  );
}

/* ── Repeatable lists ───────────────────────────────────────────── */

/**
 * A list of bullets with add, remove, reorder and per-bullet coaching.
 *
 * Reorder matters more than it looks: a recruiter reads the first two
 * bullets of a role and skims the rest, so being able to move the
 * strongest one to the top is a real edit, not a convenience.
 */
export function BulletEditor({
  label,
  bullets,
  onChange,
  hintsFor,
  placeholder,
}: {
  label: string;
  bullets: string[];
  onChange: (next: string[]) => void;
  hintsFor: (text: string) => Hint[];
  placeholder?: string;
}) {
  const set = (index: number, value: string) =>
    onChange(bullets.map((b, i) => (i === index ? value : b)));

  const move = (from: number, to: number) => {
    if (to < 0 || to >= bullets.length) return;
    const next = [...bullets];
    const [item] = next.splice(from, 1);
    if (item !== undefined) next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div>
      <span className="block text-[12px] font-medium text-fg-muted">{label}</span>
      <ul className="mt-1 space-y-2">
        {bullets.map((bullet, i) => (
          <li key={i}>
            <div className="flex items-start gap-1.5">
              <Textarea
                value={bullet}
                onChange={(e) => set(i, e.target.value)}
                rows={2}
                placeholder={placeholder}
                aria-label={`${label} ${i + 1}`}
                className="flex-1"
              />
              <span className="flex shrink-0 flex-col gap-0.5">
                <IconButton
                  label={`Move up`}
                  disabled={i === 0}
                  onClick={() => move(i, i - 1)}
                  className="h-6 w-6"
                >
                  <span aria-hidden="true" className="text-[11px]">
                    ↑
                  </span>
                </IconButton>
                <IconButton
                  label={`Move down`}
                  disabled={i === bullets.length - 1}
                  onClick={() => move(i, i + 1)}
                  className="h-6 w-6"
                >
                  <span aria-hidden="true" className="text-[11px]">
                    ↓
                  </span>
                </IconButton>
                <IconButton
                  label="Remove"
                  onClick={() => onChange(bullets.filter((_, k) => k !== i))}
                  className="h-6 w-6"
                >
                  <CloseIcon size={12} />
                </IconButton>
              </span>
            </div>
            <Hints hints={hintsFor(bullet)} />
          </li>
        ))}
      </ul>
      <Button size="sm" variant="ghost" className="mt-1.5" onClick={() => onChange([...bullets, ''])}>
        + Add bullet
      </Button>
    </div>
  );
}

/** A card wrapping one repeated entry — a role, a project, a degree. */
export function EntryCard({
  title,
  index,
  count,
  onRemove,
  onMove,
  children,
}: {
  title: string;
  index: number;
  count: number;
  onRemove: () => void;
  onMove: (from: number, to: number) => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line bg-sunken p-3">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-fg">
          {title || `Untitled ${index + 1}`}
        </span>
        <IconButton label="Move up" disabled={index === 0} onClick={() => onMove(index, index - 1)} className="h-6 w-6">
          <span aria-hidden="true" className="text-[11px]">
            ↑
          </span>
        </IconButton>
        <IconButton
          label="Move down"
          disabled={index === count - 1}
          onClick={() => onMove(index, index + 1)}
          className="h-6 w-6"
        >
          <span aria-hidden="true" className="text-[11px]">
            ↓
          </span>
        </IconButton>
        <IconButton label="Remove" onClick={onRemove} className="h-6 w-6">
          <CloseIcon size={13} />
        </IconButton>
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

/** A collapsible group of the form. */
export function FormSection({
  title,
  meta,
  open,
  onToggle,
  children,
}: {
  title: string;
  meta?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-panel">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-sunken"
      >
        <span className="flex-1 text-[13.5px] font-semibold text-fg">{title}</span>
        {meta && <span className="font-mono text-[11px] text-fg-subtle">{meta}</span>}
        <ChevronDownIcon
          size={15}
          className={cx('shrink-0 text-fg-subtle transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && <div className="space-y-3 border-t border-line px-3.5 py-3.5">{children}</div>}
    </section>
  );
}
