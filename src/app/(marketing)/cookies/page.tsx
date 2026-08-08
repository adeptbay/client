import Link from 'next/link';
import type { Metadata } from 'next';
import { pageMetadata } from '@core/seo';
import { site } from '@core/site';
import { PageShell } from '@ui/PageShell';

export const metadata: Metadata = pageMetadata({
  title: `Cookies — ${site.name} sets none`,
  description: `${site.name} currently sets no cookies at all. Here is what is stored on your device instead, and what would change if advertising is introduced.`,
  path: '/cookies',
  ogTitle: 'Cookies',
  ogKicker: 'LEGAL',
});

export default function CookiesPage() {
  return (
    <PageShell
      title="Cookies"
      lead="This site currently sets no cookies. Not strictly necessary ones, not analytics ones, not advertising ones."
      updated="2026-08-08"
    >
      <h2>Current state</h2>
      <p>
        There is nothing to consent to, because nothing is being set. No session cookie, no analytics
        cookie, no advertising identifier, no third-party script that would set one on our behalf.
      </p>

      <h2>What is stored on your device</h2>
      <table>
        <thead>
          <tr>
            <th>Key</th>
            <th>Where</th>
            <th>Purpose</th>
            <th>Sent to us?</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>adeptbay-theme</code>
            </td>
            <td>localStorage</td>
            <td>Remembers light or dark mode</td>
            <td>No</td>
          </tr>
        </tbody>
      </table>
      <p>
        <code>localStorage</code> is not a cookie: it is never attached to a network request, so this
        value never reaches our servers or anyone else’s. Clearing your browser’s site data removes
        it and the site falls back to your operating system preference.
      </p>

      <h2>Tool settings in the URL</h2>
      <p>
        When you change an option on a tool, it is written into the address bar rather than into
        storage. That is what makes a configured tool a shareable link. It lives in your browser
        history like any other URL and is not tracked.
      </p>

      <h2>What would change</h2>
      <p>
        If advertising is introduced, ad networks set their own cookies and we would have no honest
        way to describe this site as cookie-free. Before that happens:
      </p>
      <ul>
        <li>This page is updated with every cookie, its purpose and its lifetime.</li>
        <li>A consent banner appears where the law requires one, with a real reject option.</li>
        <li>The change is recorded in <Link href="/changelog">the changelog</Link>.</li>
      </ul>
      <p>
        We would rather tell you before than apologise after. See{' '}
        <Link href="/privacy">the privacy policy</Link> for what is collected today.
      </p>
    </PageShell>
  );
}
