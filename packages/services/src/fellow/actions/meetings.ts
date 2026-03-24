import type { FellowClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

interface AddMeetingNoteParams {
  meetingId: string;
  body: string;
}

export async function addMeetingNote(
  client: FellowClient,
  params: AddMeetingNoteParams
): Promise<ActionResult> {
  try {
    const result = await client.post<{
      id: string;
    }>(`/meetings/${params.meetingId}/notes`, {
      body: params.body,
    });

    return {
      success: true,
      id: result.id,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to add meeting note",
    };
  }
}
