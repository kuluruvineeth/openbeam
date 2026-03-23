import type { GreenhouseClient } from "../client";

export interface AddCandidateNoteResult {
  success: boolean;
  id?: number;
  error?: string;
}

export async function addCandidateNote(
  client: GreenhouseClient,
  candidateId: number,
  body: string,
  userId: number
): Promise<AddCandidateNoteResult> {
  try {
    const result = await client.addCandidateNote(candidateId, body, userId);
    return { success: true, id: result.id };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to add candidate note";
    return { success: false, error: message };
  }
}
