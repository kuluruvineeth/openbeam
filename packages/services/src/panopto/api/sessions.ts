import type { PanoptoClient } from "../client";

export type PanoptoSession = {
  Id: string;
  Name: string;
  Description: string | null;
  Duration: number;
  ViewerCount: number | null;
  CreatedBy: string | null;
  CreatorEmail: string | null;
  FolderId: string | null;
  FolderName: string | null;
  IsBroadcast: boolean;
  IsDownloadable: boolean;
  State: string;
  ThumbUrl: string | null;
  CreatedDate: string;
  LastViewedDate: string | null;
  Urls: {
    ViewerUrl: string | null;
    EmbedUrl: string | null;
  } | null;
  Tags: string[] | null;
};

export function listAllSessions(
  client: PanoptoClient,
  params?: Record<string, string>
): AsyncGenerator<PanoptoSession[], void, undefined> {
  return client.listAll<PanoptoSession>(
    "/sessions",
    {
      sortField: "CreatedDate",
      sortOrder: "Desc",
      ...params,
    },
    50
  );
}

export function getSession(
  client: PanoptoClient,
  sessionId: string
): Promise<PanoptoSession> {
  return client.get<PanoptoSession>(`/sessions/${sessionId}`);
}
