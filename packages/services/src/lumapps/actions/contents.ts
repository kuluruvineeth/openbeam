import type { LumAppsClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

function langMap(value: string, lang: string): Record<string, string> {
  return { [lang]: value };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface CreateContentParams {
  title: string;
  language?: string;
  slug?: string;
  type?: string;
  customContentTypeId?: string;
  body?: string;
  feedKeys?: string[];
  status?: string;
}

interface UpdateContentParams {
  contentId: string;
  title?: string;
  language?: string;
  body?: string;
  slug?: string;
  status?: string;
}

interface ContentSaveResponse {
  id?: string;
  uid?: string;
  slug?: Record<string, string>;
  canonicalUrl?: string;
  instance?: string;
}

export async function createContent(
  client: LumAppsClient,
  params: CreateContentParams
): Promise<ActionResult> {
  const lang = params.language ?? "en";
  const slug = params.slug ?? slugify(params.title);

  const payload: Record<string, unknown> = {
    type: params.type ?? "page",
    title: langMap(params.title, lang),
    slug: langMap(slug, lang),
  };

  if (client.customerId) {
    payload.customer = client.customerId;
  }
  if (client.instanceId) {
    payload.instance = client.instanceId;
  }
  if (params.customContentTypeId) {
    payload.customContentType = params.customContentTypeId;
  }
  if (params.body) {
    payload.body = params.body;
  }
  if (params.feedKeys?.length) {
    payload.feedKeys = params.feedKeys;
  }
  if (params.status) {
    payload.status = params.status;
  }

  try {
    const response = await client.postV1<ContentSaveResponse>(
      "/content/save",
      payload
    );

    const contentId = response.uid ?? response.id ?? "";
    return {
      success: true,
      id: contentId,
      url: response.canonicalUrl ?? buildContentUrl(response, contentId),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create content",
    };
  }
}

export async function updateContent(
  client: LumAppsClient,
  params: UpdateContentParams
): Promise<ActionResult> {
  const lang = params.language ?? "en";

  let existing: Record<string, unknown> = {};
  try {
    existing = await client.get<Record<string, unknown>>("/content/get", {
      uid: params.contentId,
    });
  } catch {
    existing = { uid: params.contentId };
  }

  const payload: Record<string, unknown> = {
    ...existing,
    uid: params.contentId,
  };

  if (params.title) {
    payload.title = langMap(params.title, lang);
  }
  if (params.body) {
    payload.body = params.body;
  }
  if (params.slug) {
    payload.slug = langMap(params.slug, lang);
  }
  if (params.status) {
    payload.status = params.status;
  }

  try {
    const response = await client.postV1<ContentSaveResponse>(
      "/content/save",
      payload
    );

    const contentId = response.uid ?? response.id ?? params.contentId;
    return {
      success: true,
      id: contentId,
      url: response.canonicalUrl ?? buildContentUrl(response, contentId),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update content",
    };
  }
}

function buildContentUrl(
  response: ContentSaveResponse,
  contentId: string
): string {
  if (response.instance) {
    return `https://sites.lumapps.com/a/${response.instance}/content/${contentId}`;
  }
  return `https://sites.lumapps.com/content/${contentId}`;
}
