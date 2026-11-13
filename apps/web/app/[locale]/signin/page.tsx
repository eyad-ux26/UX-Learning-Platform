import { setRequestLocale } from "next-intl/server";
import { AuthForm } from "@/components/app/AuthForm";
import { redirect } from "@/i18n/navigation";
import { getLearner } from "@/lib/server/learner";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const { error } = await searchParams;
  setRequestLocale(locale);
  if (await getLearner()) return redirect({ href: "/app", locale }) as never;
  // Sign in with Apple stays hidden until the Apple Developer and Supabase setup is done (NEXT_PUBLIC_APPLE_SIGNIN=1).
  return <AuthForm mode="signin" linkError={error === "link"} apple={process.env.NEXT_PUBLIC_APPLE_SIGNIN === "1"} />;
}
