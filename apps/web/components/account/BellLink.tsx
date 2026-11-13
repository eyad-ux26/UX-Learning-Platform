import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Learner } from "@/lib/server/learner";
import { unreadCount } from "@/lib/server/inbox";

/** The bell on Home and Profile: opens the inbox, with the number of unread items. */
export async function BellLink({ me }: { me: Pick<Learner, "db" | "userId" | "unread"> }) {
  const t = await getTranslations("inbox");
  // Usually read with the learner already (my_learner_state); counted here only before migration 0039.
  const n = me.unread ?? (await unreadCount(me.db, me.userId).catch(() => 0));
  return (
    <Link href="/app/inbox" className="bell-link" aria-label={n ? t("bellCount", { count: n }) : t("bell")}>
      <span className={`ph ph-bell${n ? "" : ""}`} aria-hidden="true" />
      {n ? (
        <span className="badge" aria-hidden="true">
          {n > 9 ? "9+" : n}
        </span>
      ) : null}
    </Link>
  );
}
