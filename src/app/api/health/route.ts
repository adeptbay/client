import { activeCategories, liveTools, totalLive } from '@core/registry';
import { flags } from '@core/flags';

/**
 * Health endpoint — Appendix A step 08 item 22, uptime monitoring.
 *
 * It reads the registry rather than returning a constant, so a failure
 * that would break every tool page (a bad definition, a broken import)
 * shows up here as a non-200 rather than being discovered by a visitor.
 */

export const dynamic = 'force-dynamic';

export function GET(): Response {
  try {
    const tools = liveTools();

    const body = {
      status: 'ok',
      time: new Date().toISOString(),
      tools: totalLive(),
      categories: activeCategories().length,
      clientSideTools: tools.filter((t) => t.runtime === 'client').length,
      flags,
    };

    return Response.json(body, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    return Response.json(
      {
        status: 'error',
        time: new Date().toISOString(),
        message: error instanceof Error ? error.message : 'registry failed to load',
      },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    );
  }
}
