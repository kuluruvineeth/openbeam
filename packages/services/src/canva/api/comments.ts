import type { CanvaClient } from "../client";

export type CanvaComment = {
  id: string;
  design_id: string;
  message: string;
  author: {
    user_id: string;
    display_name?: string;
  };
  created_at: string;
  updated_at: string;
  thread_id?: string;
  reply_count?: number;
};

export function listDesignComments(
  client: CanvaClient,
  designId: string,
  params?: Record<string, string>
): AsyncGenerator<CanvaComment[], void, undefined> {
  return client.listAll<CanvaComment>(`/designs/${designId}/comments`, params);
}
