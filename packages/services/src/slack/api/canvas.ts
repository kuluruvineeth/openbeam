import type { SlackClient } from "../client";

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

interface CanvasesAccessListResponse {
  ok: boolean;
  canvases?: Array<{
    id: string;
    title?: string;
    channel_id?: string;
    last_edited_at?: number;
    last_edited_by_user?: {
      user_id?: string;
    };
    is_published?: boolean;
    access_level?: string;
  }>;
  response_metadata?: {
    next_cursor?: string;
  };
  error?: string;
}

interface CanvasesSectionsLookupResponse {
  ok: boolean;
  canvas?: {
    id: string;
    title?: string;
    document_content?: {
      markdown?: string;
      type?: string;
    };
  };
  error?: string;
}

export interface ListCanvasesOptions {
  channelId?: string;
  limit?: number;
  cursor?: string;
}

export async function listCanvases(
  client: SlackClient,
  options: ListCanvasesOptions = {}
): Promise<{ canvases: SlackCanvas[]; nextCursor?: string }> {
  const { channelId, limit = 100, cursor } = options;

  const params: Record<string, unknown> = {
    limit,
  };

  if (channelId) {
    params.channel_id = channelId;
  }

  if (cursor) {
    params.cursor = cursor;
  }

  const response = await client.call<CanvasesAccessListResponse>(
    "canvases.access.list",
    params
  );

  if (!(response.ok && response.canvases)) {
    return { canvases: [] };
  }

  const canvases: SlackCanvas[] = response.canvases.map((c) => ({
    id: c.id,
    title: c.title ?? "Untitled Canvas",
    channelId: c.channel_id,
    lastModified: c.last_edited_at ?? Date.now(),
    lastModifiedBy: c.last_edited_by_user?.user_id,
    isPublished: c.is_published ?? false,
    accessLevel: mapAccessLevel(c.access_level),
  }));

  return {
    canvases,
    nextCursor: response.response_metadata?.next_cursor,
  };
}

export async function* listAllCanvases(
  client: SlackClient,
  options: Omit<ListCanvasesOptions, "cursor"> = {}
): AsyncGenerator<SlackCanvas> {
  let cursor: string | undefined;

  do {
    const result = await listCanvases(client, { ...options, cursor });

    for (const canvas of result.canvases) {
      yield canvas;
    }

    cursor = result.nextCursor;
  } while (cursor);
}

export async function getCanvasContent(
  client: SlackClient,
  canvasId: string
): Promise<string | null> {
  const response = await client.call<CanvasesSectionsLookupResponse>(
    "canvases.sections.lookup",
    {
      canvas_id: canvasId,
      criteria: { contains_text: "" },
    }
  );

  if (!(response.ok && response.canvas)) {
    return null;
  }

  return response.canvas.document_content?.markdown ?? null;
}

export async function getCanvasWithContent(
  client: SlackClient,
  canvasId: string
): Promise<SlackCanvas | null> {
  const [listResult, content] = await Promise.all([
    listCanvases(client, { limit: 1 }),
    getCanvasContent(client, canvasId),
  ]);

  const canvasInfo = listResult.canvases.find((c) => c.id === canvasId);
  if (!canvasInfo) {
    return null;
  }

  return {
    ...canvasInfo,
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

function mapAccessLevel(level?: string): CanvasAccessLevel {
  switch (level) {
    case "private":
      return "private";
    case "channel":
      return "channel";
    case "org":
      return "org";
    case "external":
      return "external";
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
