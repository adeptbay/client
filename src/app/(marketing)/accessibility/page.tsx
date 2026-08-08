import type { Metadata } from 'next';
import { pageMetadata } from '@core/seo';
import { site } from '@core/site';
import { PageShell } from '@ui/PageShell';

export const metadata: Metadata = pageMetadata({
  title: `Accessibility Statement — ${site.name}`,
  description: `What ${site.name} commits to on accessibility, what is already true, what is not yet, and how to report a barrier.`,
  path: '/accessibility',
  ogTitle: 'Accessibility',
  ogKicker: 'COMMITMENT',
});

export default function AccessibilityPage() {
  return (
    <PageShell
      title="Accessibility Statement"
      lead="Target: WCAG 2.2 Level AA. Here is what is already true, what is not yet, and how to tell us when we get it wrong."
      updated="2026-08-08"
    >
      <h2>What is already true</h2>
      <ul>
        <li>
          <strong>Colour contrast.</strong> Body text meets 4.5:1 and interactive elements meet 3:1
          against their background, in both light and dark themes. The palette was chosen against
          those thresholds rather than checked afterwards.
        </li>
        <li>
          <strong>Keyboard.</strong> Every tool can be completed without a mouse. Tab order follows
          the visual order, and there is a “skip to content” link before the navigation.
        </li>
        <li>
          <strong>Focus.</strong> A visible focus ring appears for keyboard users on every
          interactive element, and is suppressed for pointer users so it never looks like a bug.
        </li>
        <li>
          <strong>Colour is never the only signal.</strong> The diff viewer marks additions and
          removals with symbols as well as colour, because roughly one in twelve men has a red-green
          colour vision deficiency.
        </li>
        <li>
          <strong>Labels.</strong> Every input has a real associated label. Icon-only buttons carry
          an accessible name. Nothing depends on a placeholder as its label.
        </li>
        <li>
          <strong>Motion.</strong> <code>prefers-reduced-motion</code> disables transitions and smooth
          scrolling site-wide.
        </li>
        <li>
          <strong>Announcements.</strong> Errors and confirmations use live regions, so a screen
          reader user hears “Copied” without focus being moved.
        </li>
        <li>
          <strong>Zoom.</strong> The layout works at 200% zoom and at 320 CSS pixels wide without
          horizontal scrolling.
        </li>
        <li>
          <strong>Structure.</strong> One <code>h1</code> per page and a heading order with no skipped
          levels, so heading navigation works.
        </li>
      </ul>

      <h2>What is not yet true</h2>
      <p>Stating this is more useful than claiming full conformance:</p>
      <ul>
        <li>
          The diff viewer is a data table with many rows. It is navigable, but not yet as pleasant to
          traverse with a screen reader as it should be.
        </li>
        <li>
          Drag-and-drop file zones have a keyboard-accessible browse button, but reordering a file
          list uses buttons rather than a proper drag-and-drop accessible pattern.
        </li>
        <li>
          Testing so far is automated plus manual keyboard passes. Full screen-reader testing across
          NVDA, JAWS and VoiceOver has not been completed.
        </li>
      </ul>

      <h2>Reporting a barrier</h2>
      <p>
        If something here blocked you, please tell us at{' '}
        <a href={`mailto:${site.contact.support}`}>{site.contact.support}</a>. Include the page, what
        you were trying to do, and your browser and assistive technology if you know them.
      </p>
      <p>
        Accessibility bugs are treated as correctness bugs, not enhancements: they go to the front of
        the queue with the ones where a tool returns a wrong answer.
      </p>
    </PageShell>
  );
}
