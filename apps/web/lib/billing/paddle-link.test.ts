import { describe, expect, it } from "vitest";
import { paddleLinkLocale, paddleLinkStep } from "./paddle-link";

const TXN = "txn_01hv8xyzabcdefghij";
const q = (s = "") => new URLSearchParams(s);

describe("Paddle links in the learner's own language", () => {
  it("moves an Arabic learner from the English link to Arabic, and leaves a match alone", () => {
    expect(paddleLinkLocale("en", "ar", null)).toBe("ar");
    expect(paddleLinkLocale("en", "en", "ar")).toBeNull(); // the profile wins over the cookie
    expect(paddleLinkLocale("ar", "ar", null)).toBeNull();
  });
  it("uses the last language choice when the profile has none, and ignores anything else", () => {
    expect(paddleLinkLocale("en", null, "ar")).toBe("ar");
    expect(paddleLinkLocale("en", "fr", "de")).toBeNull();
    expect(paddleLinkLocale("en", undefined, undefined)).toBeNull();
  });
});

describe("Paddle links across sign-in", () => {
  it("signed out on a link: keep the transaction and go to sign-in in the link's language", () => {
    expect(paddleLinkStep("/en/app/checkout", q(`_ptxn=${TXN}`), false, null)).toEqual({ kind: "signin", to: "/en/signin", txn: TXN });
    expect(paddleLinkStep("/ar/app/checkout/", q(`_ptxn=${TXN}`), false, null)).toEqual({ kind: "signin", to: "/ar/signin", txn: TXN });
  });
  it("after signing in, the app home opens the link again with _ptxn", () => {
    expect(paddleLinkStep("/en/app", q(), true, TXN)).toEqual({ kind: "resume", to: `/en/app/checkout?_ptxn=${TXN}` });
    expect(paddleLinkStep("/ar/app/", q(), true, TXN)).toEqual({ kind: "resume", to: `/ar/app/checkout?_ptxn=${TXN}` });
  });
  it("on the link while signed in, a kept transaction is forgotten", () => {
    expect(paddleLinkStep("/en/app/checkout", q(`_ptxn=${TXN}`), true, TXN)).toEqual({ kind: "clear" });
    expect(paddleLinkStep("/en/app/checkout", q(`_ptxn=${TXN}`), true, null)).toBeNull();
  });
  it("does nothing for other pages, a normal checkout, a bad id or a signed-out home", () => {
    expect(paddleLinkStep("/en/app/checkout", q("period=year"), false, null)).toBeNull();
    expect(paddleLinkStep("/en/app/checkout", q("_ptxn=../../evil"), false, null)).toBeNull();
    expect(paddleLinkStep("/en/app", q(), true, "javascript:alert(1)")).toBeNull();
    expect(paddleLinkStep("/en/app", q(), false, TXN)).toBeNull();
    expect(paddleLinkStep("/en/app/plans", q(), true, TXN)).toBeNull();
  });
});
