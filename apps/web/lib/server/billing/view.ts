import "server-only";
import { getTranslations } from "next-intl/server";
import { formatMoney, moneyCls, type Period } from "@/lib/billing/pricing";
import { cardExpiresBefore, refundWindow, renewalPrice, WALLET_REMINDER_DAYS, type Sub } from "@/lib/billing/subscription";
import type { Payment } from "@/lib/billing/engine";
import type { BillingView } from "./account";
import { countryName, formatDate } from "./page";

type T = Awaited<ReturnType<typeof getTranslations<"billing">>>;

const DAY = 86_400_000;

/** The latest charge a refund can be asked for, and whether the 7 days are still open. */
export function refundTarget(v: BillingView, now = new Date()) {
  const last = v.payments.find((p) => p.status === "paid") ?? null;
  if (!last) return null;
  const req = v.requests.find((r) => r.paymentId === last.id) ?? null;
  return { payment: last, request: req, window: refundWindow(last, !!req, now) };
}

export const provName = (p: string) => (p === "paddle" ? "Paddle" : p === "mock" ? "Paymob (test)" : "Paymob");

export function cardName(t: T, s: Pick<Sub, "payMethod" | "cardBrand" | "cardLast4"> | Pick<Payment, "payMethod" | "cardBrand" | "cardLast4">) {
  if (s.payMethod === "wallet") return t("walletName", { last4: s.cardLast4 ?? "" });
  return `${s.cardBrand ?? "Card"} •••• ${s.cardLast4 ?? ""}`.trim();
}

