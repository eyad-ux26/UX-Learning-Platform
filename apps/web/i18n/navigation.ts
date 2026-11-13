import { useMemo } from "react";
import { createNavigation } from "next-intl/navigation";
import { startNavProgress } from "@/lib/nav-progress";
import { routing } from "./routing";

const nav = createNavigation(routing);
export const { Link, redirect, usePathname, getPathname } = nav;

/**
 * next-intl's router, with the navigation progress line started on push and replace, so screens opened from code
 * (after a save, a sign-in, a path switch) show the same loading feedback as a link.
 */
export function useRouter(): ReturnType<typeof nav.useRouter> {
  const router = nav.useRouter();
  return useMemo(() => {
    const track = (href: Parameters<typeof router.push>[0], locale?: string) => {
      startNavProgress(
        typeof href === "string" && !locale
          ? `/${document.documentElement.lang}${href.startsWith("/") ? href : `/${href}`}`
          : null,
      );
    };
    return {
      ...router,
      push: (href, options) => {
        track(href, options?.locale);
        router.push(href, options);
      },
      replace: (href, options) => {
        track(href, options?.locale);
        router.replace(href, options);
      },
    };
  }, [router]);
}
