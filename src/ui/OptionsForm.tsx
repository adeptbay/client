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

import { useId } from 'react';
import type { OptionValue, ToolOption } from '@core/tool';
import { Field, Input, Select, Slider, Switch, cx } from './primitives';

export type OptionValues = Record<string, OptionValue>;

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
              return (
                <Field key={option.key} label={option.label} htmlFor={id} help={option.help}>
                  <Input
                    id={id}
                    type="text"
                    value={String(values[option.key] ?? option.default)}
                    placeholder={option.placeholder}
                    maxLength={option.maxLength}
                    spellCheck={false}
                    aria-describedby={option.help ? `${id}-help` : undefined}
                    onChange={(e) => set(option.key, e.target.value)}
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
   parameterised URLs so this never creates duplicate pages (Part 5.9). */

export function optionsToQuery(options: ToolOption[], values: OptionValues): string {
  const params = new URLSearchParams();
  for (const o of options) {
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
    }
  }

  return out;
}
