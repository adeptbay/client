'use client';

import { useEffect, useState } from 'react';
import { cx } from './primitives';
import { AlertIcon, CheckIcon, CloseIcon } from './Icons';

/* ── ErrorPanel ─────────────────────────────────────────────────────
   Step 04 item 16: "cause + fix". A tool that fails and says
   "Something went wrong" has wasted the user's time twice. Every error
   surfaced here names what happened and what to do about it.        */

export function ErrorPanel({
  message,
  hint,
  onRetry,
}: {
  message: string;
  hint?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex gap-3 rounded-lg border border-danger-line bg-danger-soft px-4 py-3.5"
    >
      <AlertIcon size={18} className="mt-0.5 shrink-0 text-danger" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-fg">{message}</p>
        {hint && <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{hint}</p>}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 text-[13px] font-medium text-brand-text underline underline-offset-2"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

/* ── ProgressBar ───────────────────────────────────────────────────
   Determinate where possible. An indeterminate bar tells the user
   nothing except that the tab has not crashed.                      */

export function ProgressBar({
  value,
  label,
  indeterminate = false,
}: {
  value?: number;
  label?: string;
  indeterminate?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-fg-muted">{label}</span>
          {!indeterminate && <span className="font-mono tabular-nums text-fg-subtle">{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
        className="h-1.5 w-full overflow-hidden rounded-full bg-sunken"
      >
        <div
          className={cx('h-full rounded-full bg-brand transition-[width] duration-200', indeterminate && 'w-1/3 animate-pulse')}
          style={indeterminate ? undefined : { width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ── Toast ─────────────────────────────────────────────────────────
   A module-level emitter rather than a React context, so any component
   — including one nested inside a server-rendered tree — can raise a
   toast without a provider having to wrap it.                        */

interface ToastMessage {
  id: number;
  text: string;
  tone: 'ok' | 'error';
}

type Listener = (t: ToastMessage) => void;
const listeners = new Set<Listener>();
let nextId = 0;

export function toast(text: string, tone: 'ok' | 'error' = 'ok'): void {
  const message: ToastMessage = { id: nextId++, text, tone };
  for (const l of listeners) l(message);
}

export function ToastHost() {
  const [items, setItems] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const listener: Listener = (t) => {
      setItems((prev) => [...prev, t]);
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), 3200);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    // aria-live so the announcement reaches a screen reader without
    // stealing focus from whatever the user was doing.
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
    >
      {items.map((t) => (
        <div
          key={t.id}
          className={cx(
            'pointer-events-auto flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm shadow-pop',
            t.tone === 'ok'
              ? 'border-brand-line bg-panel text-fg'
              : 'border-danger-line bg-danger-soft text-fg',
          )}
        >
          {t.tone === 'ok' ? (
            <CheckIcon size={16} className="text-brand" />
          ) : (
            <AlertIcon size={16} className="text-danger" />
          )}
          <span>{t.text}</span>
          <button
            type="button"
            onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
            aria-label="Dismiss"
            className="ml-1 text-fg-subtle hover:text-fg"
          >
            <CloseIcon size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
