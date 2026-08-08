import Link from 'next/link';
import type { Metadata } from 'next';
import { pageMetadata } from '@core/seo';
import { site } from '@core/site';
import { flags } from '@core/flags';
import { PageShell } from '@ui/PageShell';

/**
 * Pricing.
 *
 * Part 10 puts the paid tier at roughly 20,000 monthly visitors, so
 * this page is a statement of intent rather than a checkout. It exists
 * now because "how will this be paid for" is a fair question to ask of
 * a free tool site, and refusing to answer it is its own answer.
 *
 * `noindex` while Premium is off: an indexed pricing page with no
 * product is a thin page, and Part 5.9 is explicit about pruning those.
 */

export const metadata: Metadata = pageMetadata({
  title: `Pricing — ${site.name}`,
  description: `Every tool on ${site.name} is free with no account. Here is what a paid tier would add, and what will always stay free.`,
  path: '/pricing',
  ogTitle: 'Pricing',
  ogKicker: 'PLANS',
  noindex: !flags.premium,
});

export default function PricingPage() {
  return (
    <PageShell
      title="Pricing"
      lead="Everything on this site is free right now, with no account and no quota. This page explains what would change and what would not."
      updated="2026-08-08"
    >
      {!flags.premium && (
        <div className="rounded-xl border border-brand-line bg-brand-soft px-4 py-3">
          <p className="text-[13px] leading-relaxed text-fg-muted">
            <strong className="text-fg">Not launched yet.</strong> There is nothing to buy. This page
            is here so the plan is visible before it happens rather than after.
          </p>
        </div>
      )}

      <h2>Free — and staying free</h2>
      <p>These do not move behind a paywall later:</p>
      <ul>
        <li>Every tool currently on the site, at full capability.</li>
        <li>No account, no daily quota, no file size cap beyond what your device can handle.</li>
        <li>No watermark on anything you produce.</li>
        <li>Every result downloadable, in full, without paying.</li>
      </ul>
      <p>
        Removing capability from the free tier to create a reason to upgrade is the standard playbook
        and we are not going to run it. The paid tier has to earn its price by adding something, not
        by taking something away.
      </p>

      <h2>What a paid tier would add</h2>
      <table>
        <thead>
          <tr>
            <th>Capability</th>
            <th>Why it is paid</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Batch processing — hundreds of files in one job</td>
            <td>Needs a server and a queue, which cost money per job</td>
          </tr>
          <tr>
            <td>Saved presets and templates across devices</td>
            <td>Needs an account and a database</td>
          </tr>
          <tr>
            <td>API access with a quota</td>
            <td>Programmatic use is a different cost profile from a person clicking a button</td>
          </tr>
          <tr>
            <td>AI-backed features</td>
            <td>Every call has a real per-token cost that does not go to zero at scale</td>
          </tr>
          <tr>
            <td>No advertising</td>
            <td>Once advertising exists, paying to remove it is a fair trade</td>
          </tr>
        </tbody>
      </table>

      <h2>When</h2>
      <p>
        Not before the site has enough traffic that a paid tier is worth building properly — the
        internal threshold is around 20,000 monthly visitors. Building billing, subscription state
        and dunning for the first fifty customers is a good way to do both badly.{' '}
        <Link href="/roadmap">The roadmap</Link> shows where that sits.
      </p>

      <h2>How advertising will work, if it happens</h2>
      <p>
        No advertisement above the tool. Every slot with its height reserved so nothing shifts under
        your cursor. A maximum of two display units per page. If those constraints stop being
        commercially viable, we will change the business model rather than the constraints.
      </p>

      <h2>Questions</h2>
      <p>
        Anything about pricing, invoicing or an enterprise arrangement:{' '}
        <a href={`mailto:${site.contact.support}`}>{site.contact.support}</a>.
      </p>
    </PageShell>
  );
}
