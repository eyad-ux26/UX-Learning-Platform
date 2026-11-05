/* eslint-disable @next/next/no-img-element */
import { getLocale, getTranslations } from "next-intl/server";
import { content, type Locale } from "@uxgate/content";
import { catalogEntry, pathArtUrl } from "@/lib/catalog";
import { Link } from "@/i18n/navigation";
import { loadQueue, reviewUnitOf } from "@/lib/server/review-session";
import { buildQueue, pathOfId, sessionSkills, type ReviewSkill } from "@/lib/review";
import type { Learner } from "@/lib/server/learner";

const skillTitle = (id: string) => content.units.flatMap((u) => u.skills).find((s) => s.id === id)?.title;

/** Without a database (the design fixture) the queue comes from the skill states alone. */
function offlineQueue(me: Learner, now: Date) {
  const skills: ReviewSkill[] = [...me.skillStates].map(([skillId, r]) => ({ skillId, pathId: pathOfId(skillId), ...r }));
  return { skills, queue: buildQueue(skills, new Set(), now) };
}

/** One queue for every joined path: confident errors first, each card names its path. */
export async function ReviewMain({ me }: { me: Learner }) {
  const t = await getTranslations("review");
  const locale = (await getLocale()) as Locale;
  const now = new Date();
  // "Sure" and wrong answers come first; read as the learner's own rows (row-level security).
  const { skills, queue } = me.db ? await loadQueue(me.db, me.userId, me.skillStates, now) : offlineQueue(me, now);
  // The next session takes the due skills of one unit, at most 5, so the Start button says how many questions it asks.
  const session = sessionSkills(queue, reviewUnitOf);
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
          {session ? (
            <div className="card" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              <p className="t-small ink-2">{t("about", { n: session.skills.length })}{queue.length > session.skills.length ? <> · {t("more", { n: queue.length - session.skills.length })}</> : null}</p>
              <Link href="/app/review/session" className="btn btn-primary btn-lg btn-block press"><span className="ph ph-play" aria-hidden="true" />{t("start")}</Link>
            </div>
          ) : null}
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
