/**
 * Part 5.7 — structured data, generated from the registry.
 *
 * Seven types, all JSON-LD, none hand-written:
 *   SoftwareApplication · FAQPage · HowTo · BreadcrumbList
 *   Organization + WebSite · Article · ItemList
 *
 * An honest note on rich results: Google narrowed FAQPage and HowTo
 * rich snippets in 2023, so these are not a snippet play any more. They
 * are kept because they still do the job that matters here — giving an
 * LLM a clean, machine-readable question→answer and step structure to
 * cite (Part 5.10). Structured, dated, verifiable facts are exactly what
 * retrieval-based engines prefer.
 */

import { absoluteUrl, site } from './site';
import type { Category } from './categories';
import type { AnyTool } from './registry';

type Json = Record<string, unknown>;

/**
 * Serialise for injection into a <script type="application/ld+json">.
 *
 * The `<` escape is not optional. This output goes through
 * `dangerouslySetInnerHTML`, and a bare `</script>` anywhere inside a
 * tool's FAQ, tagline or InfoGain table would close the tag early and
 * spill the rest of the JSON into the document as markup. `<` is
 * valid JSON, parses back to the same string, and makes the sequence
 * unconstructible. `&` and `>` are escaped on the same principle.
 */
export const jsonLd = (data: Json | Json[]): string =>
  JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

/* ── Brand entity. Homepage only. Part 5.10 — AI engines cite sources
      with an established identity, so this is the entity anchor.      */

export function organizationSchema(): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': absoluteUrl('/#organization'),
    name: site.name,
    legalName: site.legalName,
    url: absoluteUrl('/'),
    logo: absoluteUrl('/logo.svg'),
    description: site.description,
    slogan: site.tagline,
    sameAs: [site.social.github, site.social.x],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: site.contact.support,
        availableLanguage: ['English'],
      },
    ],
  };
}

export function websiteSchema(): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': absoluteUrl('/#website'),
    url: absoluteUrl('/'),
    name: site.name,
    description: site.description,
    publisher: { '@id': absoluteUrl('/#organization') },
    inLanguage: 'en',
    /**
     * No `potentialAction` / SearchAction.
     *
     * Two independent reasons. Google retired the sitelinks search box
     * rich result in November 2024, so the markup no longer produces
     * anything. And the target it declared — /all-tools?q={term} — was
     * never implemented: /all-tools reads no search params, and
     * robots.txt disallows parameterised URLs. Schema that describes a
     * capability the site does not have is a correctness problem
     * regardless of whether anything currently reads it.
     *
     * Site search is the ⌘K palette, which is a client-side index and
     * has no crawlable results URL to point at.
     */
  };
}

/* ── Tool page ─────────────────────────────────────────────────────── */

export function softwareApplicationSchema(tool: AnyTool): Json {
  const url = absoluteUrl(`/${tool.category}/${tool.slug}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${url}#app`,
    name: tool.name,
    url,
    description: tool.description,
    applicationCategory: 'UtilitiesApplication',
    applicationSubCategory: tool.cluster,
    operatingSystem: 'Any — runs in a web browser',
    browserRequirements: 'Requires JavaScript. Works in Chrome, Firefox, Safari and Edge.',
    softwareVersion: '1.0',
    datePublished: tool.added,
    dateModified: tool.updated,
    isAccessibleForFree: !tool.premium,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    featureList: tool.infoGain.supports ?? tool.keywords,
    publisher: { '@id': absoluteUrl('/#organization') },
    // No aggregateRating: we do not have real reviews, and inventing them
    // is both a policy violation and the fastest way to lose trust.
  };
}

export function faqSchema(tool: AnyTool): Json | null {
  if (tool.faq.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${absoluteUrl(`/${tool.category}/${tool.slug}`)}#faq`,
    mainEntity: tool.faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function howToSchema(tool: AnyTool): Json | null {
  if (tool.howTo.length === 0) return null;
  const url = absoluteUrl(`/${tool.category}/${tool.slug}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    '@id': `${url}#howto`,
    name: `How to use ${tool.name}`,
    description: tool.tagline,
    totalTime: 'PT1M',
    estimatedCost: { '@type': 'MonetaryAmount', currency: 'USD', value: '0' },
    step: tool.howTo.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.title,
      text: s.detail,
      url: `${url}#step-${i + 1}`,
    })),
  };
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbSchema(crumbs: Crumb[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

/* ── Category hub ──────────────────────────────────────────────────── */

export function itemListSchema(category: Category, tools: AnyTool[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${absoluteUrl(`/${category.slug}`)}#tools`,
    name: category.title,
    description: category.description,
    numberOfItems: tools.length,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: tools.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      description: t.tagline,
      url: absoluteUrl(`/${t.category}/${t.slug}`),
    })),
  };
}

/* ── Supporting article ────────────────────────────────────────────── */

export function articleSchema(input: {
  headline: string;
  description: string;
  path: string;
  published: string;
  modified: string;
}): Json {
  const url = absoluteUrl(input.path);
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: input.headline,
    description: input.description,
    url,
    datePublished: input.published,
    dateModified: input.modified,
    inLanguage: 'en',
    author: { '@id': absoluteUrl('/#organization') },
    publisher: { '@id': absoluteUrl('/#organization') },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  };
}

/**
 * Everything a tool page needs, in one array. Emitted as a single
 * <script type="application/ld+json"> so the page carries one node.
 */
export function toolPageSchema(tool: AnyTool, categoryName: string): Json[] {
  const out: Json[] = [
    softwareApplicationSchema(tool),
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: categoryName, path: `/${tool.category}` },
      { name: tool.name, path: `/${tool.category}/${tool.slug}` },
    ]),
  ];
  const faq = faqSchema(tool);
  if (faq) out.push(faq);
  const howTo = howToSchema(tool);
  if (howTo) out.push(howTo);
  return out;
}
