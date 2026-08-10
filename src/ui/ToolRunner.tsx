'use client';

/**
 * ToolRunner — the interactive half of every tool page.
 *
 * The server renders the metadata, copy, schema and links; this
 * component renders the working tool. It receives the definition with
 * `run` stripped (metadata is serialisable, functions are not) and
 * loads the executable half through a dynamic import keyed by slug.
 *
 * That split is what makes 1000 tools viable: a visitor on
 * /text/word-counter downloads the word counter's logic and nothing
 * else, however large the registry gets.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DiffLine, StatItem, ToolMeta, ToolRunResult } from '@core/tool';
import { trackToolRun } from '@core/analytics';
import { runners } from '@tools/runners';
import { Button, Spinner } from './primitives';
import { ErrorPanel } from './Feedback';
import { ResetButton, ShareButton } from './Actions';
import { DiffViewer, ResultBox, ResultTableView, StatGrid } from './Result';
import { FileDropzone, MonospaceTextArea, MultiFileList, type DroppedFile } from './Inputs';
import {
  OptionsForm,
  defaultValues,
  optionsFromQuery,
  optionsToQuery,
  type OptionValues,
} from './OptionsForm';

type RunState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; result: ToolRunResult }
  | { status: 'error'; message: string; hint?: string };

export function ToolRunner({ tool }: { tool: ToolMeta }) {
  const [text, setText] = useState('');
  const [textB, setTextB] = useState('');
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [options, setOptions] = useState<OptionValues>(() => defaultValues(tool.options));
  const [state, setState] = useState<RunState>({ status: 'idle' });

  // Guards against an older, slower run overwriting a newer result.
  const runToken = useRef(0);

  /**
   * Text and form tools run as you type. File tools wait for a click —
   * re-encoding a 40 MB image on every keystroke would be hostile — and
   * so do tools that opt out with `manualRun` because a single run is
   * expensive (see the encryptor's key derivation).
   */
  const auto = tool.input.type !== 'files' && !tool.manualRun;

  /* ── URL state ───────────────────────────────────────────────────
     Restore options from the query string on mount, then keep the URL
     in sync so a configured tool is a shareable link. `replaceState`
     rather than router.replace: no re-render, no scroll jump, no
     history entry per keystroke. */

  useEffect(() => {
    const restored = optionsFromQuery(tool.options, window.location.search);
    setOptions(restored);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  useEffect(() => {
    const query = optionsToQuery(tool.options, options);
    const next = `${window.location.pathname}${query ? `?${query}` : ''}`;
    if (next !== window.location.pathname + window.location.search) {
      window.history.replaceState(null, '', next);
    }
  }, [options, tool.options]);

  /* ── Execution ───────────────────────────────────────────────── */

  const execute = useCallback(async () => {
    const token = ++runToken.current;
    const started = performance.now();

    const input: unknown =
      tool.input.type === 'files'
        ? files.map((f) => f.file)
        : tool.input.type === 'text-pair'
          ? [text, textB]
          : text;

    const inputBytes =
      tool.input.type === 'files'
        ? files.reduce((sum, f) => sum + f.file.size, 0)
        : new Blob([text, textB]).size;

    setState({ status: 'running' });

    try {
      const load = runners[tool.slug];
      if (!load) throw new Error(`No runner is registered for "${tool.slug}".`);

      const module = await load();
      const result = await module.default.run(input as never, options as never);

      if (token !== runToken.current) return;
      setState({ status: 'done', result });

      trackToolRun({
        tool_slug: tool.slug,
        runtime: 'client',
        duration_ms: Math.round(performance.now() - started),
        input_bytes: inputBytes,
        success: true,
      });
    } catch (err) {
      if (token !== runToken.current) return;

      const message = err instanceof Error ? err.message : 'The tool could not finish.';
      const hint =
        err && typeof err === 'object' && 'hint' in err ? String((err as { hint?: string }).hint ?? '') : '';

      setState({ status: 'error', message, hint: hint || undefined });

      trackToolRun({
        tool_slug: tool.slug,
        runtime: 'client',
        duration_ms: Math.round(performance.now() - started),
        input_bytes: inputBytes,
        success: false,
        error_code: err instanceof Error ? err.name : 'unknown',
      });
    }
  }, [files, options, text, textB, tool.input.type, tool.slug]);

  // Debounced auto-run. 140 ms is below the ~200 ms threshold at which a
  // response stops feeling immediate, and high enough that a fast typist
  // does not trigger a run per character.
  useEffect(() => {
    if (!auto) return;

    const noInput =
      (tool.input.type === 'text' && text.trim() === '') ||
      (tool.input.type === 'text-pair' && text.trim() === '' && textB.trim() === '');

    if (noInput) {
      setState({ status: 'idle' });
      return;
    }

    const timer = setTimeout(() => void execute(), 140);
    return () => clearTimeout(timer);
  }, [auto, execute, text, textB, tool.input.type]);

  const reset = () => {
    setText('');
    setTextB('');
    setFiles([]);
    setOptions(defaultValues(tool.options));
    setState({ status: 'idle' });
    runToken.current++;
  };

  const result = state.status === 'done' ? state.result : null;

  const stats: StatItem[] = result?.stats ?? [];
  const diff: DiffLine[] = result?.diff ?? [];
  const output = result?.output ?? '';

  const filename = useMemo(
    () => result?.filename ?? (tool.output.type === 'file' ? `${tool.slug}.${tool.output.ext}` : `${tool.slug}.txt`),
    [result?.filename, tool.output, tool.slug],
  );

  return (
    <div className="space-y-4">
      {/* ── Input ── */}
      {tool.input.type === 'text' && (
        <MonospaceTextArea
          label={tool.input.label ?? 'Input'}
          value={text}
          onChange={setText}
          placeholder={tool.input.placeholder}
          rows={tool.input.rows ?? 9}
          sample={tool.input.sample}
          mono={tool.input.mono !== false}
        />
      )}

      {tool.input.type === 'text-pair' && (
        <div className="grid gap-3 lg:grid-cols-2">
          <MonospaceTextArea
            label={tool.input.labelA}
            value={text}
            onChange={setText}
            placeholder={tool.input.placeholder}
            rows={tool.input.rows ?? 12}
            sample={tool.input.sampleA}
            mono={tool.input.mono !== false}
          />
          <MonospaceTextArea
            label={tool.input.labelB}
            value={textB}
            onChange={setTextB}
            placeholder={tool.input.placeholder}
            rows={tool.input.rows ?? 12}
            sample={tool.input.sampleB}
            mono={tool.input.mono !== false}
          />
        </div>
      )}

      {tool.input.type === 'files' && (
        <>
          <FileDropzone
            accept={tool.input.accept}
            multiple={tool.input.max > 1}
            maxFiles={tool.input.max}
            maxSizeMB={tool.input.maxSizeMB}
            onFiles={(list) =>
              setFiles((prev) =>
                [...prev, ...list.map((file) => ({ file, id: `${file.name}-${file.size}-${Math.random()}` }))].slice(
                  0,
                  tool.input.type === 'files' ? tool.input.max : 1,
                ),
              )
            }
            hint="Files are processed on your device. Nothing is uploaded."
          />
          <MultiFileList
            files={files}
            onRemove={(id) => setFiles((prev) => prev.filter((f) => f.id !== id))}
            onReorder={(from, to) =>
              setFiles((prev) => {
                const next = [...prev];
                const [moved] = next.splice(from, 1);
                if (moved) next.splice(to, 0, moved);
                return next;
              })
            }
          />
        </>
      )}

      {/* ── Options ── */}
      <OptionsForm options={tool.options} values={options} onChange={setOptions} />

      {/* ── Controls ──
          Text tools need no button: the result is already there. File
          tools need one, because re-encoding on every change would be
          hostile. Generators need one, because "give me another" is the
          whole interaction. */}
      <div className="flex flex-wrap items-center gap-2">
        {tool.input.type === 'files' && (
          <Button
            variant="primary"
            size="lg"
            block
            onClick={() => void execute()}
            disabled={files.length === 0 || state.status === 'running'}
          >
            {state.status === 'running' && <Spinner />}
            {state.status === 'running' ? 'Working…' : tool.name}
          </Button>
        )}
        {tool.input.type === 'form' && (
          <Button variant="primary" size="lg" onClick={() => void execute()} disabled={state.status === 'running'}>
            {state.status === 'running' && <Spinner />}
            {tool.runLabel ?? 'Generate'}
          </Button>
        )}
        {tool.manualRun && tool.input.type !== 'form' && tool.input.type !== 'files' && (
          <Button
            variant="primary"
            size="lg"
            onClick={() => void execute()}
            disabled={state.status === 'running' || (tool.input.type === 'text' && text.trim() === '')}
          >
            {state.status === 'running' && <Spinner />}
            {state.status === 'running' ? 'Working…' : (tool.runLabel ?? tool.name)}
          </Button>
        )}
        {auto && tool.input.type === 'text' && state.status === 'running' && (
          <span className="flex items-center gap-2 text-[13px] text-fg-subtle">
            <Spinner /> Working…
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <ShareButton title={tool.name} text={tool.tagline} />
          <ResetButton onClick={reset} />
        </div>
      </div>

      {/* ── Output ── */}
      {state.status === 'error' && (
        <ErrorPanel message={state.message} hint={state.hint} onRetry={() => void execute()} />
      )}

      {stats.length > 0 && <StatGrid stats={stats} />}

      {result?.table && result.table.rows.length > 0 && <ResultTableView table={result.table} />}

      {diff.length > 0 && <DiffViewer rows={diff} />}

      {/* Stats and diff tools have no ResultBox to hold the empty state,
          so without this the page looks like it is missing its output
          area until the first keystroke. */}
      {state.status === 'idle' &&
        (tool.output.type === 'stats' ||
          tool.output.type === 'diff' ||
          tool.output.type === 'table') && (
          <div className="rounded-xl border border-dashed border-line bg-panel px-4 py-10 text-center">
            <p className="text-sm text-fg-subtle">
              {tool.input.type === 'form'
                ? 'Set the options above, then press Generate.'
                : tool.input.type === 'files'
                  ? 'Add a file above to get started.'
                  : 'Results appear here as soon as you start typing.'}
            </p>
          </div>
        )}

      {(tool.output.type === 'text' || tool.output.type === 'file') && (
        <ResultBox
          value={output}
          label={tool.output.label ?? 'Result'}
          filename={filename}
          mono={tool.output.type === 'file' ? true : tool.output.mono !== false}
          emptyHint={
            tool.input.type === 'files'
              ? 'Add a file above to get started.'
              : 'Start typing above and the result appears here.'
          }
        />
      )}

      {result?.notes && result.notes.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-line bg-sunken px-4 py-3">
          {result.notes.map((note, i) => (
            <li key={i} className="text-[13px] leading-relaxed text-fg-muted">
              {note}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
