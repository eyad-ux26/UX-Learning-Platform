import { Confirm } from "@/components/admin/forms";
import { fmtMoney } from "@/lib/admin/format";
import { refundRule, type PaymentRow } from "@/lib/admin/data/refunds";
import { approveRefund, rejectRefund } from "./actions";

/** Approve (or send to approval) and reject buttons for one refund. `blocked` says why a second person is needed. */
export function RefundButtons({ pay, requestId, blocked, fresh, overLimit, canDecide, ar }: {
  pay: PaymentRow; requestId: string | null; blocked: string | null; fresh: boolean; overLimit: boolean; canDecide: boolean; ar: boolean;
}) {
  if (!canDecide || pay.status === "refunded" || pay.refund_sent_at) return null;
  const amount = fmtMoney(pay.amount_minor, pay.currency);
  const rule = refundRule(pay.paid_at);
  const hidden = [{ name: "payment", value: pay.id }, ...(requestId ? [{ name: "request", value: requestId }] : [])];
  const reply = (
    <div className="a-field">
      <label htmlFor={`rf-reply-${pay.id}`}>Reply to the learner (optional{ar ? ", Arabic: their app language" : ""})</label>
      <textarea id={`rf-reply-${pay.id}`} name="reply" className="a-ta" rows={3} maxLength={5000} dir={ar ? "rtl" : "ltr"} lang={ar ? "ar" : "en"} />
      <span className="help">Sent on the ticket from support@uxgate.org. Without it the learner gets the standard email in their language.</span>
    </div>
  );
  return (
    <span className="a-row" style={{ gap: 6 }}>
      {requestId ? (
        <Confirm action={rejectRefund} label="Reject" title={`Reject the ${amount} refund?`} small ghost hidden={[{ name: "request", value: requestId }]}
          effects={[{ icon: "envelope-simple", text: "The learner is told, in their language. Their plan stays as it is." }]}>{reply}</Confirm>
      ) : null}
      <Confirm action={approveRefund} label={blocked ? "Send for approval" : "Refund"} title={blocked ? `Ask a second person to refund ${amount}?` : `Refund ${amount}?`} small danger={!blocked}
        icon="arrow-u-up-left" fresh={blocked ? true : fresh || !(overLimit || !rule.inside)} hidden={hidden}
        sub={rule.text}
        effects={blocked ? [
          { icon: "users", text: `This refund is ${blocked}, so someone with "Refunds without limit" approves it in Approvals.` },
          { icon: "bell", text: "They are reminded after 4 hours." },
        ] : [
          { icon: "arrow-u-up-left", text: `${amount} goes back in full through ${pay.provider === "paddle" ? "Paddle" : pay.provider === "paymob" ? "Paymob" : "the test provider"}.` },
          { icon: "minus-circle", text: "When the provider confirms, the plan ends and Pro stops. Progress and certificates stay." },
          { icon: "envelope-simple", text: "The learner gets the refund email in their language." },
        ]}>{reply}</Confirm>
    </span>
  );
}
