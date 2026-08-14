import Link from 'next/link';
import type { Category } from '@core/categories';
import { site } from '@core/site';
import { GitHubIcon, XIcon } from './Icons';
import { Logo } from './Logo';

/**
 * Footer.
 *
 * Part 5.5 — "footer links to every category hub" is a site-wide crawl
 * path. It is the cheapest way to guarantee no division is ever more
 * than two clicks from any page, which is what keeps orphan pages at
 * zero as the registry grows.
 */

const COMPANY = [
  { href: '/about', label: 'About' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/roadmap', label: 'Roadmap' },
  { href: '/changelog', label: 'Changelog' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact' },
];

const LEGAL = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/cookies', label: 'Cookies' },
  { href: '/accessibility', label: 'Accessibility' },
  { href: '/dmca', label: 'DMCA' },
];

export function SiteFooter({ categories, toolCount }: { categories: Category[]; toolCount: number }) {
  return (
    <footer className="mt-20 border-t border-line bg-sunken">
      <div className="mx-auto max-w-6xl px-4 pb-6 pt-12 sm:px-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="col-span-2 sm:col-span-1">
            <Logo />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-fg-muted">{site.tagline}. {toolCount} live, and counting.</p>
            <p className="mt-4 text-xs leading-relaxed text-fg-subtle">
              Most tools here run entirely in your browser. Your files are not uploaded, not queued and
              not stored.
            </p>
          </div>

          <nav aria-labelledby="footer-tools">
            <h2 id="footer-tools" className="text-[13px] font-semibold text-fg">
              Tools
            </h2>
            <ul className="mt-3 space-y-2">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/${c.slug}`} className="text-sm text-fg-muted transition-colors hover:text-brand-text">
                    {c.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/all-tools" className="text-sm font-medium text-brand-text hover:underline">
                  All tools →
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-labelledby="footer-company">
            <h2 id="footer-company" className="text-[13px] font-semibold text-fg">
              Company
            </h2>
            <ul className="mt-3 space-y-2">
              {COMPANY.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-fg-muted transition-colors hover:text-brand-text">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-legal" className="col-span-2 sm:col-span-1">
            <h2 id="footer-legal" className="text-[13px] font-semibold text-fg">
              Legal
            </h2>
            <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-1">
              {LEGAL.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-fg-muted transition-colors hover:text-brand-text">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-fg-subtle">
            © {new Date().getFullYear()} {site.legalName}. All rights reserved.
          </p>
          <div className="-ml-2 flex items-center gap-1 sm:-mr-2 sm:ml-0">
            <a
              href={`mailto:${site.contact.support}`}
              className="-my-2 p-2 text-xs text-fg-subtle transition-colors hover:text-fg-muted"
            >
              {site.contact.support}
            </a>
            <a
              href={site.social.github}
              rel="noopener noreferrer"
              target="_blank"
              aria-label={`${site.name} on GitHub`}
              className="-my-2 p-2 text-fg-subtle transition-colors hover:text-fg-muted"
            >
              <GitHubIcon size={18} />
            </a>
            <a
              href={site.social.x}
              rel="noopener noreferrer"
              target="_blank"
              aria-label={`${site.name} on X`}
              className="-my-2 p-2 text-fg-subtle transition-colors hover:text-fg-muted"
            >
              <XIcon size={15} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
