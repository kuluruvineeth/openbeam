import type { MiroClient } from "../client";

export type MiroBoard = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  modifiedAt: string;
  createdBy: {
    id: string;
    type: string;
    name?: string;
  };
  modifiedBy: {
    id: string;
    type: string;
    name?: string;
  };
  owner: {
    id: string;
    type: string;
    name?: string;
  };
  viewLink: string;
  team: {
    id: string;
    name?: string;
  };
};

type MiroBoardsResponse = {
  data: MiroBoard[];
  total: number;
  size: number;
  offset: number;
  limit: number;
};

export function listAllBoards(
  client: MiroClient,
  params?: Record<string, string>
): AsyncGenerator<MiroBoard[], void, undefined> {
  return client.listAll<MiroBoard>("/boards", params);
}

export function getBoard(
  client: MiroClient,
  boardId: string
): Promise<MiroBoard> {
  return client.get<MiroBoard>(`/boards/${boardId}`);
}

export async function* listBoardsPaginated(
  client: MiroClient,
  params?: Record<string, string>,
  limit = 50
): AsyncGenerator<MiroBoard[], void, undefined> {
  let offset = 0;

  while (true) {
    const response = await client.get<MiroBoardsResponse>("/boards", {
      ...params,
      limit: String(limit),
      offset: String(offset),
    });

    const data = response.data ?? [];
    if (data.length > 0) {
      yield data;
    }

    if (offset + data.length >= response.total || data.length < limit) {
      break;
    }
    offset += limit;
  }
}
