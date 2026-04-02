import { type EvernoteClient, withRateLimit } from "../client";

export type EvernoteTag = {
  guid: string;
  name: string;
  parentGuid?: string;
  updateSequenceNum: number;
};

export async function listTags(client: EvernoteClient): Promise<EvernoteTag[]> {
  const raw = await withRateLimit(client, "listTags", () =>
    client.noteStore.listTags()
  );
  return raw.map((t) => ({
    guid: t.guid ?? "",
    name: t.name ?? "",
    parentGuid: t.parentGuid,
    updateSequenceNum: t.updateSequenceNum ?? 0,
  }));
}
