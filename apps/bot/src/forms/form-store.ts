import { getRedisClient } from "@openbeam/redis";
import type { BotPlatform, FormField, FormState } from "@openbeam/types/bot";
import { FormStateSchema } from "@openbeam/types/bot";

const TTL_SECONDS = 1800;

function stateKey(platform: BotPlatform, conversationKey: string): string {
  return `bot:form:${platform}:${conversationKey}`;
}

function fieldsKey(platform: BotPlatform, conversationKey: string): string {
  return `bot:form:fields:${platform}:${conversationKey}`;
}

interface FormSession {
  state: FormState;
  fields: FormField[];
}

export async function getFormSession(
  platform: BotPlatform,
  conversationKey: string
): Promise<FormSession | null> {
  const redis = await getRedisClient();
  const [rawState, rawFields] = await Promise.all([
    redis.get(stateKey(platform, conversationKey)),
    redis.get(fieldsKey(platform, conversationKey)),
  ]);

  if (!(rawState && rawFields)) {
    return null;
  }

  const parsed = FormStateSchema.safeParse(JSON.parse(rawState));
  if (!parsed.success) {
    return null;
  }

  return {
    state: parsed.data,
    fields: JSON.parse(rawFields) as FormField[],
  };
}

export async function setFormState(
  state: FormState,
  fields?: FormField[]
): Promise<void> {
  const redis = await getRedisClient();
  const updated = { ...state, updatedAt: Date.now() };
  const sk = stateKey(state.platform, state.conversationKey);

  await redis.set(sk, JSON.stringify(updated), { EX: TTL_SECONDS });

  if (fields) {
    const fk = fieldsKey(state.platform, state.conversationKey);
    await redis.set(fk, JSON.stringify(fields), { EX: TTL_SECONDS });
  }
}

export async function clearFormState(
  platform: BotPlatform,
  conversationKey: string
): Promise<void> {
  const redis = await getRedisClient();
  await Promise.all([
    redis.del(stateKey(platform, conversationKey)),
    redis.del(fieldsKey(platform, conversationKey)),
  ]);
}

export async function hasActiveForm(
  platform: BotPlatform,
  conversationKey: string
): Promise<boolean> {
  const redis = await getRedisClient();
  const exists = await redis.exists(stateKey(platform, conversationKey));
  return exists === 1;
}
