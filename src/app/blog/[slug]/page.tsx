import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { pageMetadata } from '@core/seo';
import { articleSchema, breadcrumbSchema, jsonLd } from '@core/schema';
import { getPost, posts } from '@/content/posts';
import { Breadcrumb } from '@ui/ToolSections';

export const dynamicParams = false;

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};

  return pageMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
    ogTitle: post.title,
    ogKicker: 'BLOG',
    type: 'article',
    publishedTime: post.published,
    modifiedTime: post.updated,
  });
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd([
            articleSchema({
              headline: post.title,
              description: post.description,
              path: `/blog/${post.slug}`,
              published: post.published,
              modified: post.updated,
            }),
            breadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: 'Blog', path: '/blog' },
              { name: post.title, path: `/blog/${post.slug}` },
            ]),
          ]),
        }}
      />

      <Breadcrumb
        items={[{ name: 'Home', href: '/' }, { name: 'Blog', href: '/blog' }, { name: post.title }]}
      />

      <header className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-[32px]">{post.title}</h1>
        <p className="mt-3 text-xs text-fg-subtle">
          Published {post.published}
          {post.updated !== post.published && ` · updated ${post.updated}`} · {post.readingMinutes} min
          read
        </p>
      </header>

      {/* The block a retrieval engine lifts. Complete on its own. */}
      <div className="mt-6 rounded-xl border border-brand-line bg-brand-soft px-5 py-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-brand-text">
          The short version
        </h2>
        <ul className="mt-2 space-y-1.5">
          {post.tldr.map((point) => (
            <li key={point} className="flex gap-2 text-[13px] leading-relaxed text-fg-muted">
              <span aria-hidden="true" className="text-brand">
                ·
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div className="prose-bay mt-8">
        {post.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
            {section.list && (
              <ul>
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <p className="mt-10 border-t border-line pt-5 text-xs text-fg-subtle">
        Last verified {post.updated}. Found an error?{' '}
        <Link href="/contact" className="text-brand-text hover:underline">
          Tell us
        </Link>{' '}
        — corrections are recorded in the changelog.
      </p>
    </article>
  );
}
