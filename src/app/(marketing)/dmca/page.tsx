import Link from 'next/link';
import type { Metadata } from 'next';
import { pageMetadata } from '@core/seo';
import { site } from '@core/site';
import { PageShell } from '@ui/PageShell';

export const metadata: Metadata = pageMetadata({
  title: `DMCA & Complaints — ${site.name}`,
  description: `How to report copyright infringement or abuse relating to ${site.name}, and why we host almost nothing that could be infringing.`,
  path: '/dmca',
  ogTitle: 'DMCA & Complaints',
  ogKicker: 'LEGAL',
});

export default function DmcaPage() {
  return (
    <PageShell
      title="DMCA & Complaints"
      lead="We host almost no user content. Here is how to report something anyway, and what we can actually do about it."
      updated="2026-08-08"
    >
      <h2>What we host</h2>
      <p>
        Nearly every tool on this site runs in your browser and never transmits your file to us.
        There is no user upload area, no public gallery, no hosted library, and nothing a visitor can
        publish. For those tools there is nothing on our servers that could infringe anyone’s rights.
      </p>
      <p>
        The minority of tools that process on a server hold your file only for the duration of the
        job and delete it automatically within two hours. It is never made public and is not
        addressable by anyone but you.
      </p>

      <h2>Reporting copyright infringement</h2>
      <p>
        If you believe material on {site.domain} infringes your copyright, send a notice to{' '}
        <a href={`mailto:${site.contact.legal}`}>{site.contact.legal}</a> including:
      </p>
      <ol>
        <li>Your name, address, telephone number and email address.</li>
        <li>Identification of the work you say is infringed.</li>
        <li>The exact URL of the material you are asking us to remove.</li>
        <li>
          A statement that you believe in good faith the use is not authorised by the owner, its
          agent, or the law.
        </li>
        <li>
          A statement, under penalty of perjury, that the information is accurate and you are the
          owner or authorised to act for the owner.
        </li>
        <li>Your physical or electronic signature.</li>
      </ol>
      <p>
        Complete notices are acted on within five business days. Incomplete ones are answered with a
        request for what is missing.
      </p>

      <h2>Counter-notice</h2>
      <p>
        If material of yours was removed and you believe that was a mistake or a misidentification,
        send a counter-notice to the same address with your contact details, identification of the
        material and where it appeared, and a statement under penalty of perjury that you believe in
        good faith it was removed in error.
      </p>

      <h2>Reporting abuse of a tool</h2>
      <p>
        If you believe a tool here is being used to cause harm, tell us at{' '}
        <a href={`mailto:${site.contact.support}`}>{site.contact.support}</a> with as much specific
        detail as you can. We also keep a standing list of categories we will not build at all —{' '}
        <Link href="/about">see the About page</Link> — and if you think something here belongs on
        that list, that is a report worth sending.
      </p>

      <h2>Bad-faith notices</h2>
      <p>
        Knowingly misrepresenting that material is infringing carries liability for damages under
        section 512(f) of the DMCA. We keep a record of every notice received.
      </p>
    </PageShell>
  );
}
