/**
 * Part 5.4 — title, meta and canonical, generated from the registry.
 *
 * Nothing on this site hand-writes a <title>. At 1000 pages hand-written
 * metadata drifts, duplicates and truncates; generated metadata does not.
 */

import type { Metadata } from 'next';
import { absoluteUrl, site } from './site';
import type { Category } from './categories';
import type { AnyTool } from './registry';

/** Google renders roughly 60 characters of title. Cut on a word. */
function clampTitle(input: string, max = 60): string {
  if (input.length <= max) return input;
  const cut = input.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ')).trimEnd()}…`;
}

/** 140–155 characters. Shorter loses the pitch, longer gets truncated. */
function clampDescription(input: string, max = 158): string {
  if (input.length <= max) return input;
  const cut = input.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ')).trimEnd()}…`;
}

interface PageMetaInput {
  title: string;
  description: string;
  path: string;
  /** Rendered into the dynamic OG image. Defaults to the title. */
  ogTitle?: string;
  ogKicker?: string;
  keywords?: string[];
  /** Set for pages that must not enter the index (search results, previews). */
  noindex?: boolean;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
}

export function pageMetadata(input: PageMetaInput): Metadata {
  const url = absoluteUrl(input.path);
  const title = clampTitle(input.title);
  const description = clampDescription(input.description);

  const ogParams = new URLSearchParams({ title: input.ogTitle ?? input.title });
  if (input.ogKicker) ogParams.set('kicker', input.ogKicker);
  const ogImage = absoluteUrl(`/api/og?${ogParams.toString()}`);

  return {
    title,
    description,
    keywords: input.keywords,
    // Always self-referencing (Part 5.4).
    alternates: { canonical: url },
    robots: input.noindex
      ? { index: false, follow: true }
      : { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    openGraph: {
      type: input.type ?? 'website',
      url,
      siteName: site.name,
      title,
      description,
      locale: 'en_US',
      images: [{ url: ogImage, width: 1200, height: 630, alt: input.ogTitle ?? input.title }],
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      ...(input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

/**
 * Tool page metadata.
 *   Title : {Tool Name} — {benefit} | {Brand}
 *   Meta  : {what it does} + {differentiator} + {call to action}
 * The H1 is close to the title but never identical (Part 5.4).
 */
export function toolMetadata(tool: AnyTool): Metadata {
  return pageMetadata({
    title: `${tool.name} — ${tool.tagline.split('.')[0]} | ${site.name}`,
    description: tool.description,
    path: `/${tool.category}/${tool.slug}`,
    ogTitle: tool.name,
    ogKicker: tool.category.toUpperCase(),
    keywords: tool.keywords,
    modifiedTime: tool.updated,
  });
}

/**
 * Guide titles are phrased "How to use the X" rather than
 * "How to X" — tool names are nouns, so the second reads as
 * "how to word counter".
 */
export function guideMetadata(tool: AnyTool): Metadata {
  return pageMetadata({
    title: `How to use the ${tool.name} — a practical guide | ${site.name}`,
    description: `A step-by-step guide to using the ${tool.name}, including the alternatives, the trade-offs and the mistakes that cost people the most time.`,
    path: `/${tool.category}/${tool.slug}/guide`,
    ogTitle: `${tool.name} guide`,
    ogKicker: 'GUIDE',
    keywords: tool.keywords.map((k) => `how to ${k}`),
    type: 'article',
    publishedTime: tool.added,
    modifiedTime: tool.updated,
  });
}

export function categoryMetadata(category: Category, count: number): Metadata {
  return pageMetadata({
    title: `${count} Free ${category.name} Tools — No Sign-up | ${site.name}`,
    description: category.description,
    path: `/${category.slug}`,
    ogTitle: category.title,
    ogKicker: `${count} TOOLS`,
    keywords: [
      `${category.name.toLowerCase()} tools`,
      `free ${category.name.toLowerCase()} tools`,
      `online ${category.name.toLowerCase()} tools`,
    ],
  });
}
