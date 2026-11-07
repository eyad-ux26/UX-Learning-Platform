import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import { withSlice4 } from "../messages/s4";

type Messages = Record<string, unknown>;

/** Slice 5's and s6's files add namespaces and keys (deep merge); slice 4's files add whole namespaces. */
function merge(a: Messages, b: Messages): Messages {
  const out: Messages = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const cur = out[k];
    out[k] = cur && typeof cur === "object" && v && typeof v === "object" ? merge(cur as Messages, v as Messages) : v;
  }
  return out;
}

/** Merged once per locale for the life of the Worker, not on every request (issue #131). */
const cache = new Map<string, Promise<Messages>>();
function messagesFor(locale: string): Promise<Messages> {
  let m = cache.get(locale);
  if (!m) {
    // s6: the Coming Soon page (namespace "soon") and its sign-in message (auth4 keys).
    m = Promise.all([import(`../messages/${locale}.json`), import(`../messages/s5/${locale}.json`), import(`../messages/s6/${locale}.json`)])
      .then(([main, s5, s6]) => merge(withSlice4(locale, merge(main.default, s5.default)), s6.default));
    m.catch(() => cache.delete(locale));
    cache.set(locale, m);
  }
  return m;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return { locale, messages: await messagesFor(locale) };
});
