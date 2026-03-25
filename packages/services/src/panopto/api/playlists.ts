import type { PanoptoClient } from "../client";

export type PanoptoPlaylist = {
  Id: string;
  Name: string;
  Description: string | null;
  Sessions: string[] | null;
  SessionCount: number;
  CreatedBy: string | null;
  Urls: {
    ViewerUrl: string | null;
    EmbedUrl: string | null;
  } | null;
};

export function listAllPlaylists(
  client: PanoptoClient,
  params?: Record<string, string>
): AsyncGenerator<PanoptoPlaylist[], void, undefined> {
  return client.listAll<PanoptoPlaylist>(
    "/playlists",
    {
      sortField: "Name",
      sortOrder: "Asc",
      ...params,
    },
    50
  );
}

export function getPlaylist(
  client: PanoptoClient,
  playlistId: string
): Promise<PanoptoPlaylist> {
  return client.get<PanoptoPlaylist>(`/playlists/${playlistId}`);
}
