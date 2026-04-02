import type { LinearClient } from "../client";

interface TeamsResult {
  success: boolean;
  teams?: Array<{ id: string; name: string; key: string }>;
  error?: string;
}

export async function listTeams(client: LinearClient): Promise<TeamsResult> {
  try {
    const data = await client.query<{
      teams: {
        nodes: Array<{ id: string; name: string; key: string }>;
      };
    }>("query { teams { nodes { id name key } } }");

    return { success: true, teams: data.teams.nodes };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list teams",
    };
  }
}
