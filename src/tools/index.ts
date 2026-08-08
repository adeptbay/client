/**
 * The tool barrel — the registry's only input.
 *
 * Explicit imports rather than a filesystem scan, because a static
 * import graph is what lets the bundler prove which tool code a given
 * page needs. A `require.context` or a glob would pull every tool into
 * every page and the bundle budget would be gone by tool fifty.
 *
 * `npm run new-tool` appends to this list. Do not hand-edit the array
 * order — it is alphabetical within a division so that a merge conflict
 * here is trivially resolvable.
 */

import type { ToolDefinition } from '@core/tool';

// ── text ──────────────────────────────────────────────────────────
import caseConverter from './text/case-converter';
import readabilityChecker from './text/readability-checker';
import removeDuplicateLines from './text/remove-duplicate-lines';
import slugGenerator from './text/slug-generator';
import sortLines from './text/sort-lines';
import textDiff from './text/text-diff';
import wordCounter from './text/word-counter';

// ── developer ─────────────────────────────────────────────────────
import base64Encoder from './developer/base64-encoder';
import jsonFormatter from './developer/json-formatter';
import urlEncoder from './developer/url-encoder';
import uuidGenerator from './developer/uuid-generator';

// ── security ──────────────────────────────────────────────────────
import hashGenerator from './security/hash-generator';
import passwordGenerator from './security/password-generator';

// ── calculator ────────────────────────────────────────────────────
import percentageCalculator from './calculator/percentage-calculator';

export const allTools: ToolDefinition<never, never>[] = [
  // text
  wordCounter,
  caseConverter,
  removeDuplicateLines,
  sortLines,
  textDiff,
  slugGenerator,
  readabilityChecker,

  // developer
  jsonFormatter,
  base64Encoder,
  urlEncoder,
  uuidGenerator,

  // security
  passwordGenerator,
  hashGenerator,

  // calculator
  percentageCalculator,
];
