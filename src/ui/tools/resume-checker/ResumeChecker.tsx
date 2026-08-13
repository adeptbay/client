"use client";

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
 * a model call. Expressed as `stats[]` it would be a table of numbers
 * with the advice deleted.
 *
 * So it opts out through `ToolSurface`, a slug-keyed lazy import
 * mirroring `runners.ts`. A visitor on any other tool page downloads
 * none of this.
 *
 * ── The flow ────────────────────────────────────────────────────────
 *
 *   file → department → submit → deterministic score → AI review
 *
 * Three deliberate properties of that order:
 *
 * · **Nothing runs on drop.** Dropping a file used to start the parse,
 *   which meant the score appeared before the user had said which field
 *   they work in — and the department is what decides whether a bullet
 *   counts as evidence. A sales CV and a clinical CV are not the same
 *   document scored twice.
 * · **The deterministic score lands first, on its own.** It is the part
 *   that is always available, always the same for the same file, and
 *   never depends on a network. The user sees it before anything is
 *   sent anywhere.
 * · **Then the AI review starts by itself**, because at that point the
 *   user has already pressed a button asking for the check, and the
 *   request carries no identifiers.
 *
 * ── Copy ────────────────────────────────────────────────────────────
 *
 * Deliberately sparse. Numbered steps instead of sentences explaining
 * the steps; a label instead of a paragraph justifying the label. The
 * long-form explanation belongs in the how-to and FAQ below the tool,
 * where someone who wants it will look for it.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PdfExtraction } from "@engines/pdf";
import type {
  ParsedResume,
  ResumeReport,
  ScoreOptions,
  Seniority,
} from "@engines/resume";
import { DEPARTMENTS, type DepartmentId } from "@engines/resume/departments";
import { trackToolRun } from "@core/analytics";
import { flags } from "@core/flags";
import { CopyButton, DownloadButton, ResetButton } from "@ui/Actions";
import { ErrorPanel } from "@ui/Feedback";
import { FileDropzone } from "@ui/Inputs";
import { AlertIcon, ChevronDownIcon, ShieldIcon } from "@ui/Icons";
import {
  Badge,
  Button,
  Field,
  Input,
  Select,
  Textarea,
  cx,
} from "@ui/primitives";
import { AiReviewPanel } from "./AiReviewPanel";
import {
  CategoryBars,
  FileChip,
  FindingList,
  KeywordGrid,
  Panel,
  ParserPreview,
  ScorePair,
  StatStrip,
  StepLoader,
  WinList,
  scoreTone,
} from "./parts";
import { buildMarkdownReport } from "./report-export";

/** The lazily-imported engine, held once it has loaded. */
type Engine = typeof import("@engines/resume");

type Stage =
  | { status: "idle" }
  | { status: "staged"; file: File }
  | { status: "working"; file: File; step: number }
  | {
      status: "ready";
      doc: PdfExtraction;
      parsed: ParsedResume;
      fileName: string;
    }
  | { status: "error"; message: string; hint?: string };

const SENIORITY_CHOICES: { value: Seniority | "auto"; label: string }[] = [
  { value: "auto", label: "From my dates" },
  { value: "student", label: "Student / graduate" },
  { value: "entry", label: "Entry — under 3 years" },
  { value: "mid", label: "Mid — 3 to 10 years" },
  { value: "senior", label: "Senior — 10 years+" },
  { value: "executive", label: "Executive / director" },
];

/** Let the browser paint the step label before the next blocking chunk. */
const paint = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => resolve()));

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The deterministic pass is usually under 150ms. Each step is held open
 * briefly so the loader reads as a result rather than a flicker — the
 * labels describe work that genuinely runs, in the order it runs.
 */
const MIN_STEP_MS = 190;

const STEPS = [
  'Reading your CV',
  'Extracting what a parser sees',
  'Detecting sections and roles',
  'Checking evidence and keywords',
  'Preparing recommendations',
];

