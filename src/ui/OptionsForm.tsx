'use client';

/**
 * OptionsForm — schema in, form out.
 *
 * Part 6.5 calls this the single biggest time saver in the codebase.
 * A tool author writes:
 *
 *   { key: 'quality', type: 'range', min: 1, max: 100, default: 80 }
 *
 * and gets a labelled slider, a live value read-out, validation, the
 * correct control for every screen size, and URL persistence — with no
 * per-tool UI code. Across 1000 tools that is several hundred hours,
 * and more importantly it is one consistent form instead of 1000
 * slightly different ones.
 */

import { useId, useState } from 'react';
import type { OptionValue, ToolOption } from '@core/tool';
import { Field, Input, Select, Slider, Switch, Textarea, cx } from './primitives';

export type OptionValues = Record<string, OptionValue>;

/**
 * A masked field with a reveal toggle.
 *
 * Masking alone is the wrong trade here. On the encryptor a mistyped
 * passphrase is not a login failure you retry — it is ciphertext nobody
 * can ever open, and the tool says so on the page. So the value is
 * hidden by default, because it is a secret in a screenshot and in a
 * screen share, and revealable on demand, because the user has to be
 * able to check it before committing.
 */
function SecretField({
  id,
  option,
  value,
  onChange,
}: {
  id: string;
  option: Extract<ToolOption, { type: 'text' }>;
  value: string;
  onChange: (next: string) => void;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <Field label={option.label} htmlFor={id} help={option.help}>
      <div className="relative">
        <Input
          id={id}
          type={revealed ? 'text' : 'password'}
          // A one-shot secret, not a credential worth storing.
          autoComplete="off"
          data-1p-ignore=""
          value={value}
          placeholder={option.placeholder}
          maxLength={option.maxLength}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-describedby={option.help ? `${id}-help` : undefined}
          onChange={(e) => onChange(e.target.value)}
          className="pr-16"
        />
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          aria-controls={id}
          aria-pressed={revealed}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-[11px]
                     font-medium uppercase tracking-wider text-fg-subtle
                     hover:bg-sunken hover:text-fg focus-visible:outline-2
                     focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {revealed ? 'Hide' : 'Show'}
        </button>
      </div>
    </Field>
  );
}

export const defaultValues = (options: ToolOption[]): OptionValues =>
  Object.fromEntries(options.map((o) => [o.key, o.default]));

/** `showIf` lets an option depend on another — e.g. only show the
 *  separator picker when "custom separator" is on. */
const isVisible = (option: ToolOption, values: OptionValues): boolean =>
  !option.showIf || values[option.showIf.key] === option.showIf.equals;

