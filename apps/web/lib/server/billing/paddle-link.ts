import "server-only";
import { paddleTxnOwned } from "@/lib/billing/paddle-link";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceKey } from "@/lib/supabase/env";
import { transactionOwner } from "./paddle-api";

/**
 * True only when the Paddle transaction in a ?_ptxn= link is this learner's (see paddleTxnOwned). Paddle is asked who the
 * transaction belongs to; any error (unknown id, Paddle down, no database) answers no, and the page goes to billing.
 */
export async function ownPaddleTxn(userId: string, transactionId: string): Promise<boolean> {
  if (!hasServiceKey()) return false;
  try {
    const admin = createAdminClient();
    const [txn, acct, subs] = await Promise.all([
      transactionOwner(transactionId),
      admin.from("billing_accounts").select("paddle_customer_id").eq("user_id", userId).maybeSingle(),
      admin.from("subscriptions").select("provider_sub_id").eq("user_id", userId).eq("provider", "paddle").not("provider_sub_id", "is", null),
    ]);
    if (acct.error || subs.error) return false;
    const customerIds = acct.data?.paddle_customer_id ? [acct.data.paddle_customer_id as string] : [];
    const subscriptionIds = (subs.data ?? []).map((r) => r.provider_sub_id as string);
    const ok = paddleTxnOwned(txn, { userId, customerIds, subscriptionIds });
    if (!ok) console.error("billing: Paddle link for another account's transaction", transactionId);
    return ok;
  } catch (err) {
    console.error("billing: Paddle link check failed", transactionId, String((err as Error)?.message ?? err));
    return false;
  }
}
