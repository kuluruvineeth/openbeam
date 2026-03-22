import type { ZoomClient } from "../client";

export type CreateMeetingParams = {
  userId: string;
  topic: string;
  type?: number;
  start_time?: string;
  duration?: number;
  timezone?: string;
  agenda?: string;
};

export type MeetingActionResult = {
  success: boolean;
  meetingId?: number;
  joinUrl?: string;
  error?: string;
};

type ZoomMeetingResponse = {
  id: number;
  join_url: string;
  topic: string;
};

export async function createZoomMeeting(
  client: ZoomClient,
  params: CreateMeetingParams
): Promise<MeetingActionResult> {
  try {
    const result = await client.post<ZoomMeetingResponse>(
      `/users/${params.userId}/meetings`,
      {
        topic: params.topic,
        type: params.type ?? 2,
        start_time: params.start_time,
        duration: params.duration,
        timezone: params.timezone,
        agenda: params.agenda,
      }
    );

    return {
      success: true,
      meetingId: result.id,
      joinUrl: result.join_url,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create meeting",
    };
  }
}

export type UpdateMeetingParams = {
  meetingId: number;
  topic?: string;
  start_time?: string;
  duration?: number;
  timezone?: string;
  agenda?: string;
};

export async function updateZoomMeeting(
  client: ZoomClient,
  params: UpdateMeetingParams
): Promise<MeetingActionResult> {
  try {
    await client.patch(`/meetings/${params.meetingId}`, {
      topic: params.topic,
      start_time: params.start_time,
      duration: params.duration,
      timezone: params.timezone,
      agenda: params.agenda,
    });

    return {
      success: true,
      meetingId: params.meetingId,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update meeting",
    };
  }
}

export async function deleteZoomMeeting(
  client: ZoomClient,
  meetingId: number
): Promise<MeetingActionResult> {
  try {
    await client.del(`/meetings/${meetingId}`);

    return { success: true, meetingId };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete meeting",
    };
  }
}
