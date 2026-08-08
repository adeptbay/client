import Link from 'next/link';
import type { Metadata } from 'next';
import { pageMetadata } from '@core/seo';
import { site } from '@core/site';
import { PageShell } from '@ui/PageShell';

export const metadata: Metadata = pageMetadata({
  title: `Terms of Service — ${site.name}`,
  description: `The terms that apply when you use ${site.name}: what you may do, what you may not, and what we do and do not guarantee.`,
  path: '/terms',
  ogTitle: 'Terms of Service',
  ogKicker: 'LEGAL',
});

export default function TermsPage() {
  return (
    <PageShell
      title="Terms of Service"
      lead="Use the tools for anything lawful. Do not attack the service or use it to harm someone. We give no warranty."
      updated="2026-08-08"
    >
      <div className="rounded-xl border border-warn-line bg-warn-soft px-4 py-3 not-prose">
        <p className="text-[13px] leading-relaxed text-fg-muted">
          <strong className="text-fg">Before launch:</strong> have a lawyer in your jurisdiction
          review this. It is a plain-language starting point, not legal advice.
        </p>
      </div>

      <h2>1. Agreement</h2>
      <p>
        By using {site.domain} you agree to these terms. If you do not agree, do not use the site.
      </p>

      <h2>2. The service</h2>
      <p>
        {site.name} provides free online utilities. Most run entirely in your browser; a minority
        process data on our servers and are labelled as such. We may add, change or withdraw any tool
        at any time.
      </p>

      <h2>3. Acceptable use</h2>
      <p>You may use these tools for any lawful purpose, personal or commercial. You may not:</p>
      <ul>
        <li>Use them to process material you have no right to process.</li>
        <li>Upload malware, or files crafted to exploit or crash the processing pipeline.</li>
        <li>
          Attempt to bypass rate limits, or run automated traffic against the site outside the
          documented API.
        </li>
        <li>Resell or rebrand the service as your own without a written agreement.</li>
        <li>Use it to build a product whose purpose is to harm, defraud or impersonate someone.</li>
      </ul>
      <p>
        Where a limit exists it is published on the tool page. Sustained traffic that degrades the
        service for others may be blocked without notice.
      </p>

      <h2>4. Your content</h2>
      <p>
        You keep every right in whatever you process here. We claim no licence over it. For
        browser-side tools we never receive it at all; for server-side tools we hold it only as long
        as processing requires and delete it within two hours. See{' '}
        <Link href="/privacy">the privacy policy</Link>.
      </p>
      <p>
        You are responsible for having the right to process what you upload, and for complying with
        the law that applies to you.
      </p>

      <h2>5. No warranty</h2>
      <p>
        The tools are provided “as is”, without warranty of any kind. We work hard on correctness and
        we publish our method, but we do not guarantee that any output is accurate, complete or fit
        for your purpose.
      </p>
      <p>
        <strong>Check the output before you rely on it.</strong> This applies especially to anything
        involving money, law, health, security or a deadline you cannot miss. Verify results
        independently before acting on them.
      </p>

      <h2>6. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, {site.legalName} is not liable for any indirect,
        incidental, special or consequential loss arising from your use of this site — including lost
        profit, lost data or business interruption. Where liability cannot be excluded, it is limited
        to the greater of the amount you paid us in the preceding twelve months or USD 50.
      </p>
      <p>Nothing here excludes liability that cannot lawfully be excluded.</p>

      <h2>7. Availability</h2>
      <p>
        We aim for high availability but promise none. The site may be unavailable for maintenance,
        for reasons outside our control, or because something broke. There is no service level
        agreement on the free tier.
      </p>

      <h2>8. Intellectual property</h2>
      <p>
        The site design, brand, name, logo and source code are owned by {site.legalName}. Open-source
        components remain under their own licences. You may link to any page here freely.
      </p>

      <h2>9. Third-party rights and complaints</h2>
      <p>
        If you believe content accessible through this site infringes your rights, see{' '}
        <Link href="/dmca">the DMCA and complaints page</Link>.
      </p>

      <h2>10. Changes</h2>
      <p>
        We may update these terms. The date at the top reflects the last substantive change, and
        material changes are noted in <Link href="/changelog">the changelog</Link>. Continuing to use
        the site after a change means you accept it.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about these terms: <a href={`mailto:${site.contact.legal}`}>{site.contact.legal}</a>.
      </p>
    </PageShell>
  );
}
