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
