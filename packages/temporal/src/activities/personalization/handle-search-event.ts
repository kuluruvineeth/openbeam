import db from "@openplane/db";
import { updateQueryEmbedding } from "@openplane/services/personalization/embeddings";
import type { HandleSearchEventInput, HandleSearchEventOutput } from "./types";

export async function handleSearchEvent(
  input: HandleSearchEventInput
): Promise<HandleSearchEventOutput> {
  const { userId, teamId, event } = input;

  await updateQueryEmbedding(
    { db, userId, teamId },
    event.queryEmbedding,
    event.query
  );

  return { success: true };
}
