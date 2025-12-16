import { getRedisClient } from "./client";

const KEY_PREFIX = "digest:scheduler:job:";

function getKey(subscriptionId: string): string {
  return `${KEY_PREFIX}${subscriptionId}`;
}

export async function setDigestSchedulerKey(
  subscriptionId: string,
  schedulerId: string
): Promise<void> {
  const client = await getRedisClient();
  await client.set(getKey(subscriptionId), schedulerId);
}

export async function getDigestSchedulerKey(
  subscriptionId: string
): Promise<string | null> {
  const client = await getRedisClient();
  return client.get(getKey(subscriptionId));
}

export async function deleteDigestSchedulerKey(
  subscriptionId: string
): Promise<void> {
  const client = await getRedisClient();
  await client.del(getKey(subscriptionId));
}

export async function digestSchedulerKeyExists(
  subscriptionId: string
): Promise<boolean> {
  const client = await getRedisClient();
  const result = await client.exists(getKey(subscriptionId));
  return result === 1;
}
