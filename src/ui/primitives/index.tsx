/**
 * Primitives.
 *
 * Part 6.5 — build these once and 1000 tools use them. Every one takes
 * the native element's props, so nothing has to be re-plumbed later,
 * and every interactive element carries a real focus ring and a real
 * accessible name.
 *
 * Colours are referenced only through semantic tokens (`bg-panel`,
 * `text-fg-muted`). No component knows what teal is.
 */

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

export const cx = (...parts: (string | false | null | undefined)[]): string =>
  parts.filter(Boolean).join(' ');

/* ── Button ─────────────────────────────────────────────────────── */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-brand text-fg-onbrand hover:bg-brand-hover active:bg-brand-active shadow-panel',
  secondary: 'bg-panel text-fg border border-line hover:bg-sunken hover:border-line-strong',
  ghost: 'text-fg-muted hover:text-fg hover:bg-sunken',
  danger: 'bg-danger-soft text-danger border border-danger-line hover:bg-danger hover:text-surface',
};

const SIZE: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-md',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-6 text-[15px] gap-2 rounded-lg',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Renders full width below `sm`. Tool actions are thumb targets on mobile. */
  block?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  block = false,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex select-none items-center justify-center font-medium',
        'transition-colors duration-150',
        'disabled:pointer-events-none disabled:opacity-45',
        VARIANT[variant],
        SIZE[size],
        block && 'w-full sm:w-auto',
        className,
      )}
      {...props}
    />
  );
}

/** Icon-only button. `label` is required — it becomes the accessible name. */
export function IconButton({
  label,
  className,
  variant = 'ghost',
  ...props
}: Omit<ButtonProps, 'size' | 'block'> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors',
        'disabled:pointer-events-none disabled:opacity-45',
        VARIANT[variant],
        className,
      )}
      {...props}
    />
  );
}

/* ── Form controls ──────────────────────────────────────────────── */

const FIELD_BASE =
  'w-full rounded-md border border-line bg-sunken px-3 text-sm text-fg ' +
  'placeholder:text-fg-subtle transition-colors ' +
  'hover:border-line-strong focus:border-brand focus:bg-panel ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(FIELD_BASE, 'h-10', className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cx(FIELD_BASE, 'h-10 appearance-none pr-9', className)} {...props}>
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(FIELD_BASE, 'scroll-slim resize-y py-2.5 leading-relaxed', className)} {...props} />;
}

/** Labelled wrapper. Ties label, control and help text together for a11y. */
export function Field({
  label,
  htmlFor,
  help,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  help?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-fg">
        {label}
      </label>
      {children}
      {help && (
        <p id={`${htmlFor}-help`} className="text-xs leading-relaxed text-fg-subtle">
          {help}
        </p>
      )}
    </div>
  );
}

/** Accessible switch built on a real checkbox, so forms and AT both work. */
export function Switch({
  id,
  checked,
  onChange,
  label,
  help,
}: {
  id: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  help?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <label htmlFor={id} className="relative mt-0.5 inline-flex shrink-0 cursor-pointer">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-describedby={help ? `${id}-help` : undefined}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={cx(
            'block h-5 w-9 rounded-full border transition-colors duration-150',
            'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring',
            checked ? 'border-brand bg-brand' : 'border-line-strong bg-sunken',
          )}
        />
        <span
          aria-hidden="true"
          className={cx(
            'absolute top-0.5 h-4 w-4 rounded-full shadow-panel transition-transform duration-150',
            checked ? 'translate-x-[1.125rem] bg-fg-onbrand' : 'translate-x-0.5 bg-panel',
          )}
        />
      </label>
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-[13px] font-medium text-fg">
          {label}
        </label>
        {help && (
          <p id={`${id}-help`} className="mt-0.5 text-xs leading-relaxed text-fg-subtle">
            {help}
          </p>
        )}
      </div>
    </div>
  );
}

export function Slider({
  id,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  id: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (next: number) => void;
}) {
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-3">
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full outline-offset-4
                   [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-surface
                   [&::-webkit-slider-thumb]:bg-brand [&::-webkit-slider-thumb]:shadow-panel
                   [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full
                   [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-surface
                   [&::-moz-range-thumb]:bg-brand"
        style={{
          background: `linear-gradient(to right, var(--brand) ${pct}%, var(--line) ${pct}%)`,
        }}
      />
      <output
        htmlFor={id}
        className="min-w-[3.5rem] shrink-0 text-right font-mono text-[13px] tabular-nums text-fg"
      >
        {value}
        {unit && <span className="text-fg-subtle">{unit}</span>}
      </output>
    </div>
  );
}

/* ── Display ────────────────────────────────────────────────────── */

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'brand' | 'warn' | 'danger';
  className?: string;
}) {
  const tones = {
    neutral: 'bg-sunken text-fg-muted border-line',
    brand: 'bg-brand-soft text-brand-text border-brand-line',
    warn: 'bg-warn-soft text-warn border-warn-line',
    danger: 'bg-danger-soft text-danger border-danger-line',
  } as const;
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li';
}) {
  return (
    <Tag className={cx('rounded-xl border border-line bg-panel', className)}>{children}</Tag>
  );
}

/** Section wrapper used by every numbered block of the tool page. */
export function Section({
  id,
  title,
  subtitle,
  children,
  className,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cx('scroll-mt-20', className)}>
      <h2 className="text-lg font-semibold tracking-tight text-fg">{title}</h2>
      {subtitle && <p className="mt-1 text-sm leading-relaxed text-fg-muted">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line bg-sunken px-1.5 py-0.5 font-mono text-[11px] text-fg-muted">
      {children}
    </kbd>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cx('h-4 w-4 animate-spin', className)} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="2" opacity="0.2" />
      <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
