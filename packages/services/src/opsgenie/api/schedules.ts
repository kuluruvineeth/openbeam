import type { OpsGenieClient } from "../client";

export interface OpsGenieScheduleRotation {
  id: string;
  name?: string;
  startDate: string;
  endDate?: string;
  type: string;
  length: number;
  participants: {
    id: string;
    type: string;
    username?: string;
  }[];
}

export interface OpsGenieSchedule {
  id: string;
  name: string;
  description?: string;
  timezone?: string;
  enabled: boolean;
  ownerTeam?: {
    id: string;
    name?: string;
  };
  rotations?: OpsGenieScheduleRotation[];
}

export interface OpsGenieOnCallParticipant {
  id: string;
  name: string;
  type: string;
}

interface ScheduleListResponse {
  data: OpsGenieSchedule[];
  expandable?: string[];
}

interface OnCallResponse {
  data: {
    onCallParticipants: OpsGenieOnCallParticipant[];
  };
}

export async function listSchedules(
  client: OpsGenieClient
): Promise<OpsGenieSchedule[]> {
  const response = await client.get<ScheduleListResponse>("/schedules", {
    expand: "rotation",
  });
  return response.data ?? [];
}

export async function getOnCallParticipants(
  client: OpsGenieClient,
  scheduleId: string
): Promise<OpsGenieOnCallParticipant[]> {
  try {
    const response = await client.get<OnCallResponse>(
      `/schedules/${scheduleId}/on-calls`,
      { flat: "true" }
    );
    return response.data?.onCallParticipants ?? [];
  } catch {
    return [];
  }
}
