import { describe, expect, it } from "vitest";
import { isStudentEmail } from "./student";
import { cardExpiresBefore, entitlementFor, isPro, refundWindow, startSub, type Entitlement } from "./subscription";
import { renderEmail, type EmailKind } from "./emails";
import type { Payment, RefundRequest } from "./engine";

describe("Pro granted by admins (source 'manual')", () => {
  const now = "2026-11-05T09:00:00Z";
  const manual: Entitlement = { plan: "pro", validUntil: "2027-11-05T09:00:00Z", proSince: now, proEndedAt: null, source: "manual" };
  const monthly = (status: "active" | "ended") => ({ ...startSub({ userId: "u", provider: "paymob", region: "eg", country: "EG", period: "month", currency: "EGP", renewAmountMinor: 24900, discount: null, discountUntil: null, at: now }), id: "s1", status, endedAt: status === "ended" ? now : null });
  it("counts on production, with no payment", () => {
    expect(isPro(manual, new Date(now))).toBe(true);
    expect(isPro({ ...manual, validUntil: "2026-11-01T00:00:00Z" }, new Date(now))).toBe(false);
  });
  it("plan events leave it alone while it lasts longer than the plan", () => {
    expect(entitlementFor(null, manual, now)).toEqual(manual);
    expect(entitlementFor(monthly("ended"), manual, now)).toEqual(manual);
    expect(entitlementFor(monthly("active"), manual, now)).toEqual(manual);
  });
  it("a paid plan that runs longer takes over, and an ended grant is Free", () => {
    const short = { ...manual, validUntil: "2026-11-10T09:00:00Z" };
    expect(entitlementFor(monthly("active"), short, now)).toMatchObject({ plan: "pro", source: "live" });
    expect(entitlementFor(null, { ...manual, validUntil: "2026-11-01T00:00:00Z" }, now)).toMatchObject({ plan: "free" });
  });
});

describe("student email", () => {
  it("accepts university addresses", () => {
    for (const e of ["yasmin.adel@cu.edu.eg", "a@ksu.edu.sa", "b@uaeu.ac.ae", "c@mit.edu", "d@ju.edu.jo", "e@um5.ac.ma", "F@Ox.Ac.Uk"]) expect(isStudentEmail(e), e).toBe(true);
  });
  it("refuses everything else", () => {
    for (const e of ["yasmin.adel@gmail.com", "x@edu.eg", "x@education.com", "x@edu.com", "not-an-email", "x@cu.edu.eg.evil.com"]) expect(isStudentEmail(e), e).toBe(false);
  });
});

describe("refund window (acceptance check 5)", () => {
  const paidAt = "2026-11-03T09:00:00Z";
  it("open for 7 days after a charge", () => {
    expect(refundWindow({ paidAt, status: "paid" }, false, new Date("2026-11-09T23:00:00Z"))).toEqual({ ok: true, until: "2026-11-10T09:00:00.000Z" });
  });
  it("closed after 7 days, after a request, and after a refund", () => {
    expect(refundWindow({ paidAt, status: "paid" }, false, new Date("2026-11-10T09:00:00Z")).reason).toBe("late");
    expect(refundWindow({ paidAt, status: "paid" }, true, new Date("2026-11-04T00:00:00Z")).reason).toBe("asked");
    expect(refundWindow({ paidAt, status: "refunded" }, false, new Date("2026-11-04T00:00:00Z")).reason).toBe("refunded");
  });
});

describe("card expiry notice", () => {
  it("shows when the card's last month is before the next charge", () => {
    expect(cardExpiresBefore("11/26", "2026-12-03T09:00:00Z")).toBe(true);
    expect(cardExpiresBefore("12/26", "2026-12-03T09:00:00Z")).toBe(false);
    expect(cardExpiresBefore(null, "2026-12-03T09:00:00Z")).toBe(false);
  });
});

