import { setRequestLocale } from "next-intl/server";
import { AuthForm } from "@/components/app/AuthForm";
import { redirect } from "@/i18n/navigation";
import { getLearner } from "@/lib/server/learner";

export const dynamic = "force-dynamic";

export default async function SignUpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (await getLearner()) return redirect({ href: "/app", locale }) as never;
  return <AuthForm mode="signup" />;
}
