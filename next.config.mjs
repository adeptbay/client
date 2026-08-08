/** @type {import('next').NextConfig} */

// Security headers. Applied site-wide.
// The CSP is intentionally strict: this platform runs user data in the browser,
// so "your files never leave your device" has to be enforceable, not just marketing.
const csp = [
  "default-src 'self'",
  // 'unsafe-inline' is required by Next.js for its inline bootstrap script.
  // 'unsafe-eval' is required by WASM-backed engines (image/pdf/media) in dev + prod.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join('; ');

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
