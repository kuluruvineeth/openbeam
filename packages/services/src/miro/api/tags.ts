import type { MiroClient } from "../client";

export type MiroTag = {
  id: string;
  title: string;
  fillColor: string;
};

type MiroTagsResponse = {
  data: MiroTag[];
  total: number;
  size: number;
  offset: number;
  limit: number;
};

export async function listBoardTags(
  client: MiroClient,
  boardId: string
): Promise<MiroTag[]> {
  const response = await client.get<MiroTagsResponse>(
    `/boards/${boardId}/tags`,
    { limit: "50" }
  );
  return response.data ?? [];
}
