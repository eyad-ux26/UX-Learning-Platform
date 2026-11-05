import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

type Messages = Record<string, unknown>;

/** Later files add namespaces (and keys) to the main file: each slice keeps its strings in messages/sN/. */
function merge(a: Messages, b: Messages): Messages {
  const out: Messages = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const cur = out[k];
    out[k] = cur && typeof cur === "object" && v && typeof v === "object" ? merge(cur as Messages, v as Messages) : v;
  }
  return out;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const [main, s5] = await Promise.all([import(`../messages/${locale}.json`), import(`../messages/s5/${locale}.json`)]);
  return { locale, messages: merge(main.default, s5.default) };
});
