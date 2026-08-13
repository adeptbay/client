'use client';

/**
 * The CV checker surface.
 *
 * ── Why this tool has its own component ─────────────────────────────
 *
 * `ToolRunner` renders 99% of this platform: one input, one options
 * form, one result. That contract is what makes 1000 tools viable and it
 * is not worth bending. But this tool's *result* is the product — a
 * score, seven category breakdowns, an ordered list of findings each
 * with evidence from the user's own file, a side-by-side parser view and
 * an optional model call. Expressed as `stats[]` it would be a table of
 * numbers with the advice deleted.
 *
 * So it opts out through `ToolSurface`, which is a slug-keyed lazy
 * import mirroring `runners.ts`. A visitor on any other tool page
 * downloads none of this.
 *
 * ── The shape of the interaction ────────────────────────────────────
 *
 * Parsing is expensive and happens once. Scoring is cheap and happens on
 * every keystroke in the job-advert box, so the number moves while the
 * user works instead of after a re-upload. Nothing is sent anywhere
 * unless the AI panel's button is pressed.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PdfExtraction } from '@engines/pdf';
import type { ParsedResume, ResumeReport, ScoreOptions, Seniority } from '@engines/resume';
import { trackToolRun } from '@core/analytics';
import { flags } from '@core/flags';
import { CopyButton, DownloadButton, ResetButton } from '@ui/Actions';
import { ErrorPanel } from '@ui/Feedback';
import { FileDropzone } from '@ui/Inputs';
import { AlertIcon, FileIcon, ShieldIcon } from '@ui/Icons';
import { Badge, Button, Field, Input, Select, Spinner, Textarea, cx } from '@ui/primitives';
import { AiReviewPanel } from './AiReviewPanel';
import {
  CategoryBars,
  FindingList,
  KeywordGrid,
  Panel,
  ParserPreview,
  ScoreRing,
  StatStrip,
  WinList,
  scoreTone,
} from './parts';
import { buildMarkdownReport } from './report-export';

/** The lazily-imported engine, held once it has loaded. */
type Engine = typeof import('@engines/resume');

type Stage =
  | { status: 'empty' }
  | { status: 'working'; step: string }
  | { status: 'ready'; doc: PdfExtraction; parsed: ParsedResume; fileName: string }
  | { status: 'error'; message: string; hint?: string };

const SENIORITY_CHOICES: { value: Seniority | 'auto'; label: string }[] = [
  { value: 'auto', label: 'Work it out from my dates' },
  { value: 'student', label: 'Student or new graduate' },
  { value: 'entry', label: 'Entry — under 3 years' },
  { value: 'mid', label: 'Mid — 3 to 10 years' },
  { value: 'senior', label: 'Senior — 10 years or more' },
  { value: 'executive', label: 'Executive or director' },
];

/** Let the browser paint the step label before the next blocking chunk. */
const paint = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));

