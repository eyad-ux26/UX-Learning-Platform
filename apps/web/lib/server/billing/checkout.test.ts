import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { paddleEmail } = await import("./checkout");

describe("Paddle checkout email", () => {
  it("fills the learner's email only when the transaction has no Paddle customer", () => {
    expect(paddleEmail({ customerId: null, ownCustomer: false }, "a@b.co")).toBe("a@b.co");
    expect(paddleEmail({ customerId: "ctm_1", ownCustomer: false }, "a@b.co")).toBeNull();
    // A card update or an overdue charge belongs to the subscription's customer.
    expect(paddleEmail({ customerId: null, ownCustomer: true }, "a@b.co")).toBeNull();
    expect(paddleEmail({ customerId: null, ownCustomer: false }, "")).toBeNull();
  });
});
