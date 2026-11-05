import { setRequestLocale } from "next-intl/server";
import { AuthForm } from "@/components/app/AuthForm";
import { redirect } from "@/i18n/navigation";
import { getLearner } from "@/lib/server/learner";

export const dynamic = "force-dynamic";

export default async function SignInPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ error?: string }> }) {
  const { locale } = await params;
  const { error } = await searchParams;
  setRequestLocale(locale);
  if (await getLearner()) return redirect({ href: "/app", locale }) as never;
  return <AuthForm mode="signin" linkError={error === "link"} />;
}
