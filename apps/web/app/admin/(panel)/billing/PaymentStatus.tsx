import { St } from "@/components/admin/ui";
import type { PaymentRow } from "@/lib/admin/data/refunds";

/** Paid, Processing (refund sent, provider not confirmed yet) or Refunded. Only the provider's webhook makes it Refunded. */
export function PaymentStatus({ p, requested }: { p: Pick<PaymentRow, "status" | "refund_sent_at" | "subscription_id"> & { test?: boolean }; requested?: boolean }) {
  const test = p.test ? <St tone="info">Test</St> : null;
  if (p.status === "refunded") return <span className="a-row" style={{ gap: 4 }}><St tone="bad" icon="arrow-u-up-left">Refunded</St>{test}</span>;
  if (p.refund_sent_at) return <span className="a-row" style={{ gap: 4 }}><St tone="wait">Refund processing</St>{test}</span>;
  if (!p.subscription_id) return <span className="a-row" style={{ gap: 4 }}><St tone="wait" icon="warning">Bought nothing</St>{test}</span>;
  return <span className="a-row" style={{ gap: 4 }}><St tone="good">Paid</St>{requested ? <St tone="info" icon="arrow-u-up-left">Refund requested</St> : null}{test}</span>;
}

/** A chip for subscriptions and other rows made with test money (the test provider, Paddle's sandbox). */
export const TestChip = ({ test }: { test?: boolean }) => (test ? <St tone="info">Test</St> : null);

export const providerName = (p: string) => (p === "paddle" ? "Paddle" : p === "paymob" ? "Paymob" : "Test provider");
