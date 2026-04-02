import { SimpplrApiError } from "../types";

const SIMPPLR_API_BASE = "https://api.ec.simpplr.com/api";
const REQUEST_TIMEOUT = 30_000;

interface ActionClientConfig {
  accessToken: string;
  userEmail: string;
}

interface ActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

interface CreatePageParams {
  siteId: string;
  title: string;
  body: string;
  contentSubType: "news" | "knowledge";
  categoryName: string;
  publishingStatus: "immediate" | "schedule";
  summary?: string;
  publishAt?: string;
  isFeedEnabled?: boolean;
}

interface UpdatePageParams {
  siteId: string;
  contentId: string;
  title?: string;
  body?: string;
  summary?: string;
}

function buildHeaders(
  config: ActionClientConfig,
  contentType: string
): Record<string, string> {
  return {
    Authorization: `Bearer ${config.accessToken}`,
    "x-user-email": config.userEmail,
    "Content-Type": contentType,
    Accept: "application/json",
  };
}

interface SimpplrResponse {
  status: string;
  result?: { id?: string; contentId?: string; url?: string; title?: string };
  message?: string;
}

export async function createPage(
  config: ActionClientConfig,
  params: CreatePageParams
): Promise<ActionResult> {
  const url = `${SIMPPLR_API_BASE}/contents/site/${params.siteId}/page`;

  const formData = new URLSearchParams();
  formData.set("title", params.title);
  formData.set("body", params.body);
  formData.set("content-sub-type", params.contentSubType);
  formData.set("category-name", params.categoryName);
  formData.set("publishing-status", params.publishingStatus);

  if (params.summary) {
    formData.set("summary", params.summary);
  }
  if (params.publishAt) {
    formData.set("publish-at", params.publishAt);
  }
  if (params.isFeedEnabled !== undefined) {
    formData.set("is-feed-enabled", String(params.isFeedEnabled));
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: buildHeaders(config, "application/x-www-form-urlencoded"),
      body: formData.toString(),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new SimpplrApiError({
      message: `Simpplr create page failed (${response.status}): ${text}`,
      code: response.status === 401 ? "UNAUTHORIZED" : "API_ERROR",
      statusCode: response.status,
      retryable: response.status >= 500,
    });
  }

  const data = (await response.json()) as SimpplrResponse;
  if (data.status !== "success") {
    return {
      success: false,
      error: data.message ?? "Simpplr returned non-success status",
    };
  }

  return {
    success: true,
    id: data.result?.contentId ?? data.result?.id,
    url: data.result?.url,
  };
}

export async function updatePage(
  config: ActionClientConfig,
  params: UpdatePageParams
): Promise<ActionResult> {
  const url = `${SIMPPLR_API_BASE}/contents/site/${params.siteId}/page/${params.contentId}`;

  const body: Record<string, unknown> = {};
  if (params.title !== undefined) {
    body.title = params.title;
  }
  if (params.body !== undefined) {
    body.body = params.body;
  }
  if (params.summary !== undefined) {
    body.summary = params.summary;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "PUT",
      headers: buildHeaders(config, "application/json"),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new SimpplrApiError({
      message: `Simpplr update page failed (${response.status}): ${text}`,
      code: response.status === 401 ? "UNAUTHORIZED" : "API_ERROR",
      statusCode: response.status,
      retryable: response.status >= 500,
    });
  }

  const data = (await response.json()) as SimpplrResponse;
  if (data.status !== "success") {
    return {
      success: false,
      error: data.message ?? "Simpplr returned non-success status",
    };
  }

  return {
    success: true,
    id: params.contentId,
    url: data.result?.url,
  };
}
