import type { SlackClient } from "../client";
import type { SlackFile } from "../types";

export interface SlackCanvas {
  id: string;
  title: string;
  channelId?: string;
  documentContent?: string;
  lastModified: number;
  lastModifiedBy?: string;
  isPublished: boolean;
  accessLevel: CanvasAccessLevel;
}

export type CanvasAccessLevel = "private" | "channel" | "org" | "external";

interface FilesListResponse {
  ok: boolean;
  files?: SlackFile[];
  paging?: {
    count: number;
    total: number;
    page: number;
    pages: number;
  };
  error?: string;
}

interface CanvasesSectionsLookupResponse {
  ok: boolean;
  sections?: Array<{
    document_content?: {
      markdown?: string;
      type?: string;
    };
  }>;
  error?: string;
}

export interface ListCanvasesOptions {
  channelId?: string;
  limit?: number;
  page?: number;
  since?: number;
}

export async function listCanvases(
  client: SlackClient,
  options: ListCanvasesOptions = {}
): Promise<{ canvases: SlackCanvas[]; hasMore: boolean; nextPage?: number }> {
  const { channelId, limit = 100, page = 1, since } = options;

  const params: Record<string, unknown> = {
    count: limit,
    page,
    types: "spaces",
  };

  if (channelId) {
    params.channel = channelId;
  }

  if (since) {
    params.ts_from = since;
  }

  const response = await client.call<FilesListResponse>("files.list", params);

  if (!(response.ok && response.files)) {
    return { canvases: [], hasMore: false };
  }

  const canvasFiles = response.files.filter(
    (f) =>
      f.filetype === "quip" || f.filetype === "canvas" || f.mode === "space"
  );

  const canvases: SlackCanvas[] = canvasFiles.map((f) => ({
    id: f.id,
    title: f.title || f.name || "Untitled Canvas",
    channelId: f.channels?.[0],
    lastModified: f.timestamp ?? Math.floor(Date.now() / 1000),
    lastModifiedBy: f.user,
    isPublished: !f.is_external,
    accessLevel: mapAccessLevel(f.mode),
  }));

  const hasMore = response.paging
    ? page < response.paging.pages
    : canvasFiles.length >= limit;

  return {
    canvases,
    hasMore,
    nextPage: hasMore ? page + 1 : undefined,
  };
}

export async function* listAllCanvases(
  client: SlackClient,
  options: Omit<ListCanvasesOptions, "page"> = {}
): AsyncGenerator<SlackCanvas> {
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const result = await listCanvases(client, { ...options, page });

    for (const canvas of result.canvases) {
      yield canvas;
    }

    hasMore = result.hasMore;
    page = result.nextPage ?? page + 1;
  }
}

export async function getCanvasContent(
  client: SlackClient,
  canvasId: string
): Promise<string | null> {
  try {
    const response = await client.call<CanvasesSectionsLookupResponse>(
      "canvases.sections.lookup",
      {
        canvas_id: canvasId,
        criteria: { contains_text: "" },
      }
    );

    if (!(response.ok && response.sections)) {
      return null;
    }

    const markdownParts = response.sections
      .map((s) => s.document_content?.markdown)
      .filter(Boolean);

    return markdownParts.join("\n\n") || null;
  } catch {
    return null;
  }
}

export async function getCanvasWithContent(
  client: SlackClient,
  canvasId: string
): Promise<SlackCanvas | null> {
  const content = await getCanvasContent(client, canvasId);

  return {
    id: canvasId,
    title: "Canvas",
    lastModified: Math.floor(Date.now() / 1000),
    isPublished: false,
    accessLevel: "private",
    documentContent: content ?? undefined,
  };
}

export interface CanvasSyncResult {
  canvasId: string;
  title: string;
  indexed: boolean;
  contentLength: number;
  error?: string;
}

export async function syncCanvas(
  client: SlackClient,
  canvasId: string
): Promise<CanvasSyncResult> {
  try {
    const canvas = await getCanvasWithContent(client, canvasId);

    if (!canvas) {
      return {
        canvasId,
        title: "",
        indexed: false,
        contentLength: 0,
        error: "Canvas not found or inaccessible",
      };
    }

    return {
      canvasId: canvas.id,
      title: canvas.title,
      indexed: true,
      contentLength: canvas.documentContent?.length ?? 0,
    };
  } catch (error) {
    return {
      canvasId,
      title: "",
      indexed: false,
      contentLength: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function syncAllCanvases(
  client: SlackClient,
  channelId?: string
): Promise<CanvasSyncResult[]> {
  const results: CanvasSyncResult[] = [];

  for await (const canvas of listAllCanvases(client, { channelId })) {
    const result = await syncCanvas(client, canvas.id);
    results.push(result);
  }

  return results;
}

function mapAccessLevel(mode?: string): CanvasAccessLevel {
  switch (mode) {
    case "space":
    case "hosted":
      return "channel";
    case "external":
      return "external";
    case "snippet":
    case "post":
      return "org";
    default:
      return "private";
  }
}

export function transformCanvasToDocument(
  canvas: SlackCanvas,
  connectorId: string,
  teamId: string
): {
  externalId: string;
  title: string;
  content: string;
  documentType: string;
  url: string;
  metadata: Record<string, unknown>;
} {
  return {
    externalId: `canvas_${canvas.id}`,
    title: canvas.title,
    content: canvas.documentContent ?? "",
    documentType: "canvas",
    url: buildCanvasUrl(canvas.id),
    metadata: {
      connectorId,
      teamId,
      canvasId: canvas.id,
      channelId: canvas.channelId,
      lastModified: canvas.lastModified,
      lastModifiedBy: canvas.lastModifiedBy,
      isPublished: canvas.isPublished,
      accessLevel: canvas.accessLevel,
    },
  };
}

function buildCanvasUrl(canvasId: string): string {
  return `https://slack.com/canvas/${canvasId}`;
}
