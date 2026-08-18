import 'server-only';

/**
 * Groq — the AI layer's provider.
 *
 * Part 7's two rules still hold: AI only where it beats a deterministic
 * function, and cost controlled before the feature ships. This file adds
 * a third that Groq specifically forces:
 *
 *   **Model names are not stable.** Groq retires model ids on a few
 *   weeks' notice. A single hard-coded id is a feature that works until
 *   a Tuesday and then returns 404 to every visitor. So the model is a
 *   *chain*, tried in order, and a decommissioned head is a log line
 *   rather than an outage.
 *
 * `router.ts` stays as it is — that one speaks the Anthropic Messages
 * shape. This speaks OpenAI-compatible chat completions, which is what
 * Groq serves, and shares the router's cache and guardrails rather than
 * duplicating them.
 */

import { getCached, setCached, cacheKey } from './cache';
import { guardOutput } from './guardrails';

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Tried in order. The first is chosen for judgement quality on long
 * text; the last is the cheap, fast floor that keeps the feature alive
 * if the larger models are saturated or retired.
 */
const MODEL_CHAIN: string[] = (process.env.GROQ_MODELS ?? '')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

/**
 * Groq deprecated the Llama 3.x chat models on 2026-06-17 and stopped
 * serving them entirely in August 2026 — `llama-3.3-70b-versatile` and
 * `llama-3.1-8b-instant` both 404 now. These are Groq's own replacements:
 * https://console.groq.com/docs/deprecations
 */
const DEFAULT_CHAIN = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'];

/** Groq bills per token; these are only used to attribute spend. */
const PRICE_PER_MTOK = { input: 0.59, output: 0.79 };

const DAILY_BUDGET_USD = Number(process.env.AI_DAILY_BUDGET_USD ?? '5');
const REQUEST_TIMEOUT_MS = 25_000;

export class AiUnavailableError extends Error {
  readonly status: number;
  constructor(message: string, status = 503) {
    super(message);
    this.name = 'AiUnavailableError';
    this.status = status;
  }
}

/* ── Budget circuit breaker ─────────────────────────────────────────
   In-process and per-instance, exactly like router.ts. Crude on
   purpose: it is a breaker, not accounting. Redis when the rate
   limiter moves there.                                              */

let spentToday = 0;
let budgetDay = new Date().toISOString().slice(0, 10);

function charge(amount: number): void {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== budgetDay) {
    budgetDay = today;
    spentToday = 0;
  }
  spentToday += amount;
}

export const groqBudget = () => ({
  day: budgetDay,
  spentUsd: Math.round(spentToday * 10_000) / 10_000,
  limitUsd: DAILY_BUDGET_USD,
});

export const groqConfigured = (): boolean => Boolean(process.env.GROQ_API_KEY);

/* ── The call ───────────────────────────────────────────────────── */

export interface GroqRequest {
  system: string;
  user: string;
  /** Identifies the calling tool, for per-tool cost attribution. */
  toolSlug: string;
  maxTokens?: number;
  temperature?: number;
  /** Ask the model for a single JSON object and nothing else. */
  json?: boolean;
}

export interface GroqResponse {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  cached: boolean;
}

interface ChatCompletion {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string; code?: string };
}

/** A model id that no longer exists — move to the next in the chain. */
const isModelGone = (status: number, body: string): boolean =>
  status === 404 ||
  (status === 400 && /decommission|does not exist|not found|no longer supported/i.test(body));

export async function generate(request: GroqRequest): Promise<GroqResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new AiUnavailableError('The AI review is not configured on this deployment.');
  }
  if (spentToday >= DAILY_BUDGET_USD) {
    throw new AiUnavailableError(
      'The AI review has reached its daily budget. Every other part of this check is unaffected — it runs on your device and does not use it.',
    );
  }

  const chain = MODEL_CHAIN.length > 0 ? MODEL_CHAIN : DEFAULT_CHAIN;
  const maxTokens = Math.min(request.maxTokens ?? 1600, 4096);

  /* Cache before the network. Identical CV, identical advice, paid for
     once — the single largest cost lever in Part 7. Keyed on the head of
     the chain so a model change does not serve stale advice. */
  const key = cacheKey(request.toolSlug, chain[0] ?? 'groq', request.system, request.user);
  const hit = getCached(key);
  if (hit) return { ...hit, cached: true };

  let lastError: AiUnavailableError | null = null;

  for (const model of chain) {
    let response: Response;
    try {
      response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: request.system },
            { role: 'user', content: request.user },
          ],
          // Low but not zero: the rewrites need some room to find a
          // better verb, and greedy decoding makes them formulaic.
          temperature: request.temperature ?? 0.3,
          max_tokens: maxTokens,
          top_p: 0.9,
          stream: false,
          /**
           * Both current chain models are GPT-OSS reasoning models,
           * which spend output-token budget on hidden chain-of-thought
           * before writing the answer. At the default ('medium') that
           * reasoning alone can exceed `maxTokens`, truncating the JSON
           * answer before it is complete. 'low' leaves enough budget
           * for a finished answer and is also faster and cheaper.
           *
           * This is not a universal no-op: a model that does not
           * support `reasoning_effort` (confirmed on qwen and Groq's
           * compound models) 400s on it rather than ignoring it. That
           * 400 does not match `isModelGone` below, so it falls through
           * to `continue` like any other error and the chain moves to
           * the next model — wasteful, not broken — but if a
           * non-GPT-OSS model is ever added to the chain, gate this
           * field on the model id rather than assuming it is harmless.
           */
          reasoning_effort: 'low',
          ...(request.json ? { response_format: { type: 'json_object' } } : {}),
        }),
        // A model call must never hold a serverless function open.
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      lastError = new AiUnavailableError(
        error instanceof Error && error.name === 'TimeoutError'
          ? 'The AI review took too long and was cancelled. Your score and findings above are unaffected.'
          : 'The AI service could not be reached.',
      );
      continue;
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');

      if (isModelGone(response.status, body)) {
        // Expected, not exceptional: Groq retires ids regularly.
        console.warn(`[groq] model "${model}" is unavailable; falling through the chain.`);
        lastError = new AiUnavailableError('The configured AI model is unavailable.');
        continue;
      }
      if (response.status === 429) {
        throw new AiUnavailableError(
          'The AI service is rate limiting us right now. Try the review again in a minute — nothing else on this page is affected.',
          429,
        );
      }
      if (response.status === 401 || response.status === 403) {
        throw new AiUnavailableError('The AI review is not configured correctly on this deployment.');
      }
      lastError = new AiUnavailableError('The AI service returned an error.');
      continue;
    }

    const data = (await response.json()) as ChatCompletion;
    const text = data.choices?.[0]?.message?.content ?? '';
    if (text.trim().length === 0) {
      lastError = new AiUnavailableError('The AI service returned an empty response.');
      continue;
    }

    const inputTokens = data.usage?.prompt_tokens ?? 0;
    const outputTokens = data.usage?.completion_tokens ?? 0;
    const costUsd = (inputTokens * PRICE_PER_MTOK.input + outputTokens * PRICE_PER_MTOK.output) / 1_000_000;
    charge(costUsd);

    const result = {
      // Never return raw model output to a page.
      text: guardOutput(text),
      model,
      inputTokens,
      outputTokens,
      costUsd,
    };
    setCached(key, result);
    return { ...result, cached: false };
  }

  throw lastError ?? new AiUnavailableError('The AI service could not be reached.');
}
