import type { Metadata } from 'next';
import { pageMetadata } from '@core/seo';
import { site } from '@core/site';
import { PageShell } from '@ui/PageShell';

export const metadata: Metadata = pageMetadata({
  title: `Contact — ${site.name}`,
  description: `How to report a bug, request a tool or send a correction to ${site.name}, and what to include so it can be fixed quickly.`,
  path: '/contact',
  ogTitle: 'Contact',
  ogKicker: 'GET IN TOUCH',
});

export default function ContactPage() {
  return (
    <PageShell
      title="Contact"
      lead="One person reads all of this. Short and specific gets a faster answer than long and polite."
      updated="2026-08-08"
    >
      <h2>Where to write</h2>
      <table>
        <thead>
          <tr>
            <th>Subject</th>
            <th>Address</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Bugs, tool requests, corrections</td>
            <td>
              <a href={`mailto:${site.contact.support}`}>{site.contact.support}</a>
            </td>
          </tr>
          <tr>
            <td>Privacy and data requests</td>
            <td>
              <a href={`mailto:${site.contact.privacy}`}>{site.contact.privacy}</a>
            </td>
          </tr>
          <tr>
            <td>Legal, copyright, partnerships</td>
            <td>
              <a href={`mailto:${site.contact.legal}`}>{site.contact.legal}</a>
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Reporting a wrong result</h2>
      <p>
        This is the most valuable thing you can send, and it is also the easiest to send in an
        unusable form. Please include:
      </p>
      <ul>
        <li>The tool URL, including the options in the query string.</li>
        <li>The input, or the smallest input that still reproduces it.</li>
        <li>What you got, and what you expected instead.</li>
        <li>Your browser and operating system.</li>
      </ul>
      <p>
        A wrong answer is treated as the most serious class of bug on this site. It goes ahead of
        everything else, and the fix is recorded in the changelog with what was wrong and for how
        long.
      </p>

      <h2>Requesting a tool</h2>
      <p>
        Useful requests describe the task, not the tool. “I need to turn a column of email addresses
        into a comma-separated list” tells us more than “add a text joiner”, because it often turns
        out an existing tool already does it — or should.
      </p>
      <p>
        Every request is scored against the same 50-point model as everything else, so a request is
        not a promise. If it scores well it goes into the queue and you will hear when it ships.
      </p>

      <h2>Response times</h2>
      <p>
        Correctness bugs: same or next day. Everything else: within a week. Privacy and data requests
        within 30 days, as the law requires — usually much sooner, since for anyone who has only used
        the free tools there is no data to look up.
      </p>
    </PageShell>
  );
}
