import Link from 'next/link';
import type { Metadata } from 'next';
import { pageMetadata } from '@core/seo';
import { site } from '@core/site';
import { totalLive } from '@core/registry';
import { PageShell } from '@ui/PageShell';

export const metadata: Metadata = pageMetadata({
  title: `About ${site.name} — who builds these tools and why`,
  description: `${site.name} is a growing platform of fast, private online tools. Here is who is behind it, how it is funded, and what we will not build.`,
  path: '/about',
  ogTitle: `About ${site.name}`,
  ogKicker: 'ABOUT',
});

export default function AboutPage() {
  return (
    <PageShell
      title={`About ${site.name}`}
      lead="A platform of small, fast, private utilities — built one at a time, in the open."
      updated="2026-08-08"
    >
      <h2>What this is</h2>
      <p>
        {site.name} is a collection of everyday online tools: {totalLive()} of them today, on the way
        to a thousand. Word counters, formatters, converters, generators, calculators. The kind of
        thing you need for ninety seconds and then forget about until next Tuesday.
      </p>
      <p>
        The category is not short of options. What it is short of is options that do not waste your
        time — sites that load fast, work on a phone, do not demand an email address before showing
        you a result, and do not upload your file to a server when they had no need to.
      </p>

      <h2>The principles</h2>
      <p>
        <strong>Do the work on your device.</strong> Most of what these tools do — formatting,
        hashing, counting, converting, compressing — can happen in your browser. When it can, it
        does. That is faster, it costs us nothing to run, and it means there is no copy of your file
        on our disk. Tools that genuinely need a server say so on the page.
      </p>
      <p>
        <strong>No account, ever, for the free tools.</strong> No sign-up wall, no daily quota, no
        watermark, no “upgrade to download”. If a tool is listed as free it is usable to completion
        without giving us anything.
      </p>
      <p>
        <strong>Say what the tool cannot do.</strong> Every tool page has a technical notes section
        listing its limits and failure modes. Finding out that a tool does not handle your case
        should take five seconds on the page, not five minutes of trying.
      </p>
      <p>
        <strong>Numbers, not adjectives.</strong> “Fast” means nothing. Where we make a performance
        claim there is a measurement next to it, with the hardware it was measured on.
      </p>

      <h2>What we will not build</h2>
      <p>
        A list is easier to keep than a principle. We do not build media downloaders that violate a
        platform’s terms, DRM circumvention, fake document generators, “free followers” tools,
        scrapers for email addresses or phone numbers, AI-detection tools that claim an accuracy they
        cannot have, or medical dosage calculators. Some of those would bring real traffic. All of
        them would either harm someone or make the business unsellable.
      </p>

      <h2>How it pays for itself</h2>
      <p>
        Eventually: display advertising that stays below the tool rather than on top of it, an
        optional paid tier for people who need batch processing and saved settings, and a developer
        API. Today: nothing. There are no ads on this site yet, and the code that would place them
        refuses to render until a flag is turned on.
      </p>
      <p>
        We would rather be clear about the plan than pretend the tools are free out of altruism. What
        we will not do is make the free version worse in order to sell the paid one.
      </p>

      <h2>Who is behind it</h2>
      <p>
        {site.name} is an independent project, currently built by one person. It is not
        venture-funded and it is not a side effect of a bigger product. If a tool is wrong, there is
        one person to tell, and they will fix it.
      </p>
      <p>
        The engineering standards, the scoring model used to decide what gets built, and the sources
        behind the benchmarks are all documented on{' '}
        <Link href="/methodology">the methodology page</Link>. What is coming next is on{' '}
        <Link href="/roadmap">the roadmap</Link>, and what has already shipped is in{' '}
        <Link href="/changelog">the changelog</Link>.
      </p>

      <h2>Get in touch</h2>
      <p>
        Bug reports, tool requests and corrections: <a href={`mailto:${site.contact.support}`}>{site.contact.support}</a>.
        Corrections are the most useful thing you can send. See <Link href="/contact">the contact page</Link>{' '}
        for what to include.
      </p>
    </PageShell>
  );
}
