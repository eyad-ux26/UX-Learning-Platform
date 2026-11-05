// Every provider webhook is verified, then turned into one of these events. The server applies them the same way
// whichever provider sent them, so the rest of the app never needs to know about Paymob or Paddle.
import type { BillingProvider, Card } from "./subscription";

type Base = { provider: BillingProvider; eventId: string; at: string };

export type BillingEvent =
  /** Money was taken. `sessionId` ties a first payment to our checkout; `recurring` is a renewal of a plan. */
  | (Base & { type: "paid"; paymentId: string; sessionId: string | null; providerSubId: string | null; userId: string | null; amountMinor: number; currency: string; recurring: boolean; periodStart: string | null; periodEnd: string | null; card: Card | null })
  /** The payer still has to approve (a wallet), or a bank is confirming. */
  | (Base & { type: "pending"; sessionId: string })
  /** A charge was declined. */
  | (Base & { type: "failed"; sessionId: string | null; providerSubId: string | null; recurring: boolean })
  /** Money went back to the payer for this charge. */
  | (Base & { type: "refunded"; paymentId: string })
  /** Paddle: the plan will not renew (cancelled in Paddle, or by our own cancel call). */
  | (Base & { type: "cancel_scheduled"; providerSubId: string; effectiveAt: string | null })
  /** Paddle: a scheduled cancel was removed. */
  | (Base & { type: "resumed"; providerSubId: string })
  /** Paddle: the subscription ended or was paused after dunning. */
  | (Base & { type: "ended"; providerSubId: string })
  /** Paddle: a renewal failed and Paddle is retrying. */
  | (Base & { type: "past_due"; providerSubId: string })
  /** Paddle: links its subscription id to our checkout. */
  | (Base & { type: "sub_created"; providerSubId: string; sessionId: string | null; userId: string | null; periodEnd: string | null })
  /** Paymob: a saved card token for renewals. */
  | (Base & { type: "token"; orderRef: string | null; token: string; card: Card })
  /** A verified event we do not act on. */
  | (Base & { type: "ignored"; eventType: string });

export type Verified = { ok: true; events: BillingEvent[]; eventType: string; eventId: string } | { ok: false; reason: "signature" | "payload" };