describe("every billing email renders in both languages", () => {
  const sub = { ...startSub({ userId: "u", provider: "paymob", region: "eg", country: "EG", period: "month", currency: "EGP", renewAmountMinor: 24900, discount: null, discountUntil: null, at: "2026-11-03T09:00:00Z", card: { method: "card", brand: "Visa", last4: "4242" } }), id: "s1", graceUntil: "2026-12-10T09:00:00Z" };
  const payment: Payment = { id: "p1", userId: "u", subscriptionId: "s1", provider: "paymob", providerPaymentId: "501", receiptNo: "UXG-2026-000214", kind: "first", period: "month", amountMinor: 24900, currency: "EGP", status: "paid", payMethod: "card", cardBrand: "Visa", cardLast4: "4242", paidAt: "2026-11-03T09:00:00Z", periodEnd: "2026-12-03T09:00:00Z", refundedAt: null };
  const request: RefundRequest = { id: "r1", userId: "u", paymentId: "p1", amountMinor: 24900, currency: "EGP", reason: "Wrong plan", status: "waiting", createdAt: "2026-11-20T09:00:00Z", answeredAt: null };
  const kinds: EmailKind[] = ["receipt", "renewSoon", "payFailed", "cancelled", "refundYes", "refundNo", "walletDue", "studentLink", "refundAsked", "cardRefused"];
  for (const kind of kinds)
    for (const locale of ["en", "ar"] as const)
      it(`${kind} · ${locale}`, () => {
        const m = renderEmail(kind, { locale, site: "https://uxgate.org", name: "Yasmin", sub, payment, request, extra: { link: "https://uxgate.org/x", email: "y@example.com" } });
        expect(m.subject.length).toBeGreaterThan(5);
        expect(m.html).not.toMatch(/undefined|NaN|Invalid Date/);
        expect(m.text).not.toMatch(/undefined|NaN|Invalid Date/);
      });
  it("matches the design copy", () => {
    expect(renderEmail("receipt", { locale: "en", site: "https://uxgate.org", name: "Yasmin", sub, payment }).text).toContain("Next charge: 249 EGP on 3 Dec 2026");
    expect(renderEmail("receipt", { locale: "en", site: "https://uxgate.org", name: "Yasmin", sub, payment }).text).toContain("ask for a refund until 10 November");
    const refused = renderEmail("cardRefused", { locale: "en", site: "https://uxgate.org", name: "Yasmin", payment: { ...payment, subscriptionId: null } }).text;
    expect(refused).toContain("This price needs a card issued in Egypt");
    expect(refused).toContain("We are sending 249 EGP back to Visa •••• 4242");
    expect(renderEmail("cardRefused", { locale: "ar", site: "https://uxgate.org", name: "ياسمين", payment }).subject).toContain("المبلغ في طريقه إليك");
    expect(renderEmail("refundYes", { locale: "en", site: "https://uxgate.org", name: "Yasmin", payment, extra: { noPlan: "1" } }).text).not.toContain("Pro has ended");
    expect(renderEmail("cancelled", { locale: "ar", site: "https://uxgate.org", name: "ياسمين", sub }).text).toContain("يبقى Pro مفعّلًا حتى 3 ديسمبر 2026");
  });
});

describe("Paddle payment links (?_ptxn=)", () => {
  it("accepts Paddle transaction ids only", async () => {
    const { paddleLinkTxn } = await import("./paddle");
    expect(paddleLinkTxn("txn_01hv8wptq8987qeep44cyrewp9")).toBe("txn_01hv8wptq8987qeep44cyrewp9");
    expect(paddleLinkTxn(["txn_01hv8wptq8987qeep44cyrewp9", "x"])).toBe("txn_01hv8wptq8987qeep44cyrewp9");
    for (const bad of [undefined, null, "", "txn_", "sub_01hv8wptq8987qeep44cyrewp9", "txn_01hv8w/../x", "txn_01hv8wptq8987qeep44cyrewp9\"><script>", "javascript:alert(1)"])
      expect(paddleLinkTxn(bad as string | undefined)).toBeNull();
  });
});