/** Every value the Plan and billing screen shows, in the learner's language. */
export async function billingScreen(v: BillingView, locale: string, now = new Date()) {
  const t = await getTranslations("billing");
  const L = locale as "en" | "ar";
  const d = (iso: string | null | undefined) => formatDate(iso, locale);
  const s = v.sub;
  const $ = (n: number, cur = s?.currency ?? "EGP") => formatMoney(n, cur, L);
  const live = !!s && ["active", "grace", "cancelled"].includes(s.status);
  const wallet = s?.payMethod === "wallet";

  type Notice = { cls: string; icon: string; t: string; b: string; act?: { kind: "renewal" | "card" | "plans"; label: string } };
  let notice: Notice | null = null;
  let plan: { name: string; st: string; stCls: string; k1: string; v1: string; k2: string; v2: string; resume: "resume" | "restart" | null; change: boolean } | null = null;

  if (s) {
    const name = `${t("proName")} · ${s.period === "month" ? t("monthly") : t("annual")}`;
    const next = `${$(s.renewAmountMinor)} · ${d(s.currentPeriodEnd)}`;
    plan = { name, st: t("st.active"), stCls: "st st-yes", k1: t("nextCharge"), v1: next, k2: t("memberSince"), v2: d(v.entitlement?.proSince ?? s.currentPeriodStart), resume: null, change: true };
    if (s.status === "active" && wallet) {
      plan = { ...plan, st: t("st.dueBy", { date: d(s.currentPeriodEnd) }), stCls: "st st-kept", k1: t("payBy") };
      if (new Date(s.currentPeriodEnd).getTime() - now.getTime() <= WALLET_REMINDER_DAYS * DAY)
        notice = { cls: "notice is-info", icon: "ph ph-wallet", t: t("n.walT"), b: t("n.walB", { amount: $(s.renewAmountMinor), date: d(s.currentPeriodEnd) }), act: { kind: "renewal", label: t("n.walAct") } };
    } else if (s.status === "active" && cardExpiresBefore(s.cardExpiry, s.currentPeriodEnd)) {
      // Paddle updates the card on its own page; a Paymob card changes at the next payment (there is nothing to pay now).
      notice = { cls: "notice", icon: "ph ph-credit-card", t: t("n.expT"), b: t("n.expB", { date: d(s.currentPeriodEnd) }), act: s.provider === "paddle" ? { kind: "card", label: t("n.expAct") } : undefined };
    } else if (s.status === "grace" && wallet) {
      plan = { ...plan, st: t("st.due"), stCls: "st st-warn", k1: t("proUntil"), v1: d(s.graceUntil), k2: t("payBy"), v2: d(s.graceUntil) };
      notice = { cls: "notice", icon: "ph ph-wallet", t: t("n.walLateT"), b: t("n.walLateB", { date: d(s.currentPeriodEnd), until: d(s.graceUntil) }), act: { kind: "renewal", label: t("n.walAct") } };
    } else if (s.status === "grace") {
      plan = { ...plan, st: t("st.due"), stCls: "st st-warn", k1: t("proUntil"), v1: d(s.graceUntil), k2: t("nextCharge"), v2: s.nextRetryAt ? t("retryOn", { date: d(s.nextRetryAt) }) : "—" };
      notice = { cls: "notice", icon: "ph ph-warning", t: t("n.failT"), b: t("n.failB", { date: d(s.currentPeriodEnd), until: d(s.graceUntil) }), act: { kind: "card", label: t("n.failAct") } };
    } else if (s.status === "cancelled") {
      plan = { ...plan, st: t("st.ends", { date: d(s.currentPeriodEnd) }), stCls: "st st-kept", k1: t("proUntil"), v1: d(s.currentPeriodEnd), k2: t("renewal"), v2: t("renewalOff"), resume: "resume", change: false };
    } else if (s.status === "paused") {
      plan = { ...plan, st: t("st.paused"), stCls: "st st-off", k1: t("lastDay"), v1: d(s.endedAt ?? s.graceUntil), k2: t("restartK"), v2: t("allKept"), resume: "restart", change: false };
      notice = { cls: "notice is-info", icon: "ph ph-info", t: t("n.lapT"), b: t("n.lapB", { date: d(s.endedAt ?? s.graceUntil) }), act: { kind: "plans", label: t("restart") } };
    } else if (s.status === "refunded" || s.status === "ended") {
      plan = { ...plan, st: s.status === "refunded" ? t("st.refunded") : t("st.ended"), stCls: "st st-off", k1: t("lastDay"), v1: d(s.endedAt), k2: t("restartK"), v2: t("allKept"), resume: "restart", change: false };
      notice = s.status === "refunded" ? { cls: "notice is-info", icon: "ph ph-info", t: t("n.refundedT"), b: t("n.refundedB") } : { cls: "notice is-info", icon: "ph ph-info", t: t("n.endedT"), b: t("n.endedB") };
    }
  }

  const pending = s?.pendingPeriod && s.pendingPeriod !== s.period ? (s.pendingPeriod === "year" ? t("startsOn", { date: d(s.currentPeriodEnd) }) : t("startsOnM", { date: d(s.currentPeriodEnd) })) : null;

  // Payment method: Paddle changes cards on its page; a Paymob card changes when a payment is due.
  const method = s && live ? {
    icon: wallet ? "ph ph-wallet" : "ph ph-credit-card", name: cardName(t, s),
    sub: wallet ? t("walletSub") : s.cardExpiry ? t("expires", { date: s.cardExpiry }) : t("cardSub", { provider: provName(s.provider) }),
    update: s.provider === "paddle" || s.status === "grace" ? (wallet ? "renewal" : "card") as "renewal" | "card" : null,
  } : null;

  const reqFor = (p: Payment) => v.requests.find((r) => r.paymentId === p.id);
  const receipts = v.payments.map((p) => {
    const r = reqFor(p);
    const st = p.status === "refunded" ? { st: t("refundedSt"), cls: "st st-off" } : r?.status === "waiting" ? { st: t("refundReq"), cls: "st st-wait" } : { st: t("paid"), cls: "st st-yes" };
    return { id: p.id, mc: moneyCls(p.currency), date: d(p.paidAt), what: p.period === "year" ? t("lineY") : t("lineM"), amt: formatMoney(p.amountMinor, p.currency, L), ...st, aria: t("recAria", { date: d(p.paidAt) }) };
  });

  const rt = refundTarget(v, now);
  const refund = !rt ? null : rt.window.ok ? { kind: "open" as const, sub: t("refundIn", { date: d(rt.payment.paidAt), until: d(rt.window.until) }) }
    : rt.window.reason === "asked" ? { kind: "asked" as const, sub: t("refundDone", { date: d(rt.request?.createdAt) }) }
    : rt.window.reason === "late" ? {
      kind: "late" as const, sub: t("refundOut"),
      body: t("ltBody", { amount: formatMoney(rt.payment.amountMinor, rt.payment.currency, L), date: d(rt.payment.paidAt), days: Math.floor((now.getTime() - new Date(rt.payment.paidAt).getTime()) / DAY) }),
      cancelS: s && (s.status === "active" || s.status === "grace") ? t("ltCancelS", { date: d(s.currentPeriodEnd) }) : null,
    } : null;

  // Change plan sheet: both prices this plan would renew at, and when the switch happens.
  const change = s && live ? (() => {
    const price = (p: Period) => renewalPrice(s, p, s.currentPeriodEnd);
    const opts = (["month", "year"] as const).map((p) => ({
      period: p, name: p === "month" ? t("monthly") : t("annual"), price: $(price(p)), per: p === "month" ? t("perMonth") : t("perYear"),
      sub: p === "year" ? t("save", { x: $(Math.max(0, price("month") * 12 - price("year"))) }) : t("monthlySub"),
    }));
    const when = {
      year: { t: t("chWhenToY", { date: d(s.currentPeriodEnd) }), b: t("chWhenToYB", { x: $(price("year")) }), go: t("chGoY", { date: d(s.currentPeriodEnd) }) },
      month: { t: t("chWhenToM", { date: d(s.currentPeriodEnd) }), b: t("chWhenToMB", { x: $(price("month")) }), go: t("chGoM", { date: d(s.currentPeriodEnd) }) },
    };
    return { opts, when };
  })() : null;

  return {
    live, plan, notice, pending, method, receipts, refund, change, period: (s?.pendingPeriod ?? s?.period ?? "month") as Period,
    countryLine: t("countryLine", { country: countryName(v.country, locale), provider: provName(s?.provider ?? v.provider) }),
    canCancel: !!s && (s.status === "active" || s.status === "grace"),
    endDate: d(s?.currentPeriodEnd),
  };
}

