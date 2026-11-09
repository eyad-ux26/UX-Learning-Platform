"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { actionAdmin, AdminError, check, requireFresh, run, who, type ActionResult } from "@/lib/admin/guard";
import { reasonFrom, textFrom } from "@/lib/admin/form";
import { PRICES, type Region } from "@/lib/billing/pricing";
import { fmtMoney } from "@/lib/admin/format";

/**
 * SET-5 / BIL-7: asks for a new price for one region and plan. A second person with prices.change approves it. An
 * approved change is the instruction to create the new provider price and update lib/billing/pricing.ts in one
 * reviewed change; people already subscribed keep their price.
 */
export async function requestPriceChange(_: ActionResult | null, f: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await actionAdmin("prices.change");
    const region = String(f.get("region") ?? "") as Region;
    const period = String(f.get("period") ?? "");
    if (!PRICES[region] || !["month", "year"].includes(period)) throw new AdminError("invalid", "Pick a region and a plan.");
    const cur = PRICES[region];
    const raw = String(f.get("amount") ?? "").trim();
    if (!/^\d+(\.\d{1,2})?$/.test(raw)) throw new AdminError("invalid", "Enter the new price, for example 7.50.");
    const minor = Math.round(Number(raw) * 100);
    const now = cur[period as "month" | "year"];
    if (minor < 100 || minor > now * 3) throw new AdminError("invalid", `Enter a price between ${fmtMoney(100, cur.currency)} and ${fmtMoney(now * 3, cur.currency)}.`);
    if (minor === now) throw new AdminError("invalid", "That is the price today.");
    const from = textFrom(f, "from", 10, true, "the start date")!;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || new Date(from).getTime() < Date.now() - 86_400_000) throw new AdminError("invalid", "Pick a start date from today on.");
    await requireFresh(ctx, f.get("code") as string | null);
    const title = `Price change: ${region} ${period === "year" ? "annual" : "monthly"} ${fmtMoney(now, cur.currency)} to ${fmtMoney(minor, cur.currency)}`;
    check(await createAdminClient().rpc("admin_request_approval", {
      ...who(ctx), p_kind: "price", p_permission: "prices.change", p_title: title,
      p_detail: { region, period, currency: cur.currency, from_minor: now, to_minor: minor, starts: from }, p_target_type: "price", p_target_id: `${region}-${period}`, p_reason: reasonFrom(f),
    }));
  }, "Sent for approval. A second person with the right role approves it.");
}
