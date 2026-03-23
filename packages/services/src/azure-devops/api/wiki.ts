import type { AzureDevOpsClient } from "../client";

export type AzureDevOpsWiki = {
  id: string;
  name: string;
  type: string;
  url: string;
};

export type AzureDevOpsWikiPage = {
  id: number;
  path: string;
  order: number;
  content?: string;
  subPages?: AzureDevOpsWikiPage[];
};

type WikiListResponse = {
  count: number;
  value: AzureDevOpsWiki[];
};

export async function listWikis(
  client: AzureDevOpsClient,
  project: string
): Promise<AzureDevOpsWiki[]> {
  const res = await client.get<WikiListResponse>(
    `/${encodeURIComponent(project)}/_apis/wiki/wikis`
  );
  return res.value;
}

export function getWikiPageTree(
  client: AzureDevOpsClient,
  project: string,
  wikiId: string
): Promise<AzureDevOpsWikiPage> {
  return client.get<AzureDevOpsWikiPage>(
    `/${encodeURIComponent(project)}/_apis/wiki/wikis/${encodeURIComponent(wikiId)}/pagestree`,
    { recursionLevel: "full" }
  );
}

export function getWikiPageContent(
  client: AzureDevOpsClient,
  project: string,
  wikiId: string,
  path: string
): Promise<string> {
  return client.get<string>(
    `/${encodeURIComponent(project)}/_apis/wiki/wikis/${encodeURIComponent(wikiId)}/pages`,
    { path, includeContent: "true" }
  );
}

export function flattenWikiPages(
  root: AzureDevOpsWikiPage
): AzureDevOpsWikiPage[] {
  const result: AzureDevOpsWikiPage[] = [root];
  const queue = [...(root.subPages ?? [])];

  while (queue.length > 0) {
    const page = queue.shift() as AzureDevOpsWikiPage;
    result.push(page);
    if (page.subPages) {
      queue.push(...page.subPages);
    }
  }

  return result;
}
