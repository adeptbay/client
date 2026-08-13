/**
 * The CV checker pipeline.
 *
 *   PDF bytes ─► extractPdf ─► parseResume ─► scoreResume ─► ResumeReport
 *                 (layer 1a)    (layer 1b)     (layer 2)
 *
 * All three run on the user's device. Layer 3 — the AI review — is a
 * separate, optional call the user has to ask for, and it lives in the
 * API route rather than here, because this file must stay importable
 * into the browser with no server dependency behind it.
 */

import { extractPdf, PdfError, type PdfExtraction } from '@engines/pdf';
import { linesFromText, parseResume, type ResumeLine } from './parse';
import { DEFAULT_SCORE_OPTIONS, scoreResume, type ScoreOptions } from './score';
import type { ParsedResume, ResumeReport } from './types';

export { PdfError };
export * from './types';
export { parseResume, linesFromText } from './parse';
export { scoreResume, extractKeywords, DEFAULT_SCORE_OPTIONS, GRADE_BANDS, LENGTH_BANDS } from './score';
export type { ScoreOptions } from './score';
export type { ResumeLine } from './parse';

/** Positioned lines out of the PDF, in the order a reader would take them. */
function linesFromPdf(doc: PdfExtraction): ResumeLine[] {
  return doc.lines
    .filter((l) => !l.invisible)
    .map((l) => ({
      text: l.text,
      size: l.size,
      bold: l.bold,
      page: l.page,
      column: l.column,
      y: l.y,
    }));
}

/**
 * Layer 1 on its own: the expensive half.
 *
 * Split out from scoring because the two have very different costs. This
 * runs once per file and takes tens to hundreds of milliseconds; scoring
 * runs again every time the user edits the target role or pastes a job
 * advert, and takes about a millisecond. Keeping them separate is what
 * lets the score move as the user types instead of after a re-upload.
 */
export async function prepareResume(
  source: ArrayBuffer | Uint8Array,
): Promise<{ doc: PdfExtraction; parsed: ParsedResume }> {
  const doc = await extractPdf(source);

  const lines = linesFromPdf(doc);
  const parsed = parseResume(lines.length > 0 ? lines : linesFromText(doc.text), {
    linkUrls: doc.linkUrls,
    author: doc.info.author,
  });

  return { doc, parsed };
}

/** The whole client-side check, from a dropped file to a finished report. */
export async function checkResumePdf(
  source: ArrayBuffer | Uint8Array,
  options: ScoreOptions = DEFAULT_SCORE_OPTIONS,
): Promise<ResumeReport> {
  const { doc, parsed } = await prepareResume(source);
  return scoreResume(parsed, doc, options);
}

/**
 * The same scoring against pasted text.
 *
 * Everything in the parse category that needs a real file — columns,
 * embedded fonts, hidden text — is unknowable here, so this synthesises
 * a document that is honest about that: one page, text present, nothing
 * else claimed. It exists for the headless path (`run()` and the API),
 * never as an alternative the UI offers, because "paste your CV" quietly
 * skips the half of the check that matters most.
 */
export function checkResumeText(
  text: string,
  options: ScoreOptions = DEFAULT_SCORE_OPTIONS,
): ResumeReport {
  const parsed = parseResume(linesFromText(text));

  const words = parsed.words;
  const doc: PdfExtraction = {
    text,
    atsText: text,
    lines: [],
    runs: [],
    pages: [
      {
        number: 1,
        width: 612,
        height: 792,
        glyphs: text.length,
        images: 0,
        columns: 1,
        vectorMarks: 0,
        marginRuns: 0,
      },
    ],
    info: { title: '', author: '', creator: '', producer: '' },
    unmappedGlyphs: 0,
    nonEmbeddedFonts: [],
    linkUrls: [],
    warnings: ['Scored from text. Layout checks — columns, fonts, hidden text — need the PDF.'],
    bytes: new Blob([text]).size,
    version: 'n/a',
  };

  // One page is claimed above; correct it to what the word count implies
  // so the length checks stay meaningful without inventing layout facts.
  const impliedPages = Math.max(1, Math.round(words / 500));
  for (let p = 2; p <= impliedPages; p++) {
    doc.pages.push({ ...doc.pages[0]!, number: p, glyphs: 0 });
  }

  return scoreResume(parsed, doc, options);
}
