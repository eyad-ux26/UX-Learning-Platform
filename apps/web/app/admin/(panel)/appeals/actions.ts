"use server";

import { actionAdmin, AdminError, run, type ActionResult } from "@/lib/admin/guard";
import { textFrom, uuidFrom } from "@/lib/admin/form";
import { decideAppeal, sendToQuality, XP_CHOICES } from "@/lib/admin/data/appeals";

type R = ActionResult;

/** Accept (the answer counts, optional XP) or reject (keep the result). The reply is written in the learner's app language. */
export async function decide(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("appeals.decide");
    const id = uuidFrom(f.get("id"));
    const verdict = f.get("verdict");
    if (verdict !== "accept" && verdict !== "keep") throw new AdminError("invalid", "Pick accept or keep the result.");
    const text = textFrom(f, "reply", 2000, true, "the reply")!;
    // Stored under both keys so the learner reads it whichever language they switch to later.
    const en = text, ar = text;
    const xpIn = Number(f.get("xp") ?? 0);
    const xp = (XP_CHOICES as readonly number[]).includes(xpIn) ? xpIn : 0;
    const { notified } = await decideAppeal(ctx, { id, accept: verdict === "accept", reply: { en, ar }, xp, toQuality: f.get("quality") === "on" });
    const how = notified.length ? ` The learner was told by ${notified.join(" and ")} and in their inbox.` : " The learner sees it in their inbox.";
    return { message: `${verdict === "accept" ? "Accepted" : "Rejected"}.${how}` };
  });
}

export async function quality(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("appeals.decide");
    await sendToQuality(ctx, uuidFrom(f.get("id")), f.get("on") !== "off");
  }, "Saved.");
}
