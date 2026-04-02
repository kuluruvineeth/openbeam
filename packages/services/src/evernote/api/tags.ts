import {
  type EvernoteTag as ClientTag,
  type EvernoteClient,
  withRateLimit,
} from "../client";

export type EvernoteTag = {
  guid: string;
  name: string;
  parentGuid?: string;
  updateSequenceNum: number;
};

export async function listTags(client: EvernoteClient): Promise<EvernoteTag[]> {
  const raw = await withRateLimit(client, "listTags", () => client.listTags());
  return raw.map((t: ClientTag) => ({
    guid: t.guid ?? "",
    name: t.name ?? "",
    updateSequenceNum: t.updateSequenceNum ?? 0,
  }));
}
