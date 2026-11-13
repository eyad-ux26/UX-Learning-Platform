// UXGate Pro prices, regions and discounts (prices approved by Eyad on 2 November 2026). Pure: the server prices every
// checkout with these functions, and the screens show the same numbers. Amounts are in minor units (piasters, cents).

export type Region = "eg" | "gulf" | "arab" | "world";
export type Period = "month" | "year";
export type Provider = "paymob" | "paddle";
export type DiscountKind = "student" | "welcome_back" | "founding";

export const PRICES: Record<Region, { currency: "EGP" | "USD"; month: number; year: number }> = {
  eg: { currency: "EGP", month: 24900, year: 224900 },
  gulf: { currency: "USD", month: 800, year: 7200 },
  arab: { currency: "USD", month: 500, year: 4500 },
  // Not set by the pricing doc: countries outside the Arab world pay the Gulf price until admins set one.
  world: { currency: "USD", month: 800, year: 7200 },
};

/** Gulf Cooperation Council countries, plus Iraq (priced with the Gulf from 9 November 2026). */
export const GULF = ["SA", "AE", "KW", "QA", "BH", "OM", "IQ"];
/** Other Arab League countries (Egypt has its own region). */
export const ARAB = ["JO", "LB", "SY", "PS", "YE", "SD", "LY", "TN", "DZ", "MA", "MR", "SO", "DJ", "KM"];
/** Countries offered in the billing country list, in this order. */
export const COUNTRIES = ["EG", ...GULF, ...ARAB];

/**
 * The country used when the request's country is not known (no CF-IPCountry, or Cloudflare's XX / T1). "ZZ" is
 * "Unknown Region" in every locale's country names. It prices at the world rate, never at Egypt's (the cheapest).
 */
export const UNKNOWN_COUNTRY = "ZZ";

/**
 * The country a checkout is priced for. `intl` is "Pay with an international card", offered after Paymob refuses a
 * card issued outside Egypt: it prices at the world rate in USD through Paddle, whatever the request's country.
 */
export const priceCountry = (ip: string | null, intl = false): string =>
  intl ? UNKNOWN_COUNTRY : (ip ?? UNKNOWN_COUNTRY);

/** Check and pay with an international card (Paddle, world price), same plan and code. Relative to /{locale}. */
export const intlCheckoutPath = (period: Period, code?: string | null): string =>
  `/app/checkout?period=${period}&intl=1${code ? `&code=${encodeURIComponent(code)}` : ""}`;

export function regionFor(country: string | null | undefined): Region {
  const c = (country ?? "").toUpperCase();
  if (c === "EG") return "eg";
  if (GULF.includes(c)) return "gulf";
  if (ARAB.includes(c)) return "arab";
  return "world";
}

/** Egypt pays through Paymob in Egyptian pounds; every other country through Paddle. */
export const providerFor = (region: Region): Provider => (region === "eg" ? "paymob" : "paddle");

export const DISCOUNTS: Record<DiscountKind, { percent: number; periods: Period[]; years: number | null }> = {
  student: { percent: 40, periods: ["month", "year"], years: null }, // while the student check is valid
  welcome_back: { percent: 40, periods: ["year"], years: 2 }, // annual only, for 2 years
  founding: { percent: 30, periods: ["year"], years: 1 }, // annual only, the first year
};

/** A price with a percentage off. Egyptian pounds round down to a whole pound; dollars to the cent. */
export function discounted(amountMinor: number, percent: number, currency: string): number {
  const exact = (amountMinor * (100 - percent)) / 100;
  return currency === "EGP" ? Math.floor(exact / 100) * 100 : Math.round(exact);
}

/** About how much the annual plan is per month (shown under its price). */
export function perMonth(region: Region): number {
  const p = PRICES[region];
  return p.currency === "EGP" ? Math.round(p.year / 12 / 100) * 100 : Math.round(p.year / 12);
}

/** What a year on the annual plan saves against 12 monthly payments. */
export const yearlySaving = (region: Region): number => PRICES[region].month * 12 - PRICES[region].year;

