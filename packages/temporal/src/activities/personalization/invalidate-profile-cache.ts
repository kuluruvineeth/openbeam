import { getUserProfileCache } from "@openbeam/redis";
import type {
  InvalidateProfileCacheInput,
  InvalidateProfileCacheOutput,
} from "./types";

export async function invalidateProfileCache(
  input: InvalidateProfileCacheInput
): Promise<InvalidateProfileCacheOutput> {
  const { teamId, userId } = input;

  const cache = getUserProfileCache();
  await cache.invalidateProfile(teamId, userId);

  return { success: true };
}
