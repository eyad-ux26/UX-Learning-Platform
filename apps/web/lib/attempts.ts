import type { TryEvent } from "@uxgate/player/engine";
import { queuePut } from "./idb";

export type QueuedAttempt = {
  /** Whose answer this is. A device can be shared, so only the signed-in learner's items are sent. */
  userId?: string;
  /** Idempotency key: attempt + step + try + kind. The server ignores duplicates. */
  key: string;
  attemptId: string;
  event: TryEvent;
  /** Mastery round: the bank steps this play asks. */
  plan?: string[];
  /** A review session on a bank, not its mastery round. */
  purpose?: "review";
  queuedAt: number;
  sentAt?: number;
};

export const attemptIdFor = (lessonId: string, startedAt: number) => `${lessonId}@${startedAt}`;
export const keyFor = (attemptId: string, e: TryEvent) => `${attemptId}:${e.stepId}:${e.tryNo}:${e.kind}`;

/** Writes the answer to IndexedDB first. Sending to the server happens separately and retries. */
export async function enqueueAttempt(
  userId: string,
  attemptId: string,
  event: TryEvent,
  plan?: string[],
  purpose?: "review",
) {
  const item: QueuedAttempt = {
    key: keyFor(attemptId, event),
    userId,
    attemptId,
    event,
    ...(plan ? { plan } : {}),
    ...(purpose ? { purpose } : {}),
    queuedAt: Date.now(),
  };
  await queuePut(item);
  return item;
}
