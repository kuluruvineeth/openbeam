import type { CodaClient } from "../client";

export type CodaDoc = {
  id: string;
  type: string;
  href: string;
  browserLink: string;
  name: string;
  owner: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
  folder: { id: string; type: string; browserLink: string; name: string };
  icon?: { name: string; type: string; browserLink: string };
  docSize?: {
    totalRowCount: number;
    tableAndViewCount: number;
    pageCount: number;
    overApiSizeLimit: boolean;
  };
};

export function listAllDocs(
  client: CodaClient,
  params?: Record<string, string>
): AsyncGenerator<CodaDoc[], void, undefined> {
  return client.listAll<CodaDoc>("/docs", params);
}

export function getDoc(client: CodaClient, docId: string): Promise<CodaDoc> {
  return client.get<CodaDoc>(`/docs/${docId}`);
}

export function listDocsUpdatedSince(
  client: CodaClient,
  sinceDate: string
): AsyncGenerator<CodaDoc[], void, undefined> {
  return client.listAll<CodaDoc>("/docs", {
    updatedSince: new Date(sinceDate).toISOString(),
  });
}

export type CodaWhoAmI = {
  name: string;
  loginId: string;
  scpiTokenInfo?: {
    tokenName: string;
    isRestrictedApiToken: boolean;
  };
  pictureLink?: string;
  workspace?: {
    id: string;
    name: string;
    browserLink: string;
  };
};

export function whoAmI(client: CodaClient): Promise<CodaWhoAmI> {
  return client.get<CodaWhoAmI>("/whoami");
}
