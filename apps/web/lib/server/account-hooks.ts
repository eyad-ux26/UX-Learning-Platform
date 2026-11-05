// Hooks other slices fill in at merge time, so this slice does not import modules that do not exist yet.

/** Called right after a learner asks to delete their account. Slice 5 stops subscription renewal here. */
export async function onAccountDeletionScheduled(userId: string): Promise<void> {
  void userId;
}
