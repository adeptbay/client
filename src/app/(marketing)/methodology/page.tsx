import Link from 'next/link';
import type { Metadata } from 'next';
import { pageMetadata } from '@core/seo';
import { site } from '@core/site';
import { PageShell } from '@ui/PageShell';

/**
 * Part 5.10, tactic 6 — "keep an About / Methodology page: who you are,
 * where the data comes from".
 *
 * This is one of the highest-leverage pages on the site and one of the
 * least obvious. Retrieval-based engines weight sources that state
 * their method, and a page like this is what separates a citable source
 * from an anonymous tool farm.
 */

export const metadata: Metadata = pageMetadata({
  title: `Methodology — how ${site.name} builds and tests tools`,
  description: `How we decide which tools to build, how benchmarks are measured, where the numbers come from, and how mistakes get corrected.`,
  path: '/methodology',
  ogTitle: 'Methodology',
  ogKicker: 'HOW WE WORK',
});

export default function MethodologyPage() {
  return (
    <PageShell
      title="Methodology"
      lead="How tools get chosen, how they get built, where the numbers come from, and what happens when we are wrong."
      updated="2026-08-08"
    >
      <h2>How we decide what to build</h2>
      <p>
        Every candidate tool is scored out of 50 before any code is written, across five equally
        weighted factors. The score is shown next to each tool on{' '}
        <Link href="/all-tools">the index page</Link>, so the reasoning is public.
      </p>
      <table>
        <thead>
          <tr>
            <th>Factor</th>
            <th>Out of</th>
            <th>What a 10 means</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Search demand</td>
            <td>10</td>
            <td>Over 100,000 monthly searches for the primary query</td>
          </tr>
          <tr>
            <td>Evergreen</td>
            <td>10</td>
            <td>Would have been useful in 2010 and will be in 2035</td>
          </tr>
          <tr>
            <td>Search opportunity</td>
            <td>10</td>
            <td>The current top five results are slow, ad-heavy or thin</td>
          </tr>
          <tr>
            <td>Business value</td>
            <td>10</td>
            <td>A clear path to a paid tier or an API</td>
          </tr>
          <tr>
            <td>Build cost</td>
            <td>10</td>
            <td>Two hours, entirely client-side</td>
          </tr>
        </tbody>
      </table>
      <p>
        Forty and above gets built this quarter. Thirty to thirty-nine goes to the backlog. Twenty to
        twenty-nine is built only if it completes a cluster that already exists. Below twenty is not
        built at all, however entertaining it would be.
      </p>

      <h2>What has to be true before a tool ships</h2>
      <ul>
        <li>It loads and becomes usable in under 1.5 seconds on a mid-range phone.</li>
        <li>It works on a 360-pixel-wide screen, tested by hand, not by resizing a desktop window.</li>
        <li>
          It is better than the current top result at something specific and nameable — not “nicer”,
          but a stated capability the competitor lacks.
        </li>
        <li>It reaches the whole way through a real task without an account or a payment.</li>
        <li>Its limits are documented on the page before anyone hits them.</li>
      </ul>
      <p>
        A tool that fails any of these does not ship. That is why the count grows slowly. Publishing
        five thousand pages in a week is possible and it is the fastest known route to a manual
        penalty.
      </p>

      <h2>How benchmarks are measured</h2>
      <p>
        Any timing shown in a technical notes section was measured, not estimated. Unless a figure
        says otherwise, the method is:
      </p>
      <ul>
        <li>
          <strong>Hardware:</strong> Apple M2 MacBook Air, 16 GB, on mains power, Chrome 141, no
          extensions, a fresh profile.
        </li>
        <li>
          <strong>Procedure:</strong> ten runs, first two discarded to allow for JIT warm-up, median
          of the remaining eight reported.
        </li>
        <li>
          <strong>Inputs:</strong> generated to a stated size and shape, described alongside the
          number.
        </li>
      </ul>
      <p>
        Your machine will differ, sometimes by a factor of five. The figures are there to show the
        order of magnitude and to be reproducible, not to promise you a specific millisecond count.
      </p>

      <h2>Where external numbers come from</h2>
      <p>
        Where a page cites a figure that is not ours — a reading speed, a cryptographic guess rate, a
        standards document — the source is named inline. Standards are cited by RFC or specification
        number so you can check them directly. We do not cite “studies show” without saying which
        study.
      </p>

      <h2>How the AI features work</h2>
      <p>
        Almost nothing here uses a language model. Formatting, hashing, counting and converting are
        deterministic problems with correct answers, and a model would make them slower, more
        expensive and occasionally wrong.
      </p>
      <p>
        Where a model is genuinely better — rewriting, summarising, classifying — the output is
        labelled as AI-generated on the page, and the deterministic path is never removed. You will
        never be forced through a model to finish a job a function could do.
      </p>

      <h2>Corrections</h2>
      <p>
        If a tool gives a wrong answer, that is the most serious kind of bug this site can have.
        Report it to <a href={`mailto:${site.contact.support}`}>{site.contact.support}</a> with the
        input you used. Confirmed correctness bugs are fixed before anything else, and the fix is
        recorded in <Link href="/changelog">the changelog</Link> with the date and what was wrong.
      </p>
      <p>
        Pages that carry a benchmark also carry a “last verified” month. Those are re-run quarterly.
        If a page says it was verified more than six months ago, treat the number with suspicion and
        tell us.
      </p>

      <h2>What we do not do</h2>
      <ul>
        <li>
          We do not publish review scores, star ratings or “best of” rankings we did not measure.
        </li>
        <li>
          We do not add structured data claiming ratings or reviews that do not exist. Every
          rich-result claim on this site corresponds to something visible on the page.
        </li>
        <li>We do not buy links, exchange links, or place paid content without labelling it.</li>
        <li>
          We do not generate pages for keyword combinations with no real search demand, even though
          the tooling to do so exists in this codebase.
        </li>
      </ul>
    </PageShell>
  );
}
