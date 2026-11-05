import { describe, expect, it } from "vitest";
import { paddleOpenOptions } from "./paddle-open";

const base = { transactionId: "txn_01abcdefghij", successUrl: "https://x.test/en/app/checkout/return?session=s1" };

describe("Paddle.Checkout.open options (#151)", () => {
  it("never sends a customer without an email or id, which Paddle.js refuses", () => {
    const cases = [
      { country: "US", email: null }, { country: "US", email: undefined }, { country: "US", email: "  " }, { country: null, email: null },
      { country: "US", email: "a@b.co" }, { country: null, email: "a@b.co" },
    ];
    for (const c of cases) {
      const o = paddleOpenOptions({ ...base, ...c }, "en");
      if (o.customer) expect(o.customer.email || (o.customer as { id?: string }).id).toBeTruthy();
    }
  });
  it("sends the email with the billing country when the transaction has no customer", () => {
    expect(paddleOpenOptions({ ...base, country: "US", email: "a@b.co" }, "ar")).toEqual({
      transactionId: base.transactionId, customer: { email: "a@b.co", address: { countryCode: "US" } },
      settings: { displayMode: "overlay", locale: "ar", successUrl: base.successUrl, theme: "light" },
    });
    expect(paddleOpenOptions({ ...base, country: null, email: "a@b.co" }, "en").customer).toEqual({ email: "a@b.co" });
  });
  it("leaves the customer out when the transaction already has one (no email from the server)", () => {
    expect(paddleOpenOptions({ ...base, country: "US", email: null }, "en")).not.toHaveProperty("customer");
  });
});
