import Link from 'next/link';
import type { Category } from '@core/categories';
import { site } from '@core/site';
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
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
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

          <nav aria-labelledby="footer-legal">
            <h2 id="footer-legal" className="text-[13px] font-semibold text-fg">
              Legal
            </h2>
            <ul className="mt-3 space-y-2">
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

        <div className="mt-10 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-fg-subtle">
            © {new Date().getFullYear()} {site.legalName}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a
              href={site.social.github}
              rel="noopener noreferrer"
              target="_blank"
              className="text-xs text-fg-subtle transition-colors hover:text-fg-muted"
            >
              GitHub
            </a>
            <a
              href={site.social.x}
              rel="noopener noreferrer"
              target="_blank"
              className="text-xs text-fg-subtle transition-colors hover:text-fg-muted"
            >
              X
            </a>
            <a
              href={`mailto:${site.contact.support}`}
              className="text-xs text-fg-subtle transition-colors hover:text-fg-muted"
            >
              {site.contact.support}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
