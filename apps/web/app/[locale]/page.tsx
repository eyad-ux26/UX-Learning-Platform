import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { Logo } from "@/components/Logo";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { ThemeSwitch } from "@/components/ThemeSwitch";

export default function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("shell");
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-5">
      <header className="flex items-center gap-2">
        <Logo />
        <span className="flex-1" />
        <LocaleSwitch />
      </header>
      <h1 className="t-display">{t("title")}</h1>
      <p className="t-lead">{t("lead")}</p>
      <ThemeSwitch />
    </main>
  );
}
