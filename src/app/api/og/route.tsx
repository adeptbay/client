import { ImageResponse } from 'next/og';
import { site } from '@core/site';

/**
 * Dynamic Open Graph images.
 *
 * Part 6.6 — generated at the edge, cached permanently by slug. One
 * image per tool without a designer touching 1000 files, and no build
 * time spent rendering them.
 *
 * Rendered with system fonts on purpose: fetching a webfont here adds a
 * network round trip to every cold generation and is the most common
 * reason OG routes time out.
 */

// Runs on the Node runtime: the Edge runtime is deprecated in Next 16,
// and ImageResponse works identically on Node.
export function GET(request: Request): Response {
  const { searchParams } = new URL(request.url);

  const title = (searchParams.get('title') ?? site.name).slice(0, 90);
  const kicker = (searchParams.get('kicker') ?? site.tagline).slice(0, 40);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          background: 'linear-gradient(135deg, #052b29 0%, #0f6961 55%, #128b82 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* The mark, redrawn inline — the OG runtime cannot import a component. */}
          <svg width="64" height="64" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="9" fill="#ffffff" fillOpacity="0.14" />
            <circle
              cx="16"
              cy="16"
              r="7.5"
              fill="none"
              stroke="#ffffff"
              strokeWidth="3.6"
              strokeLinecap="round"
              strokeDasharray="34.03 13.09"
              strokeDashoffset="-6.55"
            />
            <circle cx="25" cy="16" r="2.2" fill="#ffffff" />
          </svg>
          <span style={{ fontSize: 34, fontWeight: 600, color: '#ffffff', letterSpacing: '-0.02em' }}>
            {site.name}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: '#a6eadd',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            {kicker}
          </span>
          <span
            style={{
              marginTop: 18,
              fontSize: title.length > 40 ? 62 : 78,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
            }}
          >
            {title}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: 24, color: '#d2f5ee' }}>
            Free · No sign-up · Runs in your browser
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        // Content is a pure function of the query string, so it can be
        // cached forever.
        'cache-control': 'public, immutable, no-transform, max-age=31536000',
      },
    },
  );
}
