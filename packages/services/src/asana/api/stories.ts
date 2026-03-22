import type { AsanaClient } from "../client";

export type AsanaStory = {
  gid: string;
  text: string;
  html_text?: string;
  type: string;
  resource_subtype: string;
  created_at: string;
  created_by: { gid: string; name: string };
  target?: { gid: string; name: string; resource_type: string };
};

type StoriesResponse = {
  data: AsanaStory[];
  next_page?: { offset: string; path: string; uri: string } | null;
};

const STORY_FIELDS = [
  "gid",
  "text",
  "html_text",
  "type",
  "resource_subtype",
  "created_at",
  "created_by.gid",
  "created_by.name",
  "target.gid",
  "target.name",
  "target.resource_type",
].join(",");

export async function* getTaskStories(
  client: AsanaClient,
  taskGid: string,
  options: { limit?: number } = {}
): AsyncGenerator<AsanaStory[]> {
  const limit = options.limit ?? 100;
  let offset: string | undefined;

  do {
    const params: Record<string, string> = {
      opt_fields: STORY_FIELDS,
      limit: String(limit),
    };

    if (offset) {
      params.offset = offset;
    }

    const result = await client.get<StoriesResponse>(
      `/tasks/${taskGid}/stories`,
      params
    );

    const comments = result.data.filter(
      (s) => s.resource_subtype === "comment_added"
    );

    if (comments.length > 0) {
      yield comments;
    }

    offset = result.next_page?.offset;
  } while (offset);
}
