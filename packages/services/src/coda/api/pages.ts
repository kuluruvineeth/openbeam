import type { CodaClient } from "../client";

export type CodaPage = {
  id: string;
  type: string;
  href: string;
  browserLink: string;
  name: string;
  subtitle?: string;
  parent?: {
    id: string;
    type: string;
    href: string;
    browserLink: string;
    name: string;
  };
  children: Array<{
    id: string;
    type: string;
    href: string;
    browserLink: string;
    name: string;
  }>;
  contentType: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CodaPageContent = {
  content: string;
};

export function listAllPages(
  client: CodaClient,
  docId: string
): AsyncGenerator<CodaPage[], void, undefined> {
  return client.listAll<CodaPage>(`/docs/${docId}/pages`);
}

export function getPage(
  client: CodaClient,
  docId: string,
  pageId: string
): Promise<CodaPage> {
  return client.get<CodaPage>(`/docs/${docId}/pages/${pageId}`);
}

export async function getPageContent(
  client: CodaClient,
  docId: string,
  pageId: string
): Promise<string> {
  const result = await client.get<CodaPageContent>(
    `/docs/${docId}/pages/${pageId}/content`,
    { outputFormat: "markdown" }
  );
  return result.content;
}
