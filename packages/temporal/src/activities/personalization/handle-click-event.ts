import db from "@openplane/db";
import { updateDocEmbedding } from "@openplane/services/personalization/embeddings";
import type { HandleClickEventInput, HandleClickEventOutput } from "./types";

export async function handleClickEvent(
  input: HandleClickEventInput
): Promise<HandleClickEventOutput> {
  const { userId, teamId, event } = input;

  await updateDocEmbedding({ db, userId, teamId }, event.docEmbedding, {
    docId: event.docId,
    connectorType: event.connectorType,
    authorId: event.authorId,
    topicIds: event.topicIds,
    dwellMs: event.dwellMs,
    timestamp: Date.now(),
  });

  return { success: true };
}
