// Slice 4 strings live in their own files (account, public pages, emails) so the slices that build in parallel do not
// edit the same message file. Each file adds whole namespaces; none of them may reuse a namespace of the main files.
import accountEn from "./account.en.json";
import accountAr from "./account.ar.json";
import publicEn from "./public.en.json";
import publicAr from "./public.ar.json";
import emailsEn from "./emails.en.json";
import emailsAr from "./emails.ar.json";

export const slice4 = {
  en: { ...accountEn, ...publicEn, ...emailsEn },
  ar: { ...accountAr, ...publicAr, ...emailsAr },
} as const;

export function withSlice4<T extends Record<string, unknown>>(locale: string, base: T): T {
  return { ...base, ...(locale === "ar" ? slice4.ar : slice4.en) };
}
