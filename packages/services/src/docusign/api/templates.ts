import type { DocuSignClient } from "../client";

export type DocuSignTemplate = {
  templateId: string;
  name: string;
  description?: string;
  shared: string;
  created: string;
  lastModified: string;
  uri?: string;
  owner?: {
    userName: string;
    email: string;
    userId?: string;
  };
  emailSubject?: string;
  emailBlurb?: string;
  folderName?: string;
  folderId?: string;
  pageCount?: number;
};

type TemplateListResponse = {
  envelopeTemplates?: DocuSignTemplate[];
  resultSetSize: string;
  startPosition: string;
  endPosition: string;
  totalSetSize: string;
  nextUri?: string;
};

export async function* listAllTemplates(
  client: DocuSignClient
): AsyncGenerator<DocuSignTemplate[], void, undefined> {
  let startPosition = 0;
  const count = 100;
  let hasMore = true;

  while (hasMore) {
    const response = await client.get<TemplateListResponse>("/templates", {
      start_position: String(startPosition),
      count: String(count),
    });

    const templates = response.envelopeTemplates ?? [];
    if (templates.length > 0) {
      yield templates;
    }

    const totalSize = Number.parseInt(response.totalSetSize, 10);
    startPosition += templates.length;
    hasMore = startPosition < totalSize && templates.length > 0;
  }
}
