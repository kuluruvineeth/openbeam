import type { MiroClient } from "../client";

type MiroBoardSummary = {
  id: string;
  name: string;
  viewLink: string;
  description?: string;
};

export type BoardListResult = {
  success: boolean;
  boards?: Array<{ id: string; name: string; viewLink: string }>;
  error?: string;
};

export async function listMiroBoards(
  client: MiroClient
): Promise<BoardListResult> {
  try {
    const result = await client.get<{
      data: MiroBoardSummary[];
    }>("/boards", { limit: "50" });
    return {
      success: true,
      boards: result.data.map((b) => ({
        id: b.id,
        name: b.name,
        viewLink: b.viewLink,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list boards",
    };
  }
}
