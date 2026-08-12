import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { navCategories, totalLive } from "@core/registry";
import { searchIndex } from "@core/search";
import { site } from "@core/site";
import { jsonLd, organizationSchema, websiteSchema } from "@core/schema";
import { SiteHeader } from "@ui/SiteHeader";
import { SiteFooter } from "@ui/SiteFooter";
import { ToastHost } from "@ui/Feedback";
import { themeBootstrapScript } from "@ui/ThemeToggle";
import "./globals.css";

/**
 * Fonts are self-hosted by next/font at build time: no request to a
 * third party at runtime, no CSS blocking, and a size-adjusted fallback
 * so swapping in the real face causes no layout shift. Two families
 * only — Step 02 item 10.
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono-brand",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    // Every page supplies its own full title; this is the safety net.
    template: `%s`,
  },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  publisher: site.name,
  formatDetection: { telephone: false, address: false, email: false },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: process.env.BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
      : undefined,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // The browser chrome should match the page in both themes.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1416" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = navCategories();
  const index = searchIndex();
  const count = totalLive();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${mono.variable}`}
    >
      <head>
        {/* Applies the stored theme before first paint. Without this the
            page renders light and then flips, which is both ugly and a
            layout-stability problem. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />

        {/* Brand entity, sitewide. Part 5.10 — AI engines cite sources
            that have an established identity. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd([organizationSchema(), websiteSchema()]),
          }}
        />
      </head>
      <body className="min-h-dvh bg-surface antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50
                     focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-fg-onbrand"
        >
          Skip to content
        </a>

        <SiteHeader
          categories={categories}
          searchIndex={index}
          toolCount={count}
        />

        <main id="main">{children}</main>

        <SiteFooter categories={categories} toolCount={count} />
        <ToastHost />
      </body>
    </html>
  );
}
