import type { EvernoteClient } from "../client";

export type EvernoteTag = {
  guid: string;
  name: string;
  parentGuid?: string;
  updateSequenceNum: number;
};

export function listTags(client: EvernoteClient): Promise<EvernoteTag[]> {
  return client.get<EvernoteTag[]>("/tags");
}
