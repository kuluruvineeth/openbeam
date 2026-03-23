import type { AirtableClient } from "../client";

export type AirtableCommentAuthor = {
  id: string;
  email: string;
  name: string;
};

export type AirtableComment = {
  id: string;
  text: string;
  author: AirtableCommentAuthor;
  createdTime: string;
  lastUpdatedTime?: string;
};

type ListCommentsResponse = {
  comments: AirtableComment[];
  offset?: string;
};

export async function* listRecordComments(
  client: AirtableClient,
  baseId: string,
  recordId: string
): AsyncGenerator<AirtableComment[], void, undefined> {
  let offset: string | undefined;

  do {
    const params: Record<string, string> = {};
    if (offset) {
      params.offset = offset;
    }
    const response = await client.get<ListCommentsResponse>(
      `/${baseId}/${recordId}/comments`,
      params
    );
    const comments = response.comments ?? [];
    if (comments.length > 0) {
      yield comments;
    }
    offset = response.offset;
  } while (offset);
}
