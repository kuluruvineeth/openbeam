import type { MicrosoftGraphClient } from "../../microsoft/client";

export interface TeamsTeam {
  id: string;
  displayName: string;
  description?: string;
}

export interface TeamsChannel {
  id: string;
  displayName: string;
  description?: string;
  membershipType?: string;
}

export interface TeamsLookupResult<T> {
  success: boolean;
  data?: T[];
  error?: string;
}

export async function listTeams(
  client: MicrosoftGraphClient
): Promise<TeamsLookupResult<TeamsTeam>> {
  try {
    const result = await client.get<{ value: TeamsTeam[] }>("/me/joinedTeams", {
      $select: "id,displayName,description",
    });

    return { success: true, data: result.value };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list teams",
    };
  }
}

export async function listChannels(
  client: MicrosoftGraphClient,
  teamId: string
): Promise<TeamsLookupResult<TeamsChannel>> {
  try {
    const result = await client.get<{ value: TeamsChannel[] }>(
      `/teams/${teamId}/channels`,
      { $select: "id,displayName,description,membershipType" }
    );

    return { success: true, data: result.value };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list channels",
    };
  }
}
