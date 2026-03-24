import type { MarketoClient } from "../client";

export type MarketoProgram = {
  id: number;
  name: string;
  description: string | null;
  type: string;
  channel: string | null;
  status: string | null;
  workspace: string | null;
  createdAt: string;
  updatedAt: string;
  url: string | null;
  folder: { type: string; value: number; folderName?: string } | null;
};

export function listAllPrograms(
  client: MarketoClient
): AsyncGenerator<MarketoProgram[], void, undefined> {
  return client.listAllAssets<MarketoProgram>("/v1/programs.json");
}
