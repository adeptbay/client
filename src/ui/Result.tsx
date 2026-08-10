'use client';

/**
 * Output surfaces — ResultBox, StatGrid, DiffViewer.
 *
 * Section 4 of the tool page anatomy (Part 5.4). The result is the
 * product; everything above it exists to produce it and everything
 * below it exists to explain it.
 */

import type { ReactNode } from 'react';
import type { DiffLine, ResultTable, StatItem } from '@core/tool';
import { cx } from './primitives';
import { CopyButton, DownloadButton, ShareButton } from './Actions';

export function ResultBox({
  value,
  label = 'Result',
  filename,
  mono = true,
  shareTitle,
  extraActions,
  emptyHint,
}: {
  value: string;
  label?: string;
  filename?: string;
  mono?: boolean;
  shareTitle?: string;
  extraActions?: ReactNode;
  emptyHint?: string;
}) {
  const empty = value.length === 0;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-sunken px-3 py-2">
        <span className="text-[13px] font-medium text-fg">{label}</span>
        {!empty && (
          <span className="font-mono text-[11px] text-fg-subtle">
            {value.length.toLocaleString()} chars
          </span>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {extraActions}
          <CopyButton value={value} disabled={empty} />
          {filename && <DownloadButton value={value} filename={filename} disabled={empty} />}
          {shareTitle && <ShareButton title={shareTitle} />}
        </div>
      </div>

      {empty ? (
        <p className="px-4 py-10 text-center text-sm text-fg-subtle">
          {emptyHint ?? 'The result will appear here.'}
        </p>
      ) : (
        <pre
          className={cx(
            'scroll-slim max-h-[28rem] overflow-auto px-4 py-3.5 text-[13px] leading-relaxed',
            mono ? 'font-mono' : 'whitespace-pre-wrap font-sans',
          )}
        >
          <code className={mono ? 'whitespace-pre' : undefined}>{value}</code>
        </pre>
      )}
    </div>
  );
}

/**
 * Numeric read-outs. `primary` entries get a large tabular treatment;
 * a word counter's headline is "1,284 words", not a table row.
 */
export function StatGrid({ stats }: { stats: StatItem[] }) {
  const primary = stats.filter((s) => s.primary);
  const rest = stats.filter((s) => !s.primary);

  return (
    <div className="space-y-4">
      {primary.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {primary.map((s) => {
            const display = typeof s.value === 'number' ? s.value.toLocaleString() : s.value;
            // A headline number wants to be big; a headline sentence
            // ("longer than the age of the universe") wants to fit.
            const size =
              display.length > 24 ? 'text-sm' : display.length > 12 ? 'text-lg' : 'text-2xl';

            return (
            <div key={s.label} className="rounded-xl border border-brand-line bg-brand-soft px-4 py-3.5">
              <div className={`font-mono ${size} font-semibold tabular-nums tracking-tight text-fg`}>
                {display}
              </div>
              <div className="mt-0.5 text-[13px] text-fg-muted">{s.label}</div>
              {s.hint && <div className="mt-0.5 text-xs text-fg-subtle">{s.hint}</div>}
            </div>
            );
          })}
        </div>
      )}

      {rest.length > 0 && (
        <dl className="grid gap-x-6 gap-y-0 rounded-xl border border-line bg-panel px-4 py-1 sm:grid-cols-2">
          {rest.map((s) => (
            <div
              key={s.label}
              className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-0 sm:[&:nth-last-child(2)]:border-0"
            >
              <dt className="text-[13px] text-fg-muted">
                {s.label}
                {s.hint && <span className="ml-1.5 text-xs text-fg-subtle">{s.hint}</span>}
              </dt>
              <dd className="shrink-0 font-mono text-[13px] tabular-nums text-fg">
                {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/**
 * Tabular results — frequency lists, parsed columns, detected characters.
 *
 * `barColumn` renders one numeric column as a proportional bar scaled to
 * the largest value in that column. A frequency list is unreadable as
 * bare numbers and obvious as bars, and it costs one div.
 */
export function ResultTableView({ table }: { table: ResultTable }) {
  const max =
    table.barColumn === undefined
      ? 0
      : table.rows.reduce((m, row) => Math.max(m, Number(row[table.barColumn!]) || 0), 0);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel">
      {table.caption && (
        <div className="border-b border-line bg-sunken px-3 py-2 text-[13px] font-medium text-fg">
          {table.caption}
          <span className="ml-2 font-mono text-[11px] font-normal text-fg-subtle">
            {table.rows.length} rows
          </span>
        </div>
      )}

      <div className="scroll-slim max-h-[28rem] overflow-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead className="sticky top-0 z-10">
            <tr>
              {table.head.map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="border-b border-line bg-panel px-3 py-2 text-left font-semibold text-fg"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr key={i} className="border-b border-line last:border-0">
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={cx(
                      'px-3 py-1.5 align-middle',
                      typeof cell === 'number' ? 'font-mono tabular-nums text-fg' : 'text-fg-muted',
                    )}
                  >
                    {j === table.barColumn && max > 0 ? (
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="h-1.5 rounded-full bg-brand"
                          style={{ width: `${Math.max(2, (Number(cell) / max) * 100)}%`, minWidth: '2px' }}
                        />
                        <span className="shrink-0 font-mono tabular-nums">{cell}</span>
                      </span>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Side-by-side line diff.
 *
 * Colour is never the only signal: added lines carry "+", removed lines
 * carry "−". Roughly 1 in 12 men has a red-green colour vision
 * deficiency, and a diff viewer that fails for them is broken.
 */
export function DiffViewer({ rows }: { rows: DiffLine[] }) {
  const added = rows.filter((r) => r.kind === 'add').length;
  const removed = rows.filter((r) => r.kind === 'remove').length;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel">
      <div className="flex items-center gap-3 border-b border-line bg-sunken px-3 py-2 text-[13px]">
        <span className="font-medium text-fg">Differences</span>
        <span className="font-mono text-xs text-ok">+{added}</span>
        <span className="font-mono text-xs text-danger">−{removed}</span>
        {added === 0 && removed === 0 && (
          <span className="ml-auto text-xs text-fg-subtle">The two inputs are identical.</span>
        )}
      </div>

      <div className="scroll-slim max-h-[32rem] overflow-auto">
        <table className="w-full border-collapse font-mono text-[12.5px] leading-relaxed">
          <caption className="sr-only">
            Line by line comparison. Rows marked plus exist only on the right, rows marked minus only
            on the left.
          </caption>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className={cx(
                  row.kind === 'add' && 'bg-ok-soft',
                  row.kind === 'remove' && 'bg-danger-soft',
                )}
              >
                <td className="w-10 select-none border-r border-line px-2 text-right align-top text-fg-subtle">
                  {row.leftNo ?? ''}
                </td>
                <td className="w-10 select-none border-r border-line px-2 text-right align-top text-fg-subtle">
                  {row.rightNo ?? ''}
                </td>
                <td
                  className={cx(
                    'w-6 select-none px-1 text-center align-top font-semibold',
                    row.kind === 'add' && 'text-ok',
                    row.kind === 'remove' && 'text-danger',
                  )}
                >
                  {row.kind === 'add' ? '+' : row.kind === 'remove' ? '−' : ''}
                </td>
                <td className="whitespace-pre-wrap break-all px-2 align-top text-fg">
                  {row.kind === 'add' ? row.right : row.left}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
