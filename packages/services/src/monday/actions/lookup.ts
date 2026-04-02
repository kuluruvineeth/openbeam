import type { MondayClient } from "../client";

interface LookupResult {
  success: boolean;
  items?: Array<{ id: string; name: string }>;
  error?: string;
}

const LIST_BOARDS_QUERY = `
  query ListBoards($limit: Int!) {
    boards(limit: $limit) {
      id
      name
    }
  }
`;

const LIST_GROUPS_QUERY = `
  query ListGroups($boardId: [ID!]!) {
    boards(ids: $boardId) {
      groups {
        id
        title
      }
    }
  }
`;

export async function listBoards(
  client: MondayClient,
  params: { limit?: number }
): Promise<LookupResult> {
  try {
    const data = await client.query<{
      boards: Array<{ id: string; name: string }>;
    }>(LIST_BOARDS_QUERY, { limit: params.limit ?? 50 });

    return {
      success: true,
      items: data.boards.map((b) => ({ id: b.id, name: b.name })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list boards",
    };
  }
}

export async function listGroups(
  client: MondayClient,
  params: { boardId: string }
): Promise<LookupResult> {
  try {
    const data = await client.query<{
      boards: Array<{ groups: Array<{ id: string; title: string }> }>;
    }>(LIST_GROUPS_QUERY, { boardId: params.boardId });

    const groups = data.boards[0]?.groups ?? [];

    return {
      success: true,
      items: groups.map((g) => ({ id: g.id, name: g.title })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list groups",
    };
  }
}
