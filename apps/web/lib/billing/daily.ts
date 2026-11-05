// The daily billing job (Cloudflare Cron, 02:00 UTC): renew Paymob plans with the saved card, retry failed renewals
// on day 2 and day 5, pause Pro when the 7-day grace ends, end cancelled plans at their date, move wallet payers who
// have not paid into the grace period, and send the annual and wallet reminders.
import { applyEvent, failRenewal, syncEntitlement, type Engine } from "./engine";
import type { BillingEvent } from "./events";
import { remindersDue, renewalDue, settle, walletLate, type Sub } from "./subscription";

/** Charges a plan's saved card for its renewal. Returns the provider's answer as an event, or null when nothing could be tried (no saved card). */
export type Charger = (sub: Sub, attempt: number) => Promise<BillingEvent | null>;

export type DailyResult = { renewed: number; failed: number; settled: number; reminders: number; errors: string[] };

/**
 * `includeMock`: test-mode plans (bought on the test payment page of a preview host) are left alone unless the job
 * runs where test payments are on. Production never renews, charges or emails them.
 */
export async function runDaily(e: Engine, charge: Charger, now: string = e.now?.() ?? new Date().toISOString(), opts: { includeMock?: boolean } = {}): Promise<DailyResult> {
  const out: DailyResult = { renewed: 0, failed: 0, settled: 0, reminders: 0, errors: [] };
  const subs = (await e.store.dueSubs(now)).filter((s) => s.provider !== "mock" || opts.includeMock);
  for (const sub of subs) {
    try {
      const settled = settle(sub, now);
      if (settled.status !== sub.status) {
        await e.store.saveSub(settled);
        await syncEntitlement(e, sub.userId);
        out.settled++;
        continue;
      }
      if (walletLate(sub, now)) {
        await failRenewal(e, sub);
        out.failed++;
        continue;
      }
      if (renewalDue(sub, now)) {
        const ev = await charge(sub, sub.status === "grace" ? sub.retries + 1 : 0);
        if (!ev) {
          await failRenewal(e, sub);
          out.failed++;
        } else {
          await applyEvent(e, ev);
          if (ev.type === "paid") out.renewed++;
          else out.failed++;
        }
        continue;
      }
      for (const kind of remindersDue(sub, now)) {
        await e.mail(sub.userId, kind, `${sub.id}:${sub.currentPeriodEnd}`, { sub });
        out.reminders++;
      }
    } catch (err) {
      out.errors.push(`${sub.id}: ${String((err as Error)?.message ?? err)}`);
    }
  }
  return out;
}
