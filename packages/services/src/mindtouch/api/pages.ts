import type { MindtouchClient } from "../client";

export interface MindtouchPage {
  "@id": string;
  "@href": string;
  "@revision": string;
  "date.created": string;
  "date.modified": string;
  "date.edited"?: string;
  title: string;
  path: string;
  "uri.ui": string;
  "page.parent"?: {
    "@id": string;
    title: string;
    path: string;
  };
  tags?: {
    tag?: MindtouchPageTag[] | MindtouchPageTag;
  };
  "user.author"?: {
    "@id": string;
    username: string;
    fullname?: string;
    email?: string;
  };
  subpages?: {
    "@totalcount": string;
    "page.subpage"?: MindtouchPage[] | MindtouchPage;
  };
}

export interface MindtouchPageTag {
  "@value": string;
  "@id"?: string;
  type?: string;
}

export interface MindtouchPageContent {
  body: string[];
  "@type": string;
}

interface SitemapResponse {
  "page.subpage"?: MindtouchPage[] | MindtouchPage;
  "@totalcount"?: string;
  page?: MindtouchPage;
}

interface ListPagesOptions {
  offset?: number;
  limit?: number;
  updatedSince?: string;
}

function normalizePageArray(
  data: MindtouchPage[] | MindtouchPage | undefined
): MindtouchPage[] {
  if (!data) {
    return [];
  }
  return Array.isArray(data) ? data : [data];
}

export async function* listPages(
  client: MindtouchClient,
  options: ListPagesOptions = {}
): AsyncGenerator<MindtouchPage[], void, undefined> {
  const { limit = 200, updatedSince } = options;
  let offset = options.offset ?? 0;

  while (true) {
    const params: Record<string, string> = {
      offset: String(offset),
      limit: String(limit),
    };

    if (updatedSince) {
      params.changefilter = "content,tags,parent";
      params.since = updatedSince;
    }

    const response = await client.get<SitemapResponse>("/pages", params);

    const pages = normalizePageArray(response["page.subpage"]);

    if (pages.length > 0) {
      yield pages;
    }

    if (pages.length < limit) {
      break;
    }
    offset += limit;
  }
}

export async function getPageContent(
  client: MindtouchClient,
  pageId: string
): Promise<string> {
  const response = await client.get<MindtouchPageContent>(
    `/pages/${pageId}/contents`
  );
  const body = response.body;
  if (Array.isArray(body)) {
    return body.join("");
  }
  return typeof body === "string" ? body : "";
}

export function getPageInfo(
  client: MindtouchClient,
  pageId: string
): Promise<MindtouchPage> {
  return client.get<MindtouchPage>(`/pages/${pageId}/info`);
}
