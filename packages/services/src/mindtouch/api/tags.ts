import type { MindtouchClient } from "../client";

export interface MindtouchTag {
  "@value": string;
  "@id": string;
  "@href": string;
  type: string;
  uri?: string;
  title?: string;
  pages?: {
    "@totalcount": string;
  };
}

interface TagsResponse {
  tag?: MindtouchTag[] | MindtouchTag;
  "@totalcount"?: string;
}

function normalizeTagArray(
  data: MindtouchTag[] | MindtouchTag | undefined
): MindtouchTag[] {
  if (!data) {
    return [];
  }
  return Array.isArray(data) ? data : [data];
}

export async function* listTags(
  client: MindtouchClient
): AsyncGenerator<MindtouchTag[], void, undefined> {
  const response = await client.get<TagsResponse>("/site/tags");

  const tags = normalizeTagArray(response.tag);

  if (tags.length > 0) {
    yield tags;
  }
}
