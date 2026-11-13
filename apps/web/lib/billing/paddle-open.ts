// The options for Paddle.Checkout.open (Paddle.js v2), kept apart from the component so they can be tested (#151).

export type PaddleCustomer = { email: string; address?: { countryCode: string } };
export type PaddleOpenOptions = {
  transactionId: string;
  customer?: PaddleCustomer;
  settings: { displayMode: "overlay"; locale: string; successUrl: string; theme: "light" };
};

/**
 * Paddle.js refuses a `customer` without an id or an email ("customer ID or email is required"), and the checkout then
 * never opens. So `customer` is sent only with the learner's email, which the server gives only when the transaction has
 * no Paddle customer yet. The billing country rides along with it; otherwise Paddle uses the transaction's customer or asks.
 */
export function paddleOpenOptions(
  p: { transactionId: string; successUrl: string; country: string | null; email?: string | null },
  locale: string,
): PaddleOpenOptions {
  const email = p.email?.trim();
  return {
    transactionId: p.transactionId,
    ...(email ? { customer: { email, ...(p.country ? { address: { countryCode: p.country } } : {}) } } : {}),
    settings: { displayMode: "overlay", locale, successUrl: p.successUrl, theme: "light" },
  };
}
