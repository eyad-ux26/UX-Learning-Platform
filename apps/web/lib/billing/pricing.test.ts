import { describe, expect, it } from "vitest";
import { addPeriod, discountUntil, formatMoney, perMonth, providerFor, quote, regionFor, yearlySaving, type Eligibility } from "./pricing";

const none: Eligibility = { student: false, welcomeBack: false, code: null };
const founding = { code: "FOUNDING", kind: "founding" as const, percent: 30, period: "year" as const };
const amounts = (r: Parameters<typeof quote>[0], p: Parameters<typeof quote>[1], e: Eligibility) => {
  const q = quote(r, p, e);
  return [q.amount, q.renewAmount, q.discount];
};

describe("regions and providers", () => {
  it("Egypt goes to Paymob, every other country to Paddle", () => {
    expect(providerFor(regionFor("EG"))).toBe("paymob");
    for (const c of ["SA", "AE", "JO", "MA", "US", "DE", "", null]) expect(providerFor(regionFor(c))).toBe("paddle");
  });
  it("Gulf, other Arab countries and the rest of the world", () => {
    expect(["SA", "AE", "KW", "QA", "BH", "OM", "IQ"].map(regionFor)).toEqual(Array(7).fill("gulf")); // Iraq is priced with the Gulf
    expect(["JO", "LB", "MA", "TN", "SY"].map(regionFor)).toEqual(Array(5).fill("arab"));
    expect(regionFor("fr")).toBe("world");
  });
});

describe("prices match the approved table", () => {
  it("full prices", () => {
    expect([quote("eg", "month", none).amount, quote("eg", "year", none).amount]).toEqual([24900, 224900]);
    expect([quote("gulf", "month", none).amount, quote("gulf", "year", none).amount]).toEqual([800, 7200]);
    expect([quote("arab", "month", none).amount, quote("arab", "year", none).amount]).toEqual([500, 4500]);
  });
  it("annual per month and the saving", () => {
    expect([perMonth("eg"), perMonth("gulf"), perMonth("arab")]).toEqual([18700, 600, 375]);
    expect([yearlySaving("eg"), yearlySaving("gulf"), yearlySaving("arab")]).toEqual([73900, 2400, 1500]);
  });
  it("student 40% on both plans, every renewal", () => {
    const st = { ...none, student: true };
    expect(amounts("eg", "month", st)).toEqual([14900, 14900, "student"]);
    expect(amounts("eg", "year", st)).toEqual([134900, 134900, "student"]);
    expect(amounts("gulf", "month", st)).toEqual([480, 480, "student"]);
    expect(amounts("gulf", "year", st)).toEqual([4320, 4320, "student"]);
    expect(amounts("arab", "month", st)).toEqual([300, 300, "student"]);
    expect(amounts("arab", "year", st)).toEqual([2700, 2700, "student"]);
  });
  it("founding member: 30% on annual, first year only", () => {
    const f = { ...none, code: founding };
    expect(amounts("eg", "year", f)).toEqual([157400, 224900, "founding"]);
    expect(amounts("gulf", "year", f)).toEqual([5040, 7200, "founding"]);
    expect(amounts("arab", "year", f)).toEqual([3150, 4500, "founding"]);
    expect(amounts("eg", "month", f)).toEqual([24900, 24900, null]); // annual only
  });
  it("welcome back: 40% on annual for 2 years, applied by itself", () => {
    const w = { ...none, welcomeBack: true };
    expect(amounts("eg", "year", w)).toEqual([134900, 134900, "welcome_back"]);
    expect(amounts("gulf", "year", w)).toEqual([4320, 4320, "welcome_back"]);
    expect(amounts("arab", "year", w)).toEqual([2700, 2700, "welcome_back"]);
    expect(amounts("eg", "month", w)).toEqual([24900, 24900, null]);
    const q = quote("eg", "year", w);
    expect(discountUntil(q, new Date("2026-11-03T00:00:00Z"))?.toISOString()).toBe("2028-11-03T00:00:00.000Z");
  });
});

describe("one discount per account, never added up", () => {
  it("the biggest one wins and the others are dropped", () => {
    const all = { student: true, welcomeBack: true, code: founding };
    const q = quote("eg", "year", all);
    expect(q.percent).toBe(40);
    expect(q.amount).toBe(134900); // not 2249 × 0.6 × 0.7
    expect(q.code).toBeNull();
  });
  it("on a tie the discount without a code wins (it lasts longer)", () => {
    expect(quote("gulf", "year", { student: true, welcomeBack: true, code: null }).discount).toBe("student");
  });
  it("a code beats nothing", () => {
    expect(quote("eg", "year", { ...none, code: founding }).code).toBe("FOUNDING");
  });
});

describe("dates and money", () => {
  it("a month after 31 January is the end of February", () => {
    expect(addPeriod(new Date("2027-01-31T10:00:00Z"), "month").toISOString()).toBe("2027-02-28T10:00:00.000Z");
    expect(addPeriod(new Date("2026-11-03T10:00:00Z"), "month").toISOString()).toBe("2026-12-03T10:00:00.000Z");
    expect(addPeriod(new Date("2028-02-29T10:00:00Z"), "year").toISOString()).toBe("2029-02-28T10:00:00.000Z");
  });
  it("formats like the design", () => {
    expect(formatMoney(224900, "EGP", "en")).toBe("2,249 EGP");
    expect(formatMoney(24900, "EGP", "ar")).toBe("249 ج.م");
    expect(formatMoney(480, "USD", "en")).toBe("$4.80");
    expect(formatMoney(800, "USD", "ar")).toBe("$8");
  });
});

describe("an unknown request country", () => {
  it("prices at the world rate through Paddle, never at Egypt's", async () => {
    const { UNKNOWN_COUNTRY } = await import("./pricing");
    expect(regionFor(UNKNOWN_COUNTRY)).toBe("world");
    expect(providerFor(regionFor(UNKNOWN_COUNTRY))).toBe("paddle");
  });
});

describe("pay with an international card (after Paymob refuses a foreign card)", () => {
  it("prices at the world rate in USD through Paddle, whatever the request's country, and keeps the code", async () => {
    const { priceCountry, intlCheckoutPath } = await import("./pricing");
    expect(priceCountry("EG", true)).toBe("ZZ");
    expect(priceCountry("EG")).toBe("EG");
    expect(priceCountry(null)).toBe("ZZ");
    const region = regionFor(priceCountry("EG", true));
    expect(providerFor(region)).toBe("paddle");
    expect(quote(region, "year", { student: false, welcomeBack: false, code: null })).toMatchObject({ currency: "USD", amount: 7200 });
    expect(quote(region, "year", { student: false, welcomeBack: false, code: { code: "FOUNDING", kind: "founding", percent: 30, period: "year" } }).amount).toBeLessThan(7200);
    expect(intlCheckoutPath("month", "FOUNDING")).toBe("/app/checkout?period=month&intl=1&code=FOUNDING");
    expect(intlCheckoutPath("year", null)).toBe("/app/checkout?period=year&intl=1");
  });
});