export type Eligibility = {
  /** The student check passed and is still valid. */
  student: boolean;
  /** Pro ended 60 or more days ago (and the learner is not on Pro now). */
  welcomeBack: boolean;
  /** A valid code the learner entered. */
  code: { code: string; kind: "founding"; percent: number; period: Period | null } | null;
};

export type Quote = {
  region: Region;
  provider: Provider;
  period: Period;
  currency: "EGP" | "USD";
  /** Full price for this period. */
  base: number;
  /** What is charged today. */
  amount: number;
  /** What the next renewal costs (founding: full price again; welcome back and student: still discounted). */
  renewAmount: number;
  discount: DiscountKind | null;
  percent: number;
  code: string | null;
  /** How many years the discount lasts (null: while eligible). */
  discountYears: number | null;
};

/**
 * Prices one checkout. One discount per account: discounts never add up, and the biggest one the learner can use
 * for this period wins. Welcome back applies by itself; founding needs its code; student needs the check.
 */
export function quote(region: Region, period: Period, e: Eligibility): Quote {
  const p = PRICES[region];
  const base = p[period];
  const options: { kind: DiscountKind; percent: number; code: string | null }[] = [];
  if (e.student && DISCOUNTS.student.periods.includes(period))
    options.push({ kind: "student", percent: DISCOUNTS.student.percent, code: null });
  if (e.welcomeBack && DISCOUNTS.welcome_back.periods.includes(period))
    options.push({ kind: "welcome_back", percent: DISCOUNTS.welcome_back.percent, code: null });
  if (e.code && (e.code.period === null || e.code.period === period))
    options.push({ kind: e.code.kind, percent: e.code.percent, code: e.code.code });
  // Highest percent first; on a tie the one with no code (it lasts longer) wins.
  const best = options.sort((a, b) => b.percent - a.percent || (a.code ? 1 : 0) - (b.code ? 1 : 0))[0] ?? null;
  const amount = best ? discounted(base, best.percent, p.currency) : base;
  const renewAmount = !best || best.kind === "founding" ? base : amount;
  return {
    region,
    provider: providerFor(region),
    period,
    currency: p.currency,
    base,
    amount,
    renewAmount,
    discount: best?.kind ?? null,
    percent: best?.percent ?? 0,
    code: best?.code ?? null,
    discountYears: best ? DISCOUNTS[best.kind].years : null,
  };
}

/** When a discount stops applying to renewals (null: no end date, or no discount). */
export function discountUntil(q: Pick<Quote, "discount" | "discountYears">, start: Date): Date | null {
  if (!q.discount || q.discountYears === null) return null;
  const d = new Date(start);
  d.setUTCFullYear(d.getUTCFullYear() + q.discountYears);
  return d;
}

/** Adds one billing period. Month ends stay sensible: 31 Jan + 1 month = 28/29 Feb. */
export function addPeriod(start: Date, period: Period, n = 1): Date {
  const d = new Date(start);
  const day = d.getUTCDate();
  if (period === "year") d.setUTCFullYear(d.getUTCFullYear() + n, d.getUTCMonth(), 1);
  else d.setUTCMonth(d.getUTCMonth() + n, 1);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
}

/** Formats an amount for a screen or email: "249 EGP" / "249 ج.م" / "$8" / "$4.80". */
export function formatMoney(amountMinor: number, currency: string, locale: "en" | "ar"): string {
  const major = amountMinor / 100;
  if (currency === "EGP") {
    const s = Math.round(major).toLocaleString("en-US");
    return locale === "ar" ? `${s} ج.م` : `${s} EGP`;
  }
  // Dollars are written the same way in both languages (the screens show them left to right).
  return `$${Number.isInteger(major) ? String(major) : major.toFixed(2)}`;
}

/** Dollar amounts read left to right in Arabic too ("$8"); pounds follow the page direction ("249 ج.م"). */
export const moneyCls = (currency: string): string | undefined => (currency === "USD" ? "ltr" : undefined);
