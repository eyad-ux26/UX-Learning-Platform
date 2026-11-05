// Hooks other slices fill in at merge time, so this slice does not import modules that do not exist yet.
import "server-only";
import { cancelPlan } from "@/lib/billing/engine";
import { billingEngine, providerActions } from "@/lib/server/billing";

/**
 * Called right after a learner asks to delete their account. Slice 5: renewal stops (the plan is cancelled, with
 * Paddle too), so nothing is charged again; Pro stays to the end of the paid period, before the account goes.
 * A failure here never blocks the deletion: it is logged for support.
 */
export async function onAccountDeletionScheduled(userId: string): Promise<void> {
  try {
    await cancelPlan(billingEngine(), userId, "account_deleted", providerActions);
  } catch (err) {
    console.error("account deletion: could not stop renewal", userId, err);
  }
}
