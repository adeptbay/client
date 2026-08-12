import Link from "next/link";
import type { Metadata } from "next";
import { pageMetadata } from "@core/seo";
import { site } from "@core/site";
import { posts } from "@/content/posts";
import { Breadcrumb } from "@ui/ToolSections";

export const metadata: Metadata = pageMetadata({
  title: `Blog — notes from building ${site.name}`,
  description: `Occasional writing on how these tools are built, what the trade-offs are, and what we got wrong.`,
  path: "/blog",
  ogTitle: "Blog",
  ogKicker: "WRITING",
});

export default function BlogIndex() {
  const sorted = [...posts].sort((a, b) =>
    b.published.localeCompare(a.published),
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <Breadcrumb items={[{ name: "Home", href: "/" }, { name: "Blog" }]} />

      <header className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
          Blog
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">
          Notes on how these tools are built and why. Published when there is
          something worth saying, which is not on a schedule.
        </p>
      </header>

      <ul className="mt-10 space-y-4">
        {sorted.map((post) => (
          <li key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              className="block rounded-xl border border-line bg-panel px-5 py-4 transition-colors
                         hover:border-brand-line hover:bg-brand-soft"
            >
              <p className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
                {post.published} · {post.readingMinutes} min read
              </p>
              <h2 className="mt-1.5 text-base font-semibold text-fg">
                {post.title}
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">
                {post.description}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-12 rounded-xl border border-line bg-sunken px-5 py-4 text-[13px] leading-relaxed text-fg-muted">
        Looking for how to use a specific tool? Each tool has its own guide,
        linked from its page — that is where the practical writing lives. Start
        at{" "}
        <Link href="/all-tools" className="text-brand-text hover:underline">
          the tool index
        </Link>
        .
      </p>
    </div>
  );
}
