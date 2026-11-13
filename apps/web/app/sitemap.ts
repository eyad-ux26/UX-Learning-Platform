import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { PUBLIC_PATHS, SITE_URL } from "@/lib/public-paths";
import { LEGAL_STATUS } from "@/lib/legal-text";
import { comingSoonOn } from "@/lib/coming-soon";

// Read at request time: UG_COMING_SOON is a Worker variable, not a build variable.
export const dynamic = "force-dynamic";

/**
 * Public pages in both languages, each with its hreflang pair. The pricing page is always listed. Privacy, terms and the refund policy join once their text is
 * approved. While the Coming Soon gate is on, the other pages show Coming Soon with noindex, so only the home address is listed.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const open = comingSoonOn() ? [""] : ["", "/paths", ...PUBLIC_PATHS.map((p) => `/paths/${p.slug}`)];
  const pages = [...open, "/pricing", ...(LEGAL_STATUS.approved ? ["/privacy", "/terms", "/refund"] : [])];
  return pages.flatMap((page) =>
    routing.locales.map((locale) => ({
      url: `${SITE_URL}/${locale}${page}`,
      changeFrequency: "weekly" as const,
      priority: page === "" ? 1 : page.startsWith("/paths") ? 0.8 : 0.3,
      alternates: { languages: Object.fromEntries(routing.locales.map((l) => [l, `${SITE_URL}/${l}${page}`])) },
    })),
  );
}