export function ResumeChecker() {
  const [stage, setStage] = useState<Stage>({ status: "idle" });
  const [report, setReport] = useState<ResumeReport | null>(null);
  const [category, setCategory] = useState<string | null>(null);

  const [department, setDepartment] = useState<DepartmentId | "">("");
  const [targetRole, setTargetRole] = useState("");
  const [jobAd, setJobAd] = useState("");
  const [seniority, setSeniority] = useState<Seniority | "auto">("auto");
  const [showAdvert, setShowAdvert] = useState(false);
  const [missingDepartment, setMissingDepartment] = useState(false);

  const engineRef = useRef<Engine | null>(null);

  const options = useMemo<ScoreOptions>(
    () => ({ department, targetRole, jobAd, seniority }),
    [department, targetRole, jobAd, seniority],
  );

  const selected = DEPARTMENTS.find((d) => d.id === department) ?? null;

  /* ── Run: the expensive half, once per submit ── */
  const run = useCallback(async (file: File) => {
    setReport(null);
    setCategory(null);
    setStage({ status: "working", file, step: 0 });
    const started = performance.now();

    try {
      const engine = engineRef.current ?? (await import("@engines/resume"));
      engineRef.current = engine;

      const bytes = new Uint8Array(await file.arrayBuffer());
      await Promise.all([paint(), wait(MIN_STEP_MS)]);

      setStage({ status: "working", file, step: 1 });
      await paint();
      const { doc, parsed } = await engine.prepareResume(bytes);

      for (const step of [2, 3, 4]) {
        setStage({ status: "working", file, step });
        await Promise.all([paint(), wait(MIN_STEP_MS)]);
      }

      setStage({ status: "ready", doc, parsed, fileName: file.name });

      trackToolRun({
        tool_slug: "resume-checker",
        runtime: "client",
        duration_ms: Math.round(performance.now() - started),
        input_bytes: file.size,
        success: true,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "This CV could not be read.";
      const hint =
        error && typeof error === "object" && "hint" in error
          ? String((error as { hint?: string }).hint ?? "")
          : "";

      setStage({ status: "error", message, hint: hint || undefined });

      trackToolRun({
        tool_slug: "resume-checker",
        runtime: "client",
        duration_ms: Math.round(performance.now() - started),
        input_bytes: file.size,
        success: false,
        error_code: error instanceof Error ? error.name : "unknown",
      });
    }
  }, []);

  /* ── Score: the cheap half, on every option change ── */
  useEffect(() => {
    if (stage.status !== "ready" || !engineRef.current) return;
    setReport(engineRef.current.scoreResume(stage.parsed, stage.doc, options));
  }, [stage, options]);

  const submit = () => {
    if (stage.status !== "staged") return;
    if (department === "") {
      setMissingDepartment(true);
      document.getElementById("rc-dept")?.focus();
      return;
    }
    void run(stage.file);
  };

  const reset = () => {
    setStage({ status: "idle" });
    setReport(null);
    setCategory(null);
    setMissingDepartment(false);
  };

  const visibleFindings = useMemo(
    () =>
      report === null
        ? []
        : category === null
          ? report.findings
          : report.findings.filter((f) => f.category === category),
    [report, category],
  );

  const scrambled = report !== null && report.stats.columns > 1;
  const fileName = stage.status === "ready" ? stage.fileName : "";

  // Rebuilt only when the report changes, not on every render.
  const markdown = useMemo(
    () =>
      report === null
        ? ""
        : buildMarkdownReport(report, { targetRole, fileName }),
    [report, targetRole, fileName],
  );

  const intake = stage.status === "idle" || stage.status === "staged";

  return (
    <div className="space-y-4">
      {/* ═══ Intake ═══ */}
      {(intake || stage.status === "error") && (
        <div className="space-y-4">
          {/* 1 · File */}
          <Step index={1} label="Your CV">
            {stage.status === "staged" ? (
              <FileChip
                file={stage.file}
                onRemove={() => setStage({ status: "idle" })}
              />
            ) : (
              <FileDropzone
                accept={[".pdf"]}
                multiple={false}
                maxFiles={1}
                maxSizeMB={12}
                onFiles={(files) => {
                  const file = files[0];
                  if (file) setStage({ status: "staged", file });
                }}
                hint="Use the file you actually send — a fresh export can parse differently."
              />
            )}
          </Step>

          {/* 2 · Context. Department is the only required field, because
              it is the only one that changes what counts as evidence. */}
          <Step index={2} label="What it is for">
            <div className="space-y-3 rounded-xl border border-line bg-panel p-4">
              <Field
                label="Department"
                htmlFor="rc-dept"
                help={selected?.blurb ?? "Required — it decides what counts as evidence."}
              >
                <Select
                  id="rc-dept"
                  value={department}
                  aria-invalid={missingDepartment || undefined}
                  className={cx(missingDepartment && "border-danger")}
                  onChange={(e) => {
                    setDepartment(e.target.value as DepartmentId | "");
                    setMissingDepartment(false);
                  }}
                >
                  <option value="">Select your field…</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </Select>
              </Field>

              {missingDepartment && (
                <p role="alert" className="flex items-center gap-1.5 text-[12.5px] text-danger">
                  <AlertIcon size={13} />
                  Pick a department first — the rest is optional.
                </p>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Target role" htmlFor="rc-role" help="Optional">
                  <Input
                    id="rc-role"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder="Senior Frontend Engineer"
                    autoComplete="off"
                  />
                </Field>

                <Field label="Career stage" htmlFor="rc-seniority" help="Optional">
                  <Select
                    id="rc-seniority"
                    value={seniority}
                    onChange={(e) =>
                      setSeniority(e.target.value as Seniority | "auto")
                    }
                  >
                    {SENIORITY_CHOICES.map((choice) => (
                      <option key={choice.value} value={choice.value}>
                        {choice.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              {/* The advert is the highest-value optional input and the
                  bulkiest control. Folded away so the form reads as three
                  fields rather than a wall. */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvert((v) => !v)}
                  aria-expanded={showAdvert}
                  className="flex items-center gap-1.5 text-[13px] font-medium text-brand-text hover:underline"
                >
                  <ChevronDownIcon
                    size={14}
                    className={cx("transition-transform", showAdvert && "rotate-180")}
                  />
                  Paste the job advert for a keyword match
                </button>
                {showAdvert && (
                  <Textarea
                    className="mt-2"
                    value={jobAd}
                    onChange={(e) => setJobAd(e.target.value)}
                    rows={5}
                    aria-label="Job advert"
                    placeholder="Paste the requirements section…"
                  />
                )}
              </div>
            </div>
          </Step>

          {/* 3 · Go */}
          <Button
            variant="primary"
            size="lg"
            block
            className="w-full sm:w-full"
            disabled={stage.status !== "staged"}
            onClick={submit}
          >
            Check my CV
          </Button>

          <p className="flex items-center justify-center gap-2 text-center text-[12px] text-fg-subtle">
            <ShieldIcon size={13} className="shrink-0 text-brand-text" />
            Read in this tab. No upload, no account.
          </p>
        </div>
      )}

      {stage.status === "error" && (
        <ErrorPanel message={stage.message} hint={stage.hint} />
      )}

      {/* ═══ Working ═══ */}
      {stage.status === "working" && (
        <StepLoader steps={STEPS} current={stage.step} />
      )}

      {/* ═══ Report ═══ */}
      {stage.status === "ready" && report !== null && (
        <div className="space-y-6">
          {/* Score */}
          <div className="rounded-xl border border-line bg-panel p-4 sm:p-5">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
              <ScorePair
                score={report.score}
                grade={report.grade}
                relevance={report.relevance}
                relevanceGrade={report.relevanceGrade}
                relevanceLabel={report.relevanceLabel}
              />

              <div className="min-w-0 flex-1 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
                  {selected && <Badge tone="brand">{selected.label}</Badge>}
                  <Badge>{report.parsed.seniority}</Badge>
                  {report.stats.columns > 1 && <Badge tone="danger">two columns</Badge>}
                  {report.stats.invisibleRuns > 0 && (
                    <Badge tone="danger">hidden text</Badge>
                  )}
                </div>

                <p
                  className={cx(
                    "mt-2.5 text-[15px] font-medium leading-relaxed",
                    scoreTone(report.score).label,
                  )}
                >
                  {report.verdict}
                </p>

                <div className="mt-2.5 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                  {(["critical", "important", "polish"] as const).map((severity) => {
                    const count = report.findings.filter(
                      (f) => f.severity === severity,
                    ).length;
                    if (count === 0) return null;
                    return (
                      <Badge
                        key={severity}
                        tone={
                          severity === "critical"
                            ? "danger"
                            : severity === "important"
                              ? "warn"
                              : "neutral"
                        }
                      >
                        {count} {severity}
                      </Badge>
                    );
                  })}
                </div>

                <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <DownloadButton
                    value={markdown}
                    filename={`cv-report-${new Date().toISOString().slice(0, 10)}.md`}
                    mime="text/markdown;charset=utf-8"
                    label="Download report"
                  />
                  <CopyButton value={markdown} label="Copy" size="md" />
                  <ResetButton onClick={reset} />
                </div>

                {/* No applicant tracking system publishes a scoring
                    formula, so any tool claiming to reproduce one is
                    inventing it. Saying so is the difference between a
                    measurement and a promise. */}
                <p className="mt-3 text-[11.5px] leading-snug text-fg-subtle">
                  Estimated against our published criteria — not a guarantee of an interview or of
                  any particular system&rsquo;s acceptance.
                </p>
              </div>
            </div>

            <div className="mt-5">
              <StatStrip stats={report.stats} coverage={report.keywordCoverage} />
            </div>
          </div>

          {report.document.warnings.length > 0 && (
            <ul className="space-y-1 rounded-lg border border-warn-line bg-warn-soft px-3.5 py-2.5">
              {report.document.warnings.map((warning, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[12.5px] leading-relaxed text-warn"
                >
                  <AlertIcon size={13} className="mt-0.5 shrink-0" />
                  {warning}
                </li>
              ))}
            </ul>
          )}

          {/* Breakdown + findings */}
          <div className="grid gap-5 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
            <div className="lg:sticky lg:top-20 lg:self-start">
              <Panel title="Where the points went" subtitle="Select a row to filter.">
                <CategoryBars
                  categories={report.categories}
                  active={category}
                  onSelect={setCategory}
                />
              </Panel>
            </div>

            <Panel
              title={
                category === null
                  ? "What to fix"
                  : (report.categories.find((c) => c.id === category)?.label ??
                    "What to fix")
              }
              subtitle="Ordered by what it costs you."
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

          {/* The AI review starts on its own — the submit above was the
              consent, and the request carries no identifiers. */}
          {flags.ai && (
            <AiReviewPanel
              report={report}
              targetRole={targetRole}
              jobAd={jobAd}
              department={department}
              departmentLabel={selected?.label ?? ""}
              autoRun
            />
          )}

          {report.wins.length > 0 && (
            <Panel title="Already right">
              <WinList wins={report.wins} />
            </Panel>
          )}

          {report.keywords !== null &&
            report.keywords.length > 0 &&
            report.keywordCoverage !== null && (
              <Panel title="Against the job advert" subtitle={report.relevanceVerdict}>
                <KeywordGrid
                  keywords={report.keywords}
                  coverage={report.keywordCoverage}
                />
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
        </div>
      )}
    </div>
  );
}

/** A numbered step. The numeral does the work a sentence would have. */
function Step({
  index,
  label,
  children,
}: {
  index: number;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-fg">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sunken font-mono text-[11px] text-fg-muted">
          {index}
        </span>
        {label}
      </h2>
      {children}
    </section>
  );
}
