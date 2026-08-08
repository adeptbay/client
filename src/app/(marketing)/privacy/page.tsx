import Link from 'next/link';
import type { Metadata } from 'next';
import { pageMetadata } from '@core/seo';
import { site } from '@core/site';
import { PageShell } from '@ui/PageShell';

export const metadata: Metadata = pageMetadata({
  title: `Privacy Policy — ${site.name}`,
  description: `What data ${site.name} collects, what it does not, and why most tools here have no way to see your files at all.`,
  path: '/privacy',
  ogTitle: 'Privacy Policy',
  ogKicker: 'LEGAL',
});

export default function PrivacyPage() {
  return (
    <PageShell
      title="Privacy Policy"
      lead="The short version: tools marked “runs in your browser” never send us your data, because there is no server involved."
      updated="2026-08-08"
    >
      <div className="rounded-xl border border-warn-line bg-warn-soft px-4 py-3 not-prose">
        <p className="text-[13px] leading-relaxed text-fg-muted">
          <strong className="text-fg">Before launch:</strong> have this reviewed by a lawyer in your
          jurisdiction before publishing. It is written to be accurate about how this software
          actually behaves, which is a necessary condition for a privacy policy and not a sufficient
          one.
        </p>
      </div>

      <h2>1. Who we are</h2>
      <p>
        {site.legalName} operates {site.domain}. For any privacy question, write to{' '}
        <a href={`mailto:${site.contact.privacy}`}>{site.contact.privacy}</a>.
      </p>

      <h2>2. The part that matters most</h2>
      <p>
        Most tools on this site are marked <strong>“Runs in your browser”</strong>. For those tools,
        the text or file you provide is processed by JavaScript and WebAssembly executing on your own
        device. It is never transmitted to us. We do not receive it, cannot see it, cannot store it
        and cannot be compelled to hand it over, because no copy ever leaves your computer.
      </p>
      <p>
        You do not have to take our word for it: open a tool page, disconnect from the internet, and
        use the tool. It will still work.
      </p>
      <p>
        A minority of tools need server-side processing — heavy video transcoding, for example. Those
        are labelled on the page. For them, section 5 applies.
      </p>

      <h2>3. What we collect</h2>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Why</th>
            <th>Kept for</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Page views (URL, referrer type, country, mobile or desktop)</td>
            <td>To know which tools are used and which are broken</td>
            <td>Aggregated; no individual record</td>
          </tr>
          <tr>
            <td>Tool run events (which tool, duration, input size in bytes, success or failure)</td>
            <td>To find tools that are failing or slow</td>
            <td>90 days, then aggregated</td>
          </tr>
          <tr>
            <td>Server logs for server-side tools (timestamp, status, hashed IP)</td>
            <td>Abuse prevention and rate limiting</td>
            <td>30 days</td>
          </tr>
          <tr>
            <td>Email address, if you subscribe or write to us</td>
            <td>To send what you asked for, or to reply</td>
            <td>Until you unsubscribe or ask us to delete it</td>
          </tr>
        </tbody>
      </table>

      <h2>4. What we never collect</h2>
      <ul>
        <li>
          <strong>The contents of anything you process.</strong> Not the text, not the file, not the
          output. Only its size in bytes and its type.
        </li>
        <li>
          <strong>Cross-site tracking identifiers.</strong> No advertising cookie, no fingerprint, no
          third-party pixel.
        </li>
        <li>
          <strong>An account you did not create.</strong> The free tools require no account and set
          no identifier.
        </li>
        <li>
          <strong>Raw IP addresses in analytics.</strong> Where an IP is needed for rate limiting it
          is hashed and discarded within 30 days.
        </li>
      </ul>

      <h2>5. Server-side tools</h2>
      <p>For the tools that are labelled as needing a server:</p>
      <ul>
        <li>Your file is uploaded directly to object storage using a link valid for 15 minutes.</li>
        <li>It is processed, the result is stored, and both are deleted automatically within two hours by a storage lifecycle rule — not by a script that might fail to run.</li>
        <li>File contents are never written to a log. Size, type and duration are.</li>
        <li>We do not open, inspect or scan your file beyond validating that its format is what it claims to be.</li>
      </ul>

      <h2>6. Cookies</h2>
      <p>
        This site sets no cookies for the free tools. Your theme preference is stored in{' '}
        <code>localStorage</code> on your own device and is never transmitted. If advertising or
        accounts are introduced later, this page will be updated before they go live and a consent
        notice will appear where the law requires one. See <Link href="/cookies">the cookie page</Link>{' '}
        for the current state.
      </p>

      <h2>7. Third parties</h2>
      <p>
        Our hosting provider processes requests in order to serve the site and keeps its own short
        access logs. If and when analytics, error reporting, email or advertising are enabled, each
        provider will be named here before it is switched on, not after.
      </p>

      <h2>8. Your rights</h2>
      <p>
        Depending on where you live — in particular under the GDPR or the CCPA — you may have the
        right to access, correct, export or delete the personal data we hold, and to object to
        processing. Write to{' '}
        <a href={`mailto:${site.contact.privacy}`}>{site.contact.privacy}</a> and we will respond
        within 30 days.
      </p>
      <p>
        In practice, for anyone who has only used the free tools, we hold no personal data about you
        to give, correct or delete. That is the intended design.
      </p>

      <h2>9. Children</h2>
      <p>
        This site is not directed at children under 13 and we do not knowingly collect their personal
        data. If you believe we have, write to us and it will be deleted.
      </p>

      <h2>10. Changes</h2>
      <p>
        The date at the top of this page is the last substantive change. Material changes will be
        summarised in <Link href="/changelog">the changelog</Link> so you can see what changed rather
        than having to re-read the whole document.
      </p>
    </PageShell>
  );
}
