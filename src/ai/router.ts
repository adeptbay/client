import 'server-only';

/**
 * Part 7 — the AI layer.
 *
 * Two rules govern everything in this folder:
 *
 *   1. AI goes only where it genuinely beats a deterministic function.
 *      A JSON formatter must never call a model.
 *   2. Cost of goods is controlled before a feature ships, not after
 *      the bill arrives. Every path through this module passes a cache,
 *      a token ceiling and a daily budget cap.
 *
 * No provider SDK is imported. This is a `fetch` wrapper against a
 * chat-completions-shaped endpoint, so swapping providers is a change
 * of two environment variables. With NEXT_PUBLIC_FLAG_AI unset, none of
 * it runs and none of it ships.
 */

import { flags } from '@core/flags';
import { getCached, setCached, cacheKey } from './cache';
import { guardInput, guardOutput } from './guardrails';

/** Three tiers. Route down aggressively — most tasks do not need the top. */
export type ModelTier = 'fast' | 'balanced' | 'deep';

export interface AiRequest {
  tier: ModelTier;
  system: string;
  user: string;
  maxTokens?: number;
  /** Skip the cache for genuinely non-deterministic features. */
  noCache?: boolean;
  /** Identifies the calling tool, for per-tool cost attribution. */
  toolSlug: string;
}

export interface AiResponse {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  cached: boolean;
}

export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiUnavailableError';
  }
}

const MODELS: Record<ModelTier, string | undefined> = {
  fast: process.env.AI_MODEL_FAST,
  balanced: process.env.AI_MODEL_BALANCED,
  deep: process.env.AI_MODEL_DEEP,
};

/**
 * Per-million-token prices, used to attribute spend. These change; the
 * daily cap below is what actually protects the margin, not this table.
 */
const PRICE_PER_MTOK: Record<ModelTier, { input: number; output: number }> = {
  fast: { input: 1, output: 5 },
  balanced: { input: 3, output: 15 },
  deep: { input: 15, output: 75 },
};

/* ── Daily budget cap ───────────────────────────────────────────────
   In-process, so it resets on redeploy and is per-instance. That is
   deliberately crude: it is a circuit breaker, not accounting. Move it
   to Redis at the same time the rate limiter moves there (Part 6.8).  */

let spentToday = 0;
let budgetDay = new Date().toISOString().slice(0, 10);

const dailyBudget = Number(process.env.AI_DAILY_BUDGET_USD ?? '5');

function chargeBudget(amount: number): void {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== budgetDay) {
    budgetDay = today;
    spentToday = 0;
  }
  spentToday += amount;
}

export const budgetStatus = () => ({
  day: budgetDay,
  spentUsd: Math.round(spentToday * 10000) / 10000,
  limitUsd: dailyBudget,
  remainingUsd: Math.max(0, dailyBudget - spentToday),
});

/* ── The call ───────────────────────────────────────────────────── */

export async function generate(request: AiRequest): Promise<AiResponse> {
  if (!flags.ai) {
    throw new AiUnavailableError('AI features are turned off.');
  }

  const apiKey = process.env.AI_API_KEY;
  const model = MODELS[request.tier];
  if (!apiKey || !model) {
    throw new AiUnavailableError('AI is not configured on this deployment.');
  }

  if (spentToday >= dailyBudget) {
    throw new AiUnavailableError(
      'This feature has reached its daily budget. Deterministic tools are unaffected — try again tomorrow.',
    );
  }

  // Guardrail 1: sanitise and bound the input before it costs anything.
  const user = guardInput(request.user);

  // Guardrail 2: identical input, identical output, paid for once.
  // Part 7's single largest cost lever.
  const key = cacheKey(request.toolSlug, model, request.system, user);
  if (!request.noCache) {
    const hit = getCached(key);
    if (hit) {
      return { ...hit, cached: true };
    }
  }

  const maxTokens = Math.min(request.maxTokens ?? 1024, 4096);

  const response = await fetch(`${process.env.AI_BASE_URL ?? 'https://api.anthropic.com/v1'}/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: request.system,
      messages: [{ role: 'user', content: user }],
    }),
    // A model call must never hold a serverless function open indefinitely.
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new AiUnavailableError(
      response.status === 429
        ? 'The AI service is rate limiting us right now. Try again in a minute.'
        : 'The AI service could not be reached.',
    );
  }

  const data = (await response.json()) as {
    content?: { type: string; text?: string }[];
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  const text = (data.content ?? [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text ?? '')
    .join('');

  const inputTokens = data.usage?.input_tokens ?? 0;
  const outputTokens = data.usage?.output_tokens ?? 0;
  const price = PRICE_PER_MTOK[request.tier];
  const costUsd = (inputTokens * price.input + outputTokens * price.output) / 1_000_000;

  chargeBudget(costUsd);

  // Guardrail 3: never return raw model output to a page.
  const safe = guardOutput(text);

  const result: Omit<AiResponse, 'cached'> = {
    text: safe,
    model,
    inputTokens,
    outputTokens,
    costUsd,
  };

  if (!request.noCache) setCached(key, result);

  return { ...result, cached: false };
}
