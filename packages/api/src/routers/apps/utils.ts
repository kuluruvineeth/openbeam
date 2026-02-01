import { TRPCError } from "@trpc/server";

export function validateSyncIntervals(input: {
  fullSyncIntervalMs?: number;
  incrementalSyncIntervalMs?: number;
}): void {
  if (
    input.fullSyncIntervalMs &&
    input.incrementalSyncIntervalMs &&
    input.incrementalSyncIntervalMs >= input.fullSyncIntervalMs
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Incremental sync interval must be less than full sync interval",
    });
  }
}
