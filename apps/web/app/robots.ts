import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/public-paths";

export const dynamic = "force-static";

/** Learner pages, the API and system pages stay out of search; everything public is in the sitemap. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/en/app", "/ar/app", "/en/goodbye", "/ar/goodbye", "/en/reset", "/ar/reset"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
