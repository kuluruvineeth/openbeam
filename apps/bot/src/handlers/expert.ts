import db, { getExpertsForTopic, searchEntities } from "@openbeam/db";
import type { BotResponse, UnifiedMessage } from "@openbeam/types/bot";
import type { ResolvedIdentity } from "../identity/resolver";
import { stripCommandPrefix } from "./utils";

export async function handleExpert(
  message: UnifiedMessage,
  identity: ResolvedIdentity
): Promise<BotResponse> {
  const topic = extractTopic(message.text, message.command);

  if (topic.length < 2) {
    return {
      type: "error",
      text: "Please specify a topic to find experts for.",
    };
  }

  const entities = await searchEntities(db, {
    teamId: identity.teamId,
    query: topic,
    type: "TOPIC",
    limit: 1,
  });

  const topicEntity = entities?.[0];
  if (!topicEntity) {
    return {
      type: "text",
      text: `No experts found for "${topic}".`,
    };
  }

  const experts = await getExpertsForTopic(db, topicEntity.id, 5);

  if (!experts || experts.length === 0) {
    return {
      type: "text",
      text: `No experts found for "${topic}".`,
    };
  }

  return {
    type: "expert_list",
    text: `Found ${experts.length} experts on "${topic}"`,
    title: `Experts: ${topic}`,
    experts: experts.map((e) => {
      const entity = e.fromEntity;
      const meta = (entity?.metadata ?? {}) as Record<string, unknown>;
      return {
        name: entity?.name ?? "Unknown",
        email: typeof meta.email === "string" ? meta.email : undefined,
        expertise: [topic],
        documentCount: entity?.documentCount ?? 0,
      };
    }),
  };
}

function extractTopic(text: string, command?: string): string {
  return stripCommandPrefix(text, command === "expert" ? command : undefined);
}
