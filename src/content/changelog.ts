/**
 * Changelog. Appendix A step 06 item 15.
 *
 * Dated, specific entries are one of the cheapest ways to signal that a
 * site is maintained — to a returning visitor and to a retrieval engine
 * choosing between two sources (Part 5.10 tactic 5).
 *
 * Rule: correctness fixes are always listed, including what was wrong
 * and for how long. A changelog that only lists good news is marketing.
 */

export type ChangeKind = 'added' | 'improved' | 'fixed' | 'changed';

export interface ChangeEntry {
  date: string;
  kind: ChangeKind;
  title: string;
  detail?: string;
}

export const CHANGE_LABELS: Record<ChangeKind, string> = {
  added: 'Added',
  improved: 'Improved',
  fixed: 'Fixed',
  changed: 'Changed',
};

export const changelog: ChangeEntry[] = [
  {
    date: '2026-08-13',
    kind: 'added',
    title: 'CV / Resume Builder — free PDF, no account, no export wall',
    detail:
      'The standard elsewhere is a free editor with the download behind a subscription: you spend an hour on your CV and meet the paywall at the end. This one assembles the document in your browser, saves the draft to your browser, and exports through your own print engine — so there is no server copy to charge you for releasing, and non-Latin names typeset correctly instead of coming out as boxes. Two single-column templates, a preview at true print size, and coaching on every bullet as you write it drawn from the CV Checker\'s own word lists, so a bullet this tool accepts is a bullet the checker scores well. The sample document comes back from the checker at 98/100.',
  },
  {
    date: '2026-08-13',
    kind: 'fixed',
    title: 'The checker demanded dates on projects, which do not have them',
    detail:
      'Entries under a Projects heading were held to the same rule as employment, so a correctly built CV was told that "1 of 2 roles have no dates". Found by scoring the new builder\'s own output against the checker. Dates are now required of jobs only.',
  },
  {
    date: '2026-08-13',
    kind: 'changed',
    title: 'The CV checker now returns two scores instead of one',
    detail:
      'A single number could not answer the two questions people actually have, because they fail in opposite directions: a well-made CV aimed at the wrong role and a badly-made CV aimed at the right one produced similar figures and opposite correct actions. There are now a CV quality score — parsing, structure, evidence, language, length — and a separate field or job fit score. Quality is department-independent by construction: changing your field moves fit and leaves quality exactly where it was.',
  },
  {
    date: '2026-08-13',
    kind: 'fixed',
    title: 'Checks that could not run were scoring full marks',
    detail:
      'Keyword coverage with no advert pasted, a portfolio check for an accountant, a leadership check on a graduate CV — each returned a pass rather than standing down, so a score could be inflated by questions that were never asked. Those checks are now excluded from the total instead of awarded it, which is why some scores moved. Present throughout the checker\'s development and fixed before it saw traffic.',
  },
  {
    date: '2026-08-13',
    kind: 'added',
    title: 'The CV checker judges against your department',
    detail:
      'Eighteen fields, covering CSE, civil and electrical engineering, BBA, English and Bangla, healthcare, law, design, sales and the rest. Each one changes four things and only four: which skills a recruiter in that field searches for, which link they open first, which extra section is expected, and how a result is phrased. A missing portfolio link is fatal in design and irrelevant in accounting; a quota figure is everything in sales and nothing on a clinical CV. The AI review reads the same way, as that field\'s hiring manager. Leave the field unselected and every department check stands down rather than guessing.',
  },
  {
    date: '2026-08-13',
    kind: 'added',
    title: 'CV / Resume Checker — the Career division opens',
    detail:
      'Drop in a PDF and it is parsed in your browser the way an applicant tracking system parses it: objects, streams, fonts and content operators, with no upload and no third-party library. It then runs 38 named checks across seven weighted categories and reports each one against the line in your CV that caused it. It detects two-column layouts and shows, side by side, how the gutter scrambles your file when read straight across; it detects fonts with no character map, which look perfect on screen and paste as boxes; and it detects white-on-white keyword stuffing, which is grounds for discarding an application at most agencies. An optional AI review at the end is the only part that sends anything — it asks first, strips your name, email and phone before it does, and every bullet it rewrites is checked back against your real file so a paraphrase cannot reach you as a quotation.',
  },
  {
    date: '2026-08-13',
    kind: 'fixed',
    title: 'A CV bullet reading "cut churn 34%" was scored as having no number',
    detail:
      'The pattern matching percentages required a word boundary after the "%", which cannot occur at the end of a clause — so the single most common way a CV states a result was invisible to the check that exists to find it. Present from the first day of the checker\'s development and caught before launch; no published score was affected.',
  },
  {
    date: '2026-08-12',
    kind: 'fixed',
    title: 'Passphrases were being written into the address bar',
    detail:
      'Tool options are stored in the URL so a configured tool is a shareable link. Two options should never have been: the Text Encryptor passphrase and the Hash Generator HMAC secret. Typing either put it in the query string, and from there into browser history and any shared link. Both are now masked, with a Show toggle, and are excluded from the URL in both directions. Present from the launch of each tool until this fix; no data was ever transmitted, but the secret was recorded locally where it should not have been.',
  },
  {
    date: '2026-08-12',
    kind: 'fixed',
    title: 'Twenty tool pages advertised an API that does not exist yet',
    detail:
      'An "API available" badge rendered from a tool\'s eligibility flag rather than from whether the API itself is live. The public API is still unreleased, so the badge now requires both.',
  },
  {
    date: '2026-08-12',
    kind: 'fixed',
    title: 'Social preview images were blocked from being fetched',
    detail:
      'robots.txt disallowed the whole /api/ path, which includes the endpoint that generates every Open Graph image. Facebook and X both honour robots.txt, so shared links would have shown a blank card. The image endpoint is now explicitly allowed.',
  },
  {
    date: '2026-08-12',
    kind: 'improved',
    title: 'Page titles keep the brand name again',
    detail:
      'Titles were assembled and then truncated to 60 characters from the right, which cut off "| AdeptBay" on every tool and guide page and left a dangling dash. Titles are now budgeted so the tool name and the brand always survive and only the benefit phrase shrinks.',
  },
  {
    date: '2026-08-09',
    kind: 'added',
    title: 'Eight new text tools — the Text division is complete',
    detail:
      'Remove Extra Spaces, Find and Replace, Text Reverser, Line Numberer, Text to Columns, Character Frequency Counter, Lorem Ipsum Generator and Text Encryptor. 22 tools live.',
  },
  {
    date: '2026-08-09',
    kind: 'changed',
    title: 'Every benchmark re-measured on a stated reference machine',
    detail:
      'Timings on tool pages were previously estimates. They are now measured on an Intel i5-6300U in Chrome 151, median of 8 runs — the method the methodology page promises. Several numbers moved by more than 2x.',
  },
  {
    date: '2026-08-09',
    kind: 'fixed',
    title: 'Command palette overlay only covered the header',
    detail:
      'The header carries backdrop-blur, which makes it a containing block for fixed-position children, so the modal backdrop resolved to a 64px strip instead of the viewport. It now renders through a portal, with a focus trap and scroll-lock compensation.',
  },
  {
    date: '2026-08-08',
    kind: 'added',
    title: 'AdeptBay launches with 14 tools',
    detail:
      'Text, developer, security and calculator divisions. Every tool runs entirely in the browser — nothing is uploaded, and no account is required for anything.',
  },
  {
    date: '2026-08-08',
    kind: 'added',
    title: 'Command palette',
    detail: 'Press ⌘K or Ctrl-K anywhere to search every tool by name or keyword.',
  },
  {
    date: '2026-08-08',
    kind: 'added',
    title: 'Options are stored in the URL',
    detail:
      'Changing a tool option updates the address bar, so a configured tool is a link you can bookmark or send to someone.',
  },
  {
    date: '2026-08-08',
    kind: 'added',
    title: 'Dark theme',
    detail:
      'Follows your system preference by default, with a manual override that is remembered on your device and never transmitted.',
  },
];
