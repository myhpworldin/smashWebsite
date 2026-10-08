import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Analytics } from "@/components/analytics/Analytics";
import { analyticsConfig } from "@/lib/analytics-config";
import { getSiteSettings } from "@/server/seo/request-cache";

/**
 * Search Console verification (Stage 4, Phase 5): only set when a real value
 * exists — omitting the key entirely (not an empty string) when it doesn't,
 * so nothing fake ever renders (phase brief §21/§36).
 */
/**
 * The tab icon comes from Site Settings (`favicon`). Until one is saved there is no icon file to serve, so the page
 * declares an empty one instead of letting the browser request a `/favicon.ico` that would 404 on every page.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings().catch(() => null);
  return {
    ...(analyticsConfig.googleSiteVerification ? { verification: { google: analyticsConfig.googleSiteVerification } } : {}),
    icons: { icon: settings?.favicon?.url ?? "data:," },
  };
}

/**
 * Global shell: skip link → header → main → footer, applied to every route.
 * Page-specific layout logic does not belong here (phase brief §7) — only
 * what every page shares. `Analytics` renders nothing visible and never
 * blocks or alters this shell (phase brief §37) — see its own docs.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a href="#main-content" className="skip-link">Skip to content</a>
        <Header />
        <main id="main-content">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
