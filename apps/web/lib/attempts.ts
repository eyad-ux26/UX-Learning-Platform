import type { TryEvent } from "@uxgate/player/engine";
import { queuePut } from "./idb";

export type QueuedAttempt = {
  /** Idempotency key: attempt + step + try + kind. The server ignores duplicates. */
  key: string;
  attemptId: string;
  event: TryEvent;
  queuedAt: number;
  sentAt?: number;
};

export const attemptIdFor = (lessonId: string, startedAt: number) => `${lessonId}@${startedAt}`;
export const keyFor = (attemptId: string, e: TryEvent) => `${attemptId}:${e.stepId}:${e.tryNo}:${e.kind}`;

/** Writes the answer to IndexedDB first. Sending to the server happens separately and retries. */
export async function enqueueAttempt(attemptId: string, event: TryEvent) {
  const item: QueuedAttempt = { key: keyFor(attemptId, event), attemptId, event, queuedAt: Date.now() };
  await queuePut(item);
  return item;
}
