/* eslint-disable @next/next/no-img-element */
import { getLocale, getTranslations } from "next-intl/server";
import { bundle, type Locale } from "@uxgate/content";
import { catalogEntry, pathArtUrl } from "@/lib/catalog";
import { buildQueue, confidentErrorSkills, pathOfId, type CheckResult, type ReviewSkill } from "@/lib/review";
import type { Learner } from "@/lib/server/learner";

const skillTitle = (id: string) => bundle.units.flatMap((u) => u.skills).find((s) => s.id === id)?.title;

/** One queue for every joined path: confident errors first, each card names its path. */
export async function ReviewMain({ me }: { me: Learner }) {
  const t = await getTranslations("review");
  const locale = (await getLocale()) as Locale;
  const now = new Date();
  const skills: ReviewSkill[] = [...me.skillStates].map(([skillId, r]) => ({ skillId, pathId: pathOfId(skillId), ...r }));

  // "Sure" and wrong answers on a skill, as the learner's own rows (row-level security): the ones to see first.
  let results: CheckResult[] = [];
  if (me.db && skills.length) {
    const { data } = await me.db.from("step_results").select("skill_id, correct, confidence, created_at").eq("user_id", me.userId).eq("kind", "check").in("skill_id", skills.map((s) => s.skillId)).order("created_at", { ascending: false }).limit(500);
    results = (data ?? []).map((r) => ({ skillId: r.skill_id as string, correct: !!r.correct, confidence: r.confidence as number | null, at: Date.parse(r.created_at as string) }));
  }
  const queue = buildQueue(skills, confidentErrorSkills(results), now);
  const next = skills.filter((s) => s.state === "shown" && s.nextReviewAt && s.nextReviewAt > now).sort((a, b) => a.nextReviewAt!.getTime() - b.nextReviewAt!.getTime())[0];
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const shownAt = new Map(skills.map((s) => [s.skillId, s.shownAt]));

  return (
    <div className="ph-page">
      <h1 className="t-h1 h1-s">{t("title")}</h1>
      {queue.length === 0 ? (
        <section className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 8, alignItems: "center", textAlign: "center" }}>
          <img src="/ill/uxgate-ill-empty-box.png" alt="" style={{ inlineSize: 96, blockSize: 96 }} />
          <h2 className="t-h2">{t("emptyTitle")}</h2>
          <p className="t-small ink-2">{skills.length ? t("emptyBody") : t("noneYet")}</p>
          {next?.nextReviewAt ? <p className="t-small ink-2">{t("nextOn", { date: fmt.format(next.nextReviewAt) })}</p> : null}
        </section>
      ) : (
        <>
          <p className="t-small ink-2">{t("lead")}</p>
          <p className="t-over">{t("count", { count: queue.length })}</p>
          <ul className="why-list">
            {queue.map((q) => (
              <li key={q.skillId} className="card review-card-q">
                <img src={pathArtUrl(q.pathId)} alt="" style={{ inlineSize: 40, blockSize: 40, flex: "none" }} />
                <div className="grow">
                  <p className="t-label">{skillTitle(q.skillId)?.[locale] ?? q.skillId}</p>
                  <p className="t-small ink-2"><span className="kind"><bdi>{catalogEntry(q.pathId)?.name ?? q.pathId}</bdi></span>{shownAt.get(q.skillId) ? <> · {t("shownOn", { date: fmt.format(shownAt.get(q.skillId)!) })}</> : null}</p>
                  {q.confidentError ? <p className="t-small" style={{ color: "var(--link)", fontWeight: 700 }}><span className="ph ph-bulb" aria-hidden="true" /> {t("sure")}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
