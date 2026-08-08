import Link from 'next/link';
import { flags } from '@core/flags';
import { BoltIcon } from './Icons';

/**
 * UpgradePrompt.
 *
 * Shown only when Premium is live AND the tool has a paid capability
 * worth naming. Part 10: a free-to-paid prompt on a tool with no paid
 * tier is noise that costs conversion everywhere else on the site.
 *
 * It never blocks the free path. The tool above it has already
 * finished the user's job by the time they read this.
 */
export function UpgradePrompt({
  headline,
  body,
  cta = 'See what Premium adds',
}: {
  headline: string;
  body: string;
  cta?: string;
}) {
  if (!flags.premium) return null;

  return (
    <aside className="flex items-start gap-3 rounded-xl border border-brand-line bg-brand-soft px-4 py-3.5">
      <BoltIcon size={18} className="mt-0.5 shrink-0 text-brand" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-fg">{headline}</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-fg-muted">{body}</p>
      </div>
      <Link
        href="/pricing"
        className="shrink-0 self-center rounded-lg bg-brand px-3 py-1.5 text-[13px] font-medium text-fg-onbrand
                   transition-colors hover:bg-brand-hover"
      >
        {cta}
      </Link>
    </aside>
  );
}
