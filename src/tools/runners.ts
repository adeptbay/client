import type { ToolDefinition } from '@core/tool';

/**
 * The client-side runner map.
 *
 * The registry (`src/tools/index.ts`) is imported by server components and
 * carries every tool's metadata. This map is imported by ToolRunner in
 * the browser and carries nothing until a specific tool is asked for.
 *
 * Each entry is a dynamic import, so the bundler emits one chunk per
 * tool. A visitor on /text/word-counter downloads the word counter's
 * logic and none of the other 999. That is the whole reason a single
 * codebase can serve a thousand tools without a 3 MB bundle.
 *
 * `npm run new-tool` appends here too. The keys are tool slugs and must
 * match `src/tools/index.ts` exactly — the registry audit fails the build
 * if one is missing.
 */

type Runner = () => Promise<{ default: ToolDefinition<never, never> }>;

export const runners: Record<string, Runner> = {
  // text
  'word-counter': () => import('./text/word-counter'),
  'case-converter': () => import('./text/case-converter'),
  'remove-duplicate-lines': () => import('./text/remove-duplicate-lines'),
  'remove-extra-spaces': () => import('./text/remove-extra-spaces'),
  'sort-lines': () => import('./text/sort-lines'),
  'text-diff': () => import('./text/text-diff'),
  'find-and-replace': () => import('./text/find-and-replace'),
  'slug-generator': () => import('./text/slug-generator'),
  'readability-checker': () => import('./text/readability-checker'),
  'character-frequency-counter': () => import('./text/character-frequency-counter'),
  'line-numberer': () => import('./text/line-numberer'),
  'lorem-ipsum-generator': () => import('./text/lorem-ipsum-generator'),
  'text-reverser': () => import('./text/text-reverser'),
  'text-to-columns': () => import('./text/text-to-columns'),
  'text-encryptor': () => import('./text/text-encryptor'),

  // developer
  'json-formatter': () => import('./developer/json-formatter'),
  'base64-encoder': () => import('./developer/base64-encoder'),
  'url-encoder': () => import('./developer/url-encoder'),
  'uuid-generator': () => import('./developer/uuid-generator'),
  'regex-tester': () => import('./developer/regex-tester'),
  'jwt-decoder': () => import('./developer/jwt-decoder'),
  'json-to-csv': () => import('./developer/json-to-csv'),
  'json-to-yaml': () => import('./developer/json-to-yaml'),
  'json-diff': () => import('./developer/json-diff'),
  'json-to-typescript': () => import('./developer/json-to-typescript'),

  // security
  'password-generator': () => import('./security/password-generator'),
  'hash-generator': () => import('./security/hash-generator'),

  // calculator
  'percentage-calculator': () => import('./calculator/percentage-calculator'),

  // career
  'resume-builder': () => import('./career/resume-builder'),
  'resume-checker': () => import('./career/resume-checker'),
};
