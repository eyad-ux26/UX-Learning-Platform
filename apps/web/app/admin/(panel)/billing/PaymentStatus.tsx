import { St } from "@/components/admin/ui";
import type { PaymentRow } from "@/lib/admin/data/refunds";

/** Paid, Processing (refund sent, provider not confirmed yet) or Refunded. Only the provider's webhook makes it Refunded. */
export function PaymentStatus({ p, requested }: { p: Pick<PaymentRow, "status" | "refund_sent_at" | "subscription_id">; requested?: boolean }) {
  if (p.status === "refunded") return <St tone="bad" icon="arrow-u-up-left">Refunded</St>;
  if (p.refund_sent_at) return <St tone="wait">Refund processing</St>;
  if (!p.subscription_id) return <St tone="wait" icon="warning">Bought nothing</St>;
  return <span className="a-row" style={{ gap: 4 }}><St tone="good">Paid</St>{requested ? <St tone="info" icon="arrow-u-up-left">Refund requested</St> : null}</span>;
}

export const providerName = (p: string) => (p === "paddle" ? "Paddle" : p === "paymob" ? "Paymob" : "Test provider");
