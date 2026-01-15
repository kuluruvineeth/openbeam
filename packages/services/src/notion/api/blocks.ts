import type {
  NotionBlock,
  NotionBlockChildrenResponse,
} from "@openplane/types/services/connectors/notion";
import type { NotionClient } from "../client";

const MAX_BLOCK_DEPTH = 10;

export interface GetBlockChildrenOptions {
  startCursor?: string;
  pageSize?: number;
}

export async function getBlockChildren(
  client: NotionClient,
  blockId: string,
  options: GetBlockChildrenOptions = {}
): Promise<NotionBlockChildrenResponse> {
  const params: Record<string, string | number> = {};

  if (options.startCursor) {
    params.start_cursor = options.startCursor;
  }
  if (options.pageSize) {
    params.page_size = Math.min(options.pageSize, 100);
  }

  return await client.get<NotionBlockChildrenResponse>(
    `/blocks/${blockId}/children`,
    params
  );
}

export async function* fetchBlockChildren(
  client: NotionClient,
  blockId: string,
  options: Omit<GetBlockChildrenOptions, "startCursor"> = {}
): AsyncGenerator<NotionBlock> {
  let cursor: string | undefined;

  do {
    const response = await getBlockChildren(client, blockId, {
      ...options,
      startCursor: cursor,
    });

    for (const block of response.results) {
      yield block;
    }

    cursor = response.has_more
      ? (response.next_cursor ?? undefined)
      : undefined;
  } while (cursor);
}

export interface BlockWithDepth extends NotionBlock {
  depth: number;
}

export async function* fetchBlockChildrenRecursive(
  client: NotionClient,
  blockId: string,
  depth = 0,
  maxDepth = MAX_BLOCK_DEPTH
): AsyncGenerator<BlockWithDepth> {
  if (depth >= maxDepth) {
    return;
  }

  for await (const block of fetchBlockChildren(client, blockId)) {
    yield { ...block, depth };

    if (block.has_children) {
      yield* fetchBlockChildrenRecursive(client, block.id, depth + 1, maxDepth);
    }
  }
}

export async function getAllBlockChildren(
  client: NotionClient,
  blockId: string,
  maxDepth = MAX_BLOCK_DEPTH
): Promise<BlockWithDepth[]> {
  const blocks: BlockWithDepth[] = [];

  for await (const block of fetchBlockChildrenRecursive(
    client,
    blockId,
    0,
    maxDepth
  )) {
    blocks.push(block);
  }

  return blocks;
}

export async function getBlock(
  client: NotionClient,
  blockId: string
): Promise<NotionBlock> {
  return await client.get<NotionBlock>(`/blocks/${blockId}`);
}

export interface AppendBlockChildrenOptions {
  children: unknown[];
  after?: string;
}

export async function appendBlockChildren(
  client: NotionClient,
  blockId: string,
  options: AppendBlockChildrenOptions
): Promise<NotionBlockChildrenResponse> {
  const body: Record<string, unknown> = {
    children: options.children,
  };

  if (options.after) {
    body.after = options.after;
  }

  return await client.patch<NotionBlockChildrenResponse>(
    `/blocks/${blockId}/children`,
    body
  );
}

export async function updateBlock(
  client: NotionClient,
  blockId: string,
  content: Record<string, unknown>
): Promise<NotionBlock> {
  return await client.patch<NotionBlock>(`/blocks/${blockId}`, content);
}

export async function deleteBlock(
  client: NotionClient,
  blockId: string
): Promise<NotionBlock> {
  return (await client.delete(`/blocks/${blockId}`)) as unknown as NotionBlock;
}
