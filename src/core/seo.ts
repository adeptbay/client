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

/**
 * Google renders roughly 60 characters of title.
 *
 * Part 5.4 fixes the shape as `{Tool Name} — {benefit} | {Brand}`, and
 * the order of that template is a priority order: the keyword must lead,
 * the brand must survive. A naive clamp of the finished string does the
 * opposite — it cuts from the right, so the brand is the first thing
 * deleted and every title ends in a dangling "—…".
 *
 * `composeTitle` therefore budgets instead of truncating: the lead and
 * the brand are fixed costs, and only the benefit is allowed to shrink.
 * If the benefit will not fit as a readable phrase it is dropped whole,
 * because `Text Encryptor | AdeptBay` is a better title than
 * `Text Encryptor — AES-256-GCM with a properly | AdeptBay`.
 */
const TITLE_MAX = 60;

/** The brand suffix is a fixed cost in every generated title. */
const BRAND_SUFFIX = ` | ${site.name}`;
const LEAD_SEPARATOR = ' — ';

/** Cut on a word boundary and never leave trailing punctuation behind. */
function clampWords(input: string, max: number): string {
  if (input.length <= max) return input;
  const cut = input.slice(0, max + 1);
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace <= 0) return '';
  return cut.slice(0, lastSpace).replace(/[\s,;:.—–-]+$/, '');
}

/**
 * A benefit shorter than this is a fragment rather than a phrase. Below
 * the threshold the benefit is dropped entirely and the title falls back
 * to `{lead} | {Brand}`, which is short, clean and still branded.
 */
const MIN_BENEFIT_CHARS = 12;

export function composeTitle(lead: string, benefit?: string, max = TITLE_MAX): string {
  const base = `${lead}${BRAND_SUFFIX}`;
  if (!benefit) return base;

  const budget = max - lead.length - LEAD_SEPARATOR.length - BRAND_SUFFIX.length;
  if (budget < MIN_BENEFIT_CHARS) return base;

  const trimmed = clampWords(benefit.trim(), budget);
  // A one-word remnant ("Strong", "Twelve") reads as a mistake.
  if (!trimmed || trimmed.split(/\s+/).length < 2) return base;

  return `${lead}${LEAD_SEPARATOR}${trimmed}${BRAND_SUFFIX}`;
}

/**
 * Fallback benefit for a tool that has not declared a `titleBenefit`:
 * the first clause of its tagline, before the em-dash or full stop.
 * Hand-written `titleBenefit` is always better — this only guarantees
 * that a new tool is never title-less.
 */
function benefitFromTagline(tagline: string): string {
  return tagline.split(/\s+—\s+|\.\s|\.$/)[0]?.trim() ?? '';
}

/** For titles supplied whole (marketing pages), which already carry the brand. */
function clampTitle(input: string, max = TITLE_MAX): string {
  if (input.length <= max) return input;
  const cut = clampWords(input, max - 1);
  return cut ? `${cut}…` : input.slice(0, max);
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
    title: composeTitle(tool.name, tool.titleBenefit ?? benefitFromTagline(tool.tagline)),
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
    // "How to use the X" is the literal query; it leads. On a long tool
    // name the benefit is dropped and the title is simply
    // "How to use the Character Frequency Counter | AdeptBay".
    title: composeTitle(`How to use the ${tool.name}`, 'step by step'),
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
  /**
   * `category.title` is already a well-formed noun phrase for every
   * division ("Text & String Tools", "Calculators", "PDF Tools").
   * Appending "Tools" to `category.name` instead produced
   * "1 Free Calculators Tools", which is the kind of generated-grammar
   * tell that makes a page look machine-made in a SERP.
   */
  const noun = category.title;

  return pageMetadata({
    title: composeTitle(`${count} Free ${noun}`, 'No Sign-up'),
    description: category.description,
    path: `/${category.slug}`,
    ogTitle: category.title,
    ogKicker: `${count} TOOLS`,
    keywords: [
      noun.toLowerCase(),
      `free ${noun.toLowerCase()}`,
      `online ${noun.toLowerCase()}`,
    ],
  });
}
