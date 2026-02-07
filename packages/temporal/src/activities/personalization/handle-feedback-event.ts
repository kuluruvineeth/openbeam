import db, {
  findUserSearchProfile,
  updateConnectorWeights,
} from "@openplane/db";
import type {
  HandleFeedbackEventInput,
  HandleFeedbackEventOutput,
} from "./types";

const CONNECTOR_TYPE_REGEX = /^([^:]+):/;

function extractConnectorType(docId: string): string | null {
  const match = docId.match(CONNECTOR_TYPE_REGEX);
  return match?.[1] ?? null;
}

export async function handleFeedbackEvent(
  input: HandleFeedbackEventInput
): Promise<HandleFeedbackEventOutput> {
  const { userId, teamId, event } = input;

  const connectorType = extractConnectorType(event.docId);
  if (!connectorType) {
    return { success: true, connectorType: null, newWeight: null };
  }

  const profile = await findUserSearchProfile(db, userId, teamId);
  if (!profile) {
    return { success: true, connectorType, newWeight: null };
  }

  const multiplier = event.feedbackType === "helpful" ? 2 : -1;
  const connectorWeights = { ...profile.connectorWeights };
  const currentWeight = (connectorWeights[connectorType] as number) ?? 0;
  const newWeight = Math.max(0, currentWeight + multiplier);
  connectorWeights[connectorType] = newWeight;

  await updateConnectorWeights(db, userId, teamId, connectorWeights);

  return { success: true, connectorType, newWeight };
}
