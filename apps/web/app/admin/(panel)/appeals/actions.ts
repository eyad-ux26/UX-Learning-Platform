"use server";

import { actionAdmin, AdminError, run, type ActionResult } from "@/lib/admin/guard";
import { textFrom, uuidFrom } from "@/lib/admin/form";
import { decideAppeal, sendToQuality, XP_CHOICES } from "@/lib/admin/data/appeals";

type R = ActionResult;

/** Accept (the answer counts, optional XP) or keep the result. The reply goes to the learner in both languages. */
export async function decide(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("appeals.decide");
    const id = uuidFrom(f.get("id"));
    const verdict = f.get("verdict");
    if (verdict !== "accept" && verdict !== "keep") throw new AdminError("invalid", "Pick accept or keep the result.");
    const en = textFrom(f, "reply_en", 2000, true, "the English reply")!;
    const ar = textFrom(f, "reply_ar", 2000, true, "the Arabic reply")!;
    const xpIn = Number(f.get("xp") ?? 0);
    const xp = (XP_CHOICES as readonly number[]).includes(xpIn) ? xpIn : 0;
    const { notified } = await decideAppeal(ctx, { id, accept: verdict === "accept", reply: { en, ar }, xp, toQuality: f.get("quality") === "on" });
    const how = notified.length ? ` The learner was told by ${notified.join(" and ")} and in their inbox.` : " The learner sees it in their inbox.";
    return { message: `${verdict === "accept" ? "Accepted" : "Result kept"}.${how}` };
  });
}

export async function quality(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("appeals.decide");
    await sendToQuality(ctx, uuidFrom(f.get("id")), f.get("on") !== "off");
  }, "Saved.");
}
