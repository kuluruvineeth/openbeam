import type { BynderClient, BynderTag } from "../client";

type TagsResult = {
  tags: BynderTag[];
};

export async function listAllTags(client: BynderClient): Promise<TagsResult> {
  const tags = await client.listTags();
  return { tags };
}
