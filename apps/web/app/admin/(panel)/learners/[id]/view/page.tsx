import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { allowed, requireAdmin } from "@/lib/admin/guard";
import { learner360, viewAsUntil } from "@/lib/admin/data/learners";
import { Confirm } from "@/components/admin/forms";
import { I, NoAccess, When } from "@/components/admin/ui";
import { endViewAs } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "View as learner" };

const T = {
  en: { hi: (n: string) => `Hi ${n}`, goal: (a: number, b: number) => `Today's goal: ${a} of ${b}`, next: "Next in", cont: "Continue where you left off", review: (n: number) => `${n} skills to review today`, paths: "Your paths", done: (a: number, b: number) => `${a} of ${b} lessons`, streak: "day streak", freezes: (n: number) => `${n} freeze${n === 1 ? "" : "s"}`, pro: "Pro", free: "Free plan: Unit 1 of every path", nav: ["Home", "Paths", "Review", "Profile"] },
  ar: { hi: (n: string) => `أهلًا ${n}`, goal: (a: number, b: number) => `هدف اليوم: ${a} من ${b}`, next: "التالي في", cont: "أكمل من حيث توقفت", review: (n: number) => `${n} مهارات للمراجعة اليوم`, paths: "مساراتك", done: (a: number, b: number) => `${a} من ${b} دروس`, streak: "يوم متتالٍ", freezes: (n: number) => `${n} تجميد`, pro: "Pro", free: "الخطة المجانية: الوحدة 1 من كل مسار", nav: ["الرئيسية", "المسارات", "المراجعة", "الملف الشخصي"] },
};

/** Read only: what the learner's Home shows now, from their real progress, in their language. Logged; 30 minutes. */
export default async function ViewAsPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "learners.view_as")) return <NoAccess what="View as learner" roles="a support or admin role" />;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const until = await viewAsUntil(ctx.sessionId, id);
  if (!until) redirect(`/admin/learners/${id}`);
  const d = await learner360(id);
  if (!d?.learner) notFound();
  const L = d.learner;
  const lang = d.lang;
  const t = T[lang];
  const first = (d.profile?.display_name || "").split(/\s+/)[0] || "";
  const active = d.paths.find((p) => p.id === L.activePathId) ?? d.paths[0];
  const due = [...L.skillStates.values()].filter((s) => s.nextReviewAt && new Date(s.nextReviewAt).getTime() <= Date.now()).length;
  return (
    <main className="a-page">
      <div className="a-banner" role="status">
        <I n="eye" />
        <span className="a-grow">Viewing as {d.profile?.display_name || "this learner"} · read only. Nothing here changes their account. This view is logged and ends <When at={until} rel />.</span>
        <Confirm action={endViewAs} label="Exit view" title="Leave the learner view?" small reason={false} hidden={[{ name: "user", value: id }]} go={`/admin/learners/${id}`} />
      </div>
      <p className="t-xs ink-3">uxgate.org/{lang}/app · as they see it now · {lang === "ar" ? "Arabic" : "English"} · their real progress. Lessons open read-only in the learner app are not part of this view.</p>
      <div className="a-row" style={{ gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div className="a-phone" dir={lang === "ar" ? "rtl" : "ltr"} lang={lang} aria-label="Learner home, as the learner sees it">
          <div className="sb"><span>9:41</span><span>UXGate</span></div>
          <div className="bd">
            <b style={{ fontSize: 20 }}>{t.hi(first)}</b>
            <div className="lx-banner"><span style={{ fontSize: 22, fontWeight: 800 }}>{L.progress.streak}</span><span>{t.streak} · {t.freezes(L.freezes)}</span></div>
            <div>{t.goal(L.progress.lessonsToday, L.progress.dailyGoal)}<div className="lx-prog" style={{ marginTop: 6 }}><span style={{ width: `${Math.min(100, (L.progress.lessonsToday / Math.max(1, L.progress.dailyGoal)) * 100)}%` }} /></div></div>
            {active ? (
              <div className="lx-opt"><div className="t-xs">{t.next} {active.title}</div><div>{active.next ?? "—"}</div></div>
            ) : null}
            <span className="lx-btn">{t.cont}</span>
            {due ? <div className="lx-opt">{t.review(due)}</div> : null}
            <b>{t.paths}</b>
            {d.paths.map((p) => (
              <div key={p.id} className="lx-opt"><div>{p.title}</div><div className="t-xs">{t.done(p.done, p.total)}</div><div className="lx-prog" style={{ marginTop: 6 }}><span style={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%` }} /></div></div>
            ))}
            <div className="t-xs">{L.pro ? t.pro : t.free}</div>
            <nav className="a-row" style={{ justifyContent: "space-between", fontSize: 11, fontWeight: 700 }} aria-label="Learner app menu (not clickable)">{t.nav.map((n) => <span key={n}>{n}</span>)}</nav>
          </div>
        </div>
        <div className="a-stack" style={{ maxWidth: 420 }}>
          <p className="t-sm">This is built from the same reads the learner app uses: streak {L.progress.streak}, XP {L.progress.xpTotal.toLocaleString("en")}, {L.pro ? "on Pro" : "on the free plan"}, week starts {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][L.weekStart]}.</p>
          <Link href={`/admin/learners/${id}?tab=learning`} className="a-btn"><I n="list" />Lesson by lesson, in Learner 360</Link>
        </div>
      </div>
    </main>
  );
}
