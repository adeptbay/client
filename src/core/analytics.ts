/**
 * Part 6.9 — tool-level observability.
 *
 * The event shape is a one-to-one match for the `tool_usage` table in
 * Part 6.4, so standing up Postgres later is a change of transport, not
 * a change of instrumentation.
 *
 * What is never sent: the input, the output, the filename, the IP, or
 * anything derived from file content. Size, type and duration only.
 * The privacy policy commits us to that, and it is also the marketing.
 */

import { flags } from './flags';

export interface ToolUsageEvent {
  tool_slug: string;
  runtime: 'client' | 'edge' | 'server';
  duration_ms: number;
  input_bytes: number;
  success: boolean;
  error_code?: string;
}

const endpoint = process.env.NEXT_PUBLIC_ANALYTICS_URL;
const siteId = process.env.NEXT_PUBLIC_ANALYTICS_SITE_ID;

/**
 * Fire-and-forget. Uses `sendBeacon` so a result page that the user
 * closes immediately still reports, and so the request can never block
 * the interaction that produced it.
 */
export function trackToolRun(event: ToolUsageEvent): void {
  if (typeof window === 'undefined') return;
  if (!flags.analytics || !endpoint) return;

  const body = JSON.stringify({
    site: siteId,
    name: 'tool_run',
    ...event,
    // Coarse only. No user agent string, no fingerprint, no identifier.
    device: window.innerWidth < 768 ? 'mobile' : 'desktop',
    referrer_type: referrerType(),
  });

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
    } else {
      void fetch(endpoint, { method: 'POST', body, keepalive: true });
    }
  } catch {
    // Analytics must never surface an error to a user mid-task.
  }
}

/** Part 6.4 — `referrer_type`, so channel mix is measurable (Part 0, rule 3). */
function referrerType(): 'search' | 'direct' | 'social' | 'ai' | 'internal' {
  const ref = document.referrer;
  if (!ref) return 'direct';

  let host: string;
  try {
    host = new URL(ref).hostname;
  } catch {
    return 'direct';
  }

  if (host === window.location.hostname) return 'internal';
  if (/(chatgpt|openai|perplexity|claude|copilot|gemini)\./.test(host)) return 'ai';
  if (/(google|bing|duckduckgo|yandex|ecosia|brave)\./.test(host)) return 'search';
  if (/(reddit|news\.ycombinator|x\.com|twitter|linkedin|facebook|youtube)\./.test(host)) return 'social';
  return 'direct';
}