export function OptionsForm({
  options,
  values,
  onChange,
  columns = 2,
}: {
  options: ToolOption[];
  values: OptionValues;
  onChange: (next: OptionValues) => void;
  columns?: 1 | 2 | 3;
}) {
  const uid = useId();
  const visible = options.filter((o) => isVisible(o, values));

  if (visible.length === 0) return null;

  const set = (key: string, value: OptionValue) => onChange({ ...values, [key]: value });

  return (
    <fieldset className="rounded-xl border border-line bg-panel px-4 py-4">
      <legend className="px-1.5 text-[13px] font-medium text-fg-muted">Options</legend>
      <div
        className={cx(
          'grid gap-x-6 gap-y-4',
          columns === 1 && 'sm:grid-cols-1',
          columns === 2 && 'sm:grid-cols-2',
          columns === 3 && 'sm:grid-cols-2 lg:grid-cols-3',
        )}
      >
        {visible.map((option) => {
          const id = `${uid}-${option.key}`;

          switch (option.type) {
            case 'bool':
              return (
                <div key={option.key} className="flex items-center">
                  <Switch
                    id={id}
                    checked={Boolean(values[option.key])}
                    onChange={(v) => set(option.key, v)}
                    label={option.label}
                    help={option.help}
                  />
                </div>
              );

            case 'enum':
              return (
                <Field key={option.key} label={option.label} htmlFor={id} help={option.help}>
                  <Select
                    id={id}
                    value={String(values[option.key] ?? option.default)}
                    onChange={(e) => set(option.key, e.target.value)}
                    aria-describedby={option.help ? `${id}-help` : undefined}
                  >
                    {option.values.map((choice) => {
                      const value = typeof choice === 'string' ? choice : choice.value;
                      const label = typeof choice === 'string' ? choice : choice.label;
                      return (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      );
                    })}
                  </Select>
                </Field>
              );

            case 'range':
              return (
                <Field key={option.key} label={option.label} htmlFor={id} help={option.help}>
                  <Slider
                    id={id}
                    value={Number(values[option.key] ?? option.default)}
                    min={option.min}
                    max={option.max}
                    step={option.step}
                    unit={option.unit}
                    onChange={(v) => set(option.key, v)}
                  />
                </Field>
              );

            case 'number':
              return (
                <Field key={option.key} label={option.label} htmlFor={id} help={option.help}>
                  <Input
                    id={id}
                    type="number"
                    inputMode="decimal"
                    value={String(values[option.key] ?? option.default)}
                    min={option.min}
                    max={option.max}
                    step={option.step}
                    aria-describedby={option.help ? `${id}-help` : undefined}
                    onChange={(e) => {
                      // Keep the field editable while it is mid-edit ("-", "1.")
                      // instead of snapping it to 0 on every keystroke.
                      const raw = e.target.value;
                      set(option.key, raw === '' ? '' : Number(raw));
                    }}
                    onBlur={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isNaN(n)) return set(option.key, option.default);
                      const clamped = Math.min(
                        option.max ?? Number.POSITIVE_INFINITY,
                        Math.max(option.min ?? Number.NEGATIVE_INFINITY, n),
                      );
                      set(option.key, clamped);
                    }}
                  />
                </Field>
              );

            case 'text':
              if (option.secret) {
                return (
                  <SecretField
                    key={option.key}
                    id={id}
                    option={option}
                    value={String(values[option.key] ?? option.default)}
                    onChange={(next) => set(option.key, next)}
                  />
                );
              }
              return (
                <Field key={option.key} label={option.label} htmlFor={id} help={option.help}>
                  <Input
                    id={id}
                    type="text"
                    value={String(values[option.key] ?? option.default)}
                    placeholder={option.placeholder}
                    maxLength={option.maxLength}
                    spellCheck={false}
                    autoCapitalize="off"
                    autoCorrect="off"
                    aria-describedby={option.help ? `${id}-help` : undefined}
                    onChange={(e) => set(option.key, e.target.value)}
                  />
                </Field>
              );

            case 'textarea':
              return (
                <Field
                  key={option.key}
                  label={option.label}
                  htmlFor={id}
                  help={option.help}
                  className={option.wide ? 'sm:col-span-full' : undefined}
                >
                  <Textarea
                    id={id}
                    rows={option.rows ?? 4}
                    value={String(values[option.key] ?? option.default)}
                    placeholder={option.placeholder}
                    spellCheck={false}
                    autoCapitalize="off"
                    autoCorrect="off"
                    aria-describedby={option.help ? `${id}-help` : undefined}
                    onChange={(e) => set(option.key, e.target.value)}
                    className={option.mono !== false ? 'font-mono text-[13px]' : undefined}
                  />
                </Field>
              );
          }
        })}
      </div>
    </fieldset>
  );
}

/* ── URL persistence ────────────────────────────────────────────────
   Options live in the query string so a configured tool is a shareable
   link. Only values that differ from the default are written, which
   keeps the canonical URL clean — and `robots.txt` disallows crawling
   parameterised URLs so this never creates duplicate pages (Part 5.9).

   Secrets are exempt in both directions. A passphrase in the address
   bar survives in browser history, profile sync, screen shares and
   screenshots long after the tab is closed, and "share this link"
   would hand it to the recipient. Reading one back off the URL is the
   same hole in reverse: it lets a crafted link pre-seed a passphrase.
   `secret: true` on the option is the whole opt-out.                  */

const isSecret = (o: ToolOption): boolean => o.type === 'text' && o.secret === true;

export function optionsToQuery(options: ToolOption[], values: OptionValues): string {
  const params = new URLSearchParams();
  for (const o of options) {
    if (isSecret(o)) continue;
    const v = values[o.key];
    if (v === undefined || v === o.default) continue;
    params.set(o.key, String(v));
  }
  return params.toString();
}

export function optionsFromQuery(options: ToolOption[], search: string): OptionValues {
  const params = new URLSearchParams(search);
  const out = defaultValues(options);

  for (const o of options) {
    if (isSecret(o)) continue;
    const raw = params.get(o.key);
    if (raw === null) continue;

    switch (o.type) {
      case 'bool':
        out[o.key] = raw === 'true' || raw === '1';
        break;
      case 'number':
      case 'range': {
        const n = Number(raw);
        if (Number.isFinite(n)) {
          const min = 'min' in o && o.min !== undefined ? o.min : Number.NEGATIVE_INFINITY;
          const max = 'max' in o && o.max !== undefined ? o.max : Number.POSITIVE_INFINITY;
          out[o.key] = Math.min(max, Math.max(min, n));
        }
        break;
      }
      case 'enum': {
        // Never trust a query parameter to name a valid choice.
        const allowed = o.values.map((c) => (typeof c === 'string' ? c : c.value));
        if (allowed.includes(raw)) out[o.key] = raw;
        break;
      }
      case 'text':
        out[o.key] = o.maxLength ? raw.slice(0, o.maxLength) : raw;
        break;
      case 'textarea':
        // Bounded: a query string is not a place to carry a document, and
        // an unbounded one is a cheap way to blow up a URL.
        out[o.key] = raw.slice(0, 2000);
        break;
    }
  }

  return out;
}
