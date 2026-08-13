/**
 * The takeaway document.
 *
 * A CV is edited in Word, in Google Docs, on a phone on the bus — not in
 * the tab that produced the score. So the report has to leave with the
 * user in a form they can work from, and that form is a checklist with
 * the offending lines quoted next to what to do about them.
 *
 * Markdown rather than PDF: it pastes into a document, a ticket, an
 * email to whoever is helping, and a model. A PDF would look more
 * finished and be less useful.
 *
 * Nothing here reaches the network, and the file is assembled from the
 * report already in memory.
 */

import type { Finding, ResumeReport, Severity } from '@engines/resume/types';

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Critical — costs you the application before anyone reads it',
  important: 'Important — costs you the read once a human has it',
  polish: 'Polish — consistency and preference',
};

function section(findings: Finding[], severity: Severity): string[] {
  const group = findings.filter((f) => f.severity === severity);
  if (group.length === 0) return [];

  const out: string[] = ['', `### ${SEVERITY_LABEL[severity]}`, ''];

  group.forEach((finding, i) => {
    out.push(`**${i + 1}. ${finding.title}**`);
    out.push('');
    if (finding.detail) out.push(finding.detail, '');
    if (finding.fix) out.push(`- **Do this:** ${finding.fix}`);
    if (finding.evidence.length > 0) {
      out.push('- **From your CV:**');
      for (const line of finding.evidence) out.push(`  - \`${line.replace(/`/g, "'")}\``);
    }
    out.push('');
  });

  return out;
}

export function buildMarkdownReport(
  report: ResumeReport,
  meta: { targetRole: string; fileName: string },
): string {
  const { stats } = report;
  const date = new Date().toISOString().slice(0, 10);

  const lines: string[] = [
    `# CV check — ${report.score}/100 (grade ${report.grade})`,
    '',
    report.verdict,
    '',
    `_${meta.fileName} · checked ${date}${meta.targetRole ? ` · against "${meta.targetRole}"` : ''}_`,
    '',
    '## Score breakdown',
    '',
    '| Category | Score | Points |',
    '| --- | --- | --- |',
  ];

  for (const category of report.categories) {
    lines.push(`| ${category.label} | ${category.score}/100 | ${category.points}/${category.maxPoints} |`);
  }

  lines.push(
    '',
    '## The document',
    '',
    `- ${stats.pages} page${stats.pages === 1 ? '' : 's'}, ${stats.words} words, ${stats.fileKb} KB`,
    `- ${stats.roles} role${stats.roles === 1 ? '' : 's'}, ${stats.bullets} bullets, ${stats.quantifiedBullets} of them carrying a number`,
    `- ${stats.skills} skills detected`,
    `- About ${stats.readingSeconds} seconds to scan; a screener gives roughly seven`,
    `- Layout: ${stats.columns > 1 ? `${stats.columns} columns — this is the finding to fix first` : 'single column'}`,
  );

  if (stats.invisibleRuns > 0) {
    lines.push(`- **${stats.invisibleRuns} runs of text a human cannot see.** Remove them before sending this file anywhere.`);
  }
  if (stats.unmappedGlyphs > 0) {
    lines.push(`- ${stats.unmappedGlyphs} characters could not be decoded to text`);
  }

  if (report.findings.length > 0) {
    lines.push('', '## What to fix');
    lines.push(...section(report.findings, 'critical'));
    lines.push(...section(report.findings, 'important'));
    lines.push(...section(report.findings, 'polish'));
  } else {
    lines.push('', '## What to fix', '', 'Nothing. Every check passed.');
  }

  if (report.wins.length > 0) {
    lines.push('', '## What already works', '');
    for (const win of report.wins) lines.push(`- ${win}`);
  }

  if (report.keywords !== null && report.keywords.length > 0) {
    const missing = report.keywords.filter((k) => !k.inResume);
    lines.push('', '## Against the job advert', '', `Coverage: ${report.keywordCoverage}%`, '');

    if (missing.length > 0) {
      lines.push('Terms the advert repeats that your CV never uses:', '');
      for (const keyword of missing) lines.push(`- ${keyword.term} (used ${keyword.adCount}× in the advert)`);
      lines.push(
        '',
        "Add only the ones you genuinely meet, in the advert's own spelling, inside the bullet that proves them.",
      );
    } else {
      lines.push('Every term the advert repeats already appears in your CV.');
    }
  }

  lines.push(
    '',
    '---',
    '',
    'Checked with the AdeptBay CV / Resume Checker. The parse, the score and every finding above were produced in the browser — the file was never uploaded.',
  );

  return lines.join('\n');
}
