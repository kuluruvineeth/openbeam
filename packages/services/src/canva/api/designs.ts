import type { CanvaClient } from "../client";

export type CanvaDesign = {
  id: string;
  title: string;
  owner: {
    user_id: string;
    team_id?: string;
  };
  doc_type: string;
  thumbnail?: {
    url: string;
    width: number;
    height: number;
  };
  urls: {
    edit_url: string;
    view_url: string;
  };
  created_at: string;
  updated_at: string;
  page_count?: number;
};

export function listAllDesigns(
  client: CanvaClient,
  params?: Record<string, string>
): AsyncGenerator<CanvaDesign[], void, undefined> {
  return client.listAll<CanvaDesign>("/designs", params);
}

export function getDesign(
  client: CanvaClient,
  designId: string
): Promise<{ design: CanvaDesign }> {
  return client.get<{ design: CanvaDesign }>(`/designs/${designId}`);
}
