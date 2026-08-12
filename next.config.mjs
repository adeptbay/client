/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Security headers. Applied site-wide.
 *
 * The CSP is intentionally strict: this platform runs user data in the
 * browser, so "your files never leave your device" has to be enforceable,
 * not just marketing. A tool page that could exfiltrate its own input
 * would make every privacy claim on the site false, and `connect-src` is
 * what makes that impossible rather than merely unintended.
 *
 * The policy is built from configuration instead of hard-coded, because
 * the previous fixed policy silently contradicted two features that ship
 * dark: the analytics beacon posts to NEXT_PUBLIC_ANALYTICS_URL, and
 * AdSense loads scripts from Google. Both were blocked by `'self'`, so
 * turning either flag on would have produced a feature that appears
 * enabled, reports no errors to the operator, and does nothing.
 */

/** Origin of a configured URL, or null. Keeps a stray path out of the CSP. */
function originOf(value) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    throw new Error(
      `Invalid URL in environment: ${value}\n` +
        'NEXT_PUBLIC_ANALYTICS_URL must be an absolute URL, e.g. https://analytics.example.com/api/send',
    );
  }
}

const analyticsOrigin = originOf(process.env.NEXT_PUBLIC_ANALYTICS_URL);

/**
 * Google's documented host set for AdSense. Only added once an AdSense
 * client id is configured, so the policy stays tight until the day the
 * account is actually approved (Part 8).
 */
const adsEnabled = Boolean(process.env.NEXT_PUBLIC_ADSENSE_CLIENT);
const adHosts = {
  script: [
    'https://pagead2.googlesyndication.com',
    'https://partner.googleadservices.com',
    'https://tpc.googlesyndication.com',
    'https://adservice.google.com',
    'https://www.googletagservices.com',
  ],
  frame: [
    'https://googleads.g.doubleclick.net',
    'https://tpc.googlesyndication.com',
    'https://www.google.com',
  ],
  img: [
    'https://pagead2.googlesyndication.com',
    'https://googleads.g.doubleclick.net',
    'https://tpc.googlesyndication.com',
    'https://www.google.com',
  ],
  connect: [
    'https://pagead2.googlesyndication.com',
    'https://googleads.g.doubleclick.net',
    'https://csi.gstatic.com',
  ],
};

const when = (condition, values) => (condition ? values : []);

const csp = [
  ["default-src", ["'self'"]],
  [
    'script-src',
    [
      "'self'",
      // Required by Next.js for its inline bootstrap and by the theme
      // script in <head>. The alternative is a per-request nonce, which
      // needs middleware and forces every page to render dynamically —
      // that would trade the entire static/ISR strategy for it.
      "'unsafe-inline'",
      // WASM-backed engines (image, PDF, media) need to compile modules.
      // 'wasm-unsafe-eval' grants exactly that and nothing else; full
      // 'unsafe-eval' is only needed by the dev server's source maps.
      isDev ? "'unsafe-eval'" : "'wasm-unsafe-eval'",
      ...when(adsEnabled, adHosts.script),
    ],
  ],
  ['style-src', ["'self'", "'unsafe-inline'"]],
  ['img-src', ["'self'", 'data:', 'blob:', ...when(adsEnabled, adHosts.img)]],
  ['font-src', ["'self'", 'data:']],
  [
    'connect-src',
    [
      "'self'",
      'blob:',
      'data:',
      ...when(Boolean(analyticsOrigin), [analyticsOrigin]),
      ...when(adsEnabled, adHosts.connect),
    ],
  ],
  ['worker-src', ["'self'", 'blob:']],
  // Ad iframes are the only third-party frames this site will ever load.
  ['frame-src', adsEnabled ? ["'self'", ...adHosts.frame] : ["'none'"]],
  ['frame-ancestors', ["'none'"]],
  ['base-uri', ["'self'"]],
  ['form-action', ["'self'"]],
  ['object-src', ["'none'"]],
  ['upgrade-insecure-requests', []],
]
  .map(([directive, values]) => (values.length > 0 ? `${directive} ${values.join(' ')}` : directive))
  .join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Tool URLs are permanent contracts (Part 3.2). Keep them canonical.
  trailingSlash: false,

  async headers() {
    // Static assets already get an immutable, one-year Cache-Control from
    // Next itself, and overriding it here breaks hot reload in dev.
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
