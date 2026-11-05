import { setRequestLocale } from "next-intl/server";
import { Shell } from "@/components/app/Shell";
import { StudentConfirm } from "@/components/billing/StudentConfirm";
import { STUDENT_VALID_DAYS } from "@/lib/billing/student";
import { requireLearner } from "@/lib/server/learner";
import { formatDate, shellFor } from "@/lib/server/billing/page";

export const dynamic = "force-dynamic";

export default async function StudentConfirmPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string }> }) {
  const { locale } = await params;
  const { token } = await searchParams;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  const until = formatDate(new Date(Date.now() + STUDENT_VALID_DAYS * 86_400_000).toISOString(), locale, true);
  return (
    <Shell {...shellFor(me)}>
      <StudentConfirm token={token && /^[0-9a-f]{64}$/.test(token) ? token : null} until={until} />
    </Shell>
  );
}
