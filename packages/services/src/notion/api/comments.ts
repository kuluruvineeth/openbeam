import type {
  NotionComment,
  NotionCommentsResponse,
} from "@openbeam/types/services/connectors/notion";
import type { NotionClient } from "../client";

export interface GetCommentsOptions {
  blockId?: string;
  startCursor?: string;
  pageSize?: number;
}

export async function getComments(
  client: NotionClient,
  options: GetCommentsOptions = {}
): Promise<NotionCommentsResponse> {
  const params: Record<string, string | number> = {};

  if (options.blockId) {
    params.block_id = options.blockId;
  }
  if (options.startCursor) {
    params.start_cursor = options.startCursor;
  }
  if (options.pageSize) {
    params.page_size = Math.min(options.pageSize, 100);
  }

  return await client.get<NotionCommentsResponse>("/comments", params);
}

export async function* fetchComments(
  client: NotionClient,
  options: Omit<GetCommentsOptions, "startCursor"> = {}
): AsyncGenerator<NotionComment> {
  let cursor: string | undefined;

  do {
    const response = await getComments(client, {
      ...options,
      startCursor: cursor,
    });

    for (const comment of response.results) {
      yield comment;
    }

    cursor = response.has_more
      ? (response.next_cursor ?? undefined)
      : undefined;
  } while (cursor);
}

export async function getAllComments(
  client: NotionClient,
  options: Omit<GetCommentsOptions, "startCursor"> = {}
): Promise<NotionComment[]> {
  const comments: NotionComment[] = [];

  for await (const comment of fetchComments(client, options)) {
    comments.push(comment);
  }

  return comments;
}

export interface CreateCommentOptions {
  parent:
    | { type: "page_id"; page_id: string }
    | { type: "block_id"; block_id: string; discussion_id: string };
  richText: Array<{
    type: "text";
    text: { content: string };
  }>;
}

export async function createComment(
  client: NotionClient,
  options: CreateCommentOptions
): Promise<NotionComment> {
  const body: Record<string, unknown> = {
    rich_text: options.richText,
  };

  if (options.parent.type === "page_id") {
    body.parent = { page_id: options.parent.page_id };
  } else {
    body.parent = { block_id: options.parent.block_id };
    body.discussion_id = options.parent.discussion_id;
  }

  return await client.post<NotionComment>("/comments", body);
}

export async function createPageComment(
  client: NotionClient,
  pageId: string,
  content: string
): Promise<NotionComment> {
  return await createComment(client, {
    parent: { type: "page_id", page_id: pageId },
    richText: [{ type: "text", text: { content } }],
  });
}

export async function createBlockComment(
  client: NotionClient,
  blockId: string,
  discussionId: string,
  content: string
): Promise<NotionComment> {
  return await createComment(client, {
    parent: {
      type: "block_id",
      block_id: blockId,
      discussion_id: discussionId,
    },
    richText: [{ type: "text", text: { content } }],
  });
}