export function ResumeChecker() {
  const [stage, setStage] = useState<Stage>({ status: 'empty' });
  const [report, setReport] = useState<ResumeReport | null>(null);
  const [category, setCategory] = useState<string | null>(null);

  const [targetRole, setTargetRole] = useState('');
  const [jobAd, setJobAd] = useState('');
  const [seniority, setSeniority] = useState<Seniority | 'auto'>('auto');

  const engineRef = useRef<Engine | null>(null);

  const options = useMemo<ScoreOptions>(
    () => ({ targetRole, jobAd, seniority }),
    [targetRole, jobAd, seniority],
  );

  /* ── Analyse: the expensive half, once per file ── */
  const analyse = useCallback(async (file: File) => {
    setReport(null);
    setCategory(null);
    setStage({ status: 'working', step: 'Reading the file…' });
    const started = performance.now();

    try {
      const engine = engineRef.current ?? (await import('@engines/resume'));
      engineRef.current = engine;

      const bytes = new Uint8Array(await file.arrayBuffer());

      await paint();
      setStage({ status: 'working', step: 'Extracting the text a parser would see…' });
      await paint();

      const { doc, parsed } = await engine.prepareResume(bytes);

      setStage({ status: 'working', step: 'Finding the sections and scoring…' });
      await paint();

      setStage({ status: 'ready', doc, parsed, fileName: file.name });

      trackToolRun({
        tool_slug: 'resume-checker',
        runtime: 'client',
        duration_ms: Math.round(performance.now() - started),
        input_bytes: file.size,
        success: true,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'This CV could not be read.';
      const hint =
        error && typeof error === 'object' && 'hint' in error
          ? String((error as { hint?: string }).hint ?? '')
          : '';

      setStage({ status: 'error', message, hint: hint || undefined });

      trackToolRun({
        tool_slug: 'resume-checker',
        runtime: 'client',
        duration_ms: Math.round(performance.now() - started),
        input_bytes: file.size,
        success: false,
        error_code: error instanceof Error ? error.name : 'unknown',
      });
    }
  }, []);

  /* ── Score: the cheap half, on every option change ── */
  useEffect(() => {
    if (stage.status !== 'ready' || !engineRef.current) return;
    setReport(engineRef.current.scoreResume(stage.parsed, stage.doc, options));
  }, [stage, options]);

  const reset = () => {
    setStage({ status: 'empty' });
    setReport(null);
    setCategory(null);
  };

  const visibleFindings = useMemo(
    () => (report === null ? [] : category === null ? report.findings : report.findings.filter((f) => f.category === category)),
    [report, category],
  );

  const scrambled = report !== null && report.stats.columns > 1;

  const fileName = stage.status === 'ready' ? stage.fileName : '';
  // Rebuilt only when the report changes, not on every render — the copy
  // and download buttons would otherwise regenerate it on each keystroke
  // in the job-advert box.
  const markdown = useMemo(
    () => (report === null ? '' : buildMarkdownReport(report, { targetRole, fileName })),
    [report, targetRole, fileName],
  );

  return (
    <div className="space-y-5">
      {/* ── Input ──
          Hidden while a file is being read, so a second drop cannot race
          the first, and once a report exists — Reset brings it back. */}
      {(stage.status === 'empty' || stage.status === 'error') && (
        <>
          <FileDropzone
            accept={['.pdf']}
            multiple={false}
            maxFiles={1}
            maxSizeMB={12}
            onFiles={(files) => {
              const file = files[0];
              if (file) void analyse(file);
            }}
            hint="PDF only — because how your PDF parses is half of what is being checked."
          />

          <p className="flex items-start justify-center gap-2 text-center text-[12.5px] leading-relaxed text-fg-subtle">
            <ShieldIcon size={14} className="mt-0.5 shrink-0 text-brand-text" />
            <span>
              Your CV is read inside this browser tab. It is never uploaded, and closing the tab
              removes it. The optional AI review at the end is the only thing that sends text, it
              asks first, and it strips your name, email and phone before it does.
            </span>
          </p>
        </>
      )}

      {stage.status === 'working' && (
        <div className="flex items-center justify-center gap-3 rounded-xl border border-line bg-panel px-4 py-8">
          <Spinner className="text-brand" />
          <span className="text-sm text-fg-muted">{stage.step}</span>
        </div>
      )}

      {stage.status === 'error' && (
        <ErrorPanel message={stage.message} hint={stage.hint} />
      )}

      {/* ── Context: improves the score's specificity, never required ── */}
      <div className="rounded-xl border border-line bg-panel p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Role you are applying for"
            htmlFor="rc-role"
            help="Checked against your headline — the first thing a screener looks for."
          >
            <Input
              id="rc-role"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="Senior Frontend Engineer"
              autoComplete="off"
            />
          </Field>

          <Field
            label="Career stage"
            htmlFor="rc-seniority"
            help="Sets the expected length. A senior CV is not a long junior CV."
          >
            <Select
              id="rc-seniority"
              value={seniority}
              onChange={(e) => setSeniority(e.target.value as Seniority | 'auto')}
            >
              {SENIORITY_CHOICES.map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Paste the job advert (optional)"
            htmlFor="rc-jobad"
            help="Turns a generic score into a specific one: which of the advert's own terms your CV never uses. Nothing here leaves the tab."
            className="sm:col-span-2"
          >
            <Textarea
              id="rc-jobad"
              value={jobAd}
              onChange={(e) => setJobAd(e.target.value)}
              rows={4}
              placeholder="Paste the requirements section…"
            />
          </Field>
        </div>

        {stage.status === 'ready' && (
          <p className="mt-2 text-[12px] text-fg-subtle">
            The score updates as you type — no need to re-upload.
          </p>
        )}
      </div>

      {/* ── Report ── */}
      {stage.status === 'ready' && report !== null && (
        <div className="space-y-6">
          {/* Score */}
          <div className="rounded-xl border border-line bg-panel p-4 sm:p-5">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
              <ScoreRing score={report.score} grade={report.grade} />

              <div className="min-w-0 flex-1 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <span className="inline-flex items-center gap-1.5 text-[13px] text-fg-muted">
                    <FileIcon size={14} className="text-fg-subtle" />
                    <span className="max-w-[16rem] truncate font-mono text-[12px]">{stage.fileName}</span>
                  </span>
                  <Badge tone="neutral">{report.parsed.seniority}</Badge>
                  {report.stats.columns > 1 && <Badge tone="danger">two columns</Badge>}
                  {report.stats.invisibleRuns > 0 && <Badge tone="danger">hidden text</Badge>}
                </div>

                <p className={cx('mt-2 text-[15px] font-medium leading-relaxed', scoreTone(report.score).label)}>
                  {report.verdict}
                </p>

                <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                  {(['critical', 'important', 'polish'] as const).map((severity) => {
                    const count = report.findings.filter((f) => f.severity === severity).length;
                    if (count === 0) return null;
                    return (
                      <Badge
                        key={severity}
                        tone={severity === 'critical' ? 'danger' : severity === 'important' ? 'warn' : 'neutral'}
                      >
                        {count} {severity}
                      </Badge>
                    );
                  })}
                </div>

                <div className="mt-3.5 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <DownloadButton
                    value={markdown}
                    filename={`cv-report-${new Date().toISOString().slice(0, 10)}.md`}
                    mime="text/markdown;charset=utf-8"
                    label="Download report"
                  />
                  <CopyButton value={markdown} label="Copy report" size="md" />
                  <ResetButton onClick={reset} />
                </div>
              </div>
            </div>

            <div className="mt-5">
              <StatStrip stats={report.stats} coverage={report.keywordCoverage} />
            </div>
          </div>

          {report.document.warnings.length > 0 && (
            <ul className="space-y-1 rounded-lg border border-warn-line bg-warn-soft px-3.5 py-2.5">
              {report.document.warnings.map((warning, i) => (
                <li key={i} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-warn">
                  <AlertIcon size={13} className="mt-0.5 shrink-0" />
                  {warning}
                </li>
              ))}
            </ul>
          )}

          {/* Breakdown + findings */}
          <div className="grid gap-5 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
            <div className="lg:sticky lg:top-20 lg:self-start">
              <Panel
                title="Where the points went"
                subtitle="Select a row to see only its findings."
              >
                <CategoryBars categories={report.categories} active={category} onSelect={setCategory} />
              </Panel>
            </div>

            <Panel
              title={category === null ? 'What to fix' : `What to fix — ${report.categories.find((c) => c.id === category)?.label ?? ''}`}
              subtitle="Ordered by what it costs you. Every item names the line it came from."
              action={
                category !== null ? (
                  <Button size="sm" variant="ghost" onClick={() => setCategory(null)}>
                    Show all
                  </Button>
                ) : undefined
              }
            >
              <FindingList findings={visibleFindings} />
            </Panel>
          </div>

          {report.wins.length > 0 && (
            <Panel
              title="What your CV already gets right"
              subtitle="Worth knowing before you rewrite something that was working."
            >
              <WinList wins={report.wins} />
            </Panel>
          )}

          {report.keywords !== null && report.keywords.length > 0 && report.keywordCoverage !== null && (
            <Panel title="Against the job advert" subtitle="Matched on the advert's own wording, not on synonyms.">
              <KeywordGrid keywords={report.keywords} coverage={report.keywordCoverage} />
            </Panel>
          )}

          {/* Both panes come from the same extraction, differing only in
              reading order — otherwise the comparison would be showing
              two formatters rather than the parse failure. */}
          <ParserPreview
            readable={report.document.text}
            asParsed={report.atsText}
            scrambled={scrambled}
          />

          {flags.ai && (
            <AiReviewPanel report={report} targetRole={targetRole} jobAd={jobAd} />
          )}
        </div>
      )}
    </div>
  );
}
