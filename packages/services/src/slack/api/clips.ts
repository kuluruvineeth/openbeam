import type { SlackClient } from "../client";

export interface SlackClip {
  id: string;
  title: string;
  channelId: string;
  userId: string;
  duration: number;
  transcript?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  createdAt: number;
  viewCount?: number;
}

interface FilesListResponse {
  ok: boolean;
  files?: Array<{
    id: string;
    name?: string;
    title?: string;
    filetype?: string;
    channels?: string[];
    user?: string;
    timestamp?: number;
    transcription?: {
      status?: string;
      preview?: {
        content?: string;
      };
    };
    media_display_type?: string;
    url_private?: string;
    thumb_video?: string;
    duration_ms?: number;
    views?: number;
  }>;
  response_metadata?: {
    next_cursor?: string;
  };
  error?: string;
}

interface FilesInfoResponse {
  ok: boolean;
  file?: {
    id: string;
    name?: string;
    title?: string;
    filetype?: string;
    channels?: string[];
    user?: string;
    timestamp?: number;
    transcription?: {
      status?: string;
      preview?: {
        content?: string;
      };
    };
    media_display_type?: string;
    url_private?: string;
    thumb_video?: string;
    duration_ms?: number;
    views?: number;
  };
  error?: string;
}

export interface ListClipsOptions {
  channelId?: string;
  userId?: string;
  limit?: number;
  cursor?: string;
}

const CLIP_FILETYPES = ["mp4", "webm", "mov", "quicktime"] as const;

export async function listClips(
  client: SlackClient,
  options: ListClipsOptions = {}
): Promise<{ clips: SlackClip[]; nextCursor?: string }> {
  const { channelId, userId, limit = 100, cursor } = options;

  const params: Record<string, unknown> = {
    types: CLIP_FILETYPES.join(","),
    count: limit,
  };

  if (channelId) {
    params.channel = channelId;
  }

  if (userId) {
    params.user = userId;
  }

  if (cursor) {
    params.cursor = cursor;
  }

  const response = await client.call<FilesListResponse>("files.list", params);

  if (!(response.ok && response.files)) {
    return { clips: [] };
  }

  const clips: SlackClip[] = response.files
    .filter((f) => f.media_display_type === "video" || isVideoFile(f.filetype))
    .map((f) => ({
      id: f.id,
      title: f.title ?? f.name ?? "Untitled Clip",
      channelId: f.channels?.[0] ?? "",
      userId: f.user ?? "",
      duration: f.duration_ms ?? 0,
      transcript: f.transcription?.preview?.content,
      thumbnailUrl: f.thumb_video,
      videoUrl: f.url_private,
      createdAt: (f.timestamp ?? 0) * 1000,
      viewCount: f.views,
    }));

  return {
    clips,
    nextCursor: response.response_metadata?.next_cursor,
  };
}

export async function* listAllClips(
  client: SlackClient,
  options: Omit<ListClipsOptions, "cursor"> = {}
): AsyncGenerator<SlackClip> {
  let cursor: string | undefined;

  do {
    const result = await listClips(client, { ...options, cursor });

    for (const clip of result.clips) {
      yield clip;
    }

    cursor = result.nextCursor;
  } while (cursor);
}

export async function getClipInfo(
  client: SlackClient,
  fileId: string
): Promise<SlackClip | null> {
  const response = await client.call<FilesInfoResponse>("files.info", {
    file: fileId,
  });

  if (!(response.ok && response.file)) {
    return null;
  }

  const f = response.file;

  if (f.media_display_type !== "video" && !isVideoFile(f.filetype)) {
    return null;
  }

  return {
    id: f.id,
    title: f.title ?? f.name ?? "Untitled Clip",
    channelId: f.channels?.[0] ?? "",
    userId: f.user ?? "",
    duration: f.duration_ms ?? 0,
    transcript: f.transcription?.preview?.content,
    thumbnailUrl: f.thumb_video,
    videoUrl: f.url_private,
    createdAt: (f.timestamp ?? 0) * 1000,
    viewCount: f.views,
  };
}

export async function getClipTranscript(
  client: SlackClient,
  fileId: string
): Promise<string | null> {
  const clip = await getClipInfo(client, fileId);
  return clip?.transcript ?? null;
}

export interface ClipSyncResult {
  clipId: string;
  title: string;
  indexed: boolean;
  hasTranscript: boolean;
  duration: number;
  error?: string;
}

export async function syncClip(
  client: SlackClient,
  clipId: string
): Promise<ClipSyncResult> {
  try {
    const clip = await getClipInfo(client, clipId);

    if (!clip) {
      return {
        clipId,
        title: "",
        indexed: false,
        hasTranscript: false,
        duration: 0,
        error: "Clip not found or inaccessible",
      };
    }

    return {
      clipId: clip.id,
      title: clip.title,
      indexed: true,
      hasTranscript: !!clip.transcript,
      duration: clip.duration,
    };
  } catch (error) {
    return {
      clipId,
      title: "",
      indexed: false,
      hasTranscript: false,
      duration: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function syncAllClips(
  client: SlackClient,
  channelId?: string
): Promise<ClipSyncResult[]> {
  const results: ClipSyncResult[] = [];

  for await (const clip of listAllClips(client, { channelId })) {
    results.push({
      clipId: clip.id,
      title: clip.title,
      indexed: true,
      hasTranscript: !!clip.transcript,
      duration: clip.duration,
    });
  }

  return results;
}

function isVideoFile(filetype?: string): boolean {
  if (!filetype) {
    return false;
  }
  return CLIP_FILETYPES.includes(filetype as (typeof CLIP_FILETYPES)[number]);
}

export function transformClipToDocument(
  clip: SlackClip,
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
  const content = clip.transcript ?? `Video clip: ${clip.title}`;

  return {
    externalId: `clip_${clip.id}`,
    title: clip.title,
    content,
    documentType: "clip",
    url: clip.videoUrl ?? buildClipUrl(clip.id),
    metadata: {
      connectorId,
      teamId,
      clipId: clip.id,
      channelId: clip.channelId,
      userId: clip.userId,
      duration: clip.duration,
      hasTranscript: !!clip.transcript,
      createdAt: clip.createdAt,
      viewCount: clip.viewCount,
    },
  };
}

function buildClipUrl(clipId: string): string {
  return `https://slack.com/files/${clipId}`;
}
