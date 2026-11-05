import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { PUBLIC_PATHS, SITE_URL } from "@/lib/public-paths";
import { LEGAL_STATUS } from "@/lib/legal-text";

export const dynamic = "force-static";

/** Public pages in both languages, each with its hreflang pair. Privacy, terms and the refund policy join once their text is approved. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/paths", ...PUBLIC_PATHS.map((p) => `/paths/${p.slug}`), ...(LEGAL_STATUS.approved ? ["/privacy", "/terms", "/refund"] : [])];
  return pages.flatMap((page) => routing.locales.map((locale) => ({
    url: `${SITE_URL}/${locale}${page}`,
    changeFrequency: "weekly" as const,
    priority: page === "" ? 1 : page.startsWith("/paths") ? 0.8 : 0.3,
    alternates: { languages: Object.fromEntries(routing.locales.map((l) => [l, `${SITE_URL}/${l}${page}`])) },
  })));
}
