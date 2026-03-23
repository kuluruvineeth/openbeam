import type { MiroClient } from "../client";

export type MiroItemType =
  | "sticky_note"
  | "shape"
  | "text"
  | "card"
  | "frame"
  | "image"
  | "connector"
  | "document"
  | "embed"
  | "app_card";

export type MiroItem = {
  id: string;
  type: MiroItemType;
  createdAt: string;
  modifiedAt: string;
  createdBy: {
    id: string;
    type: string;
    name?: string;
  };
  modifiedBy: {
    id: string;
    type: string;
    name?: string;
  };
  data: {
    content?: string;
    shape?: string;
    title?: string;
    description?: string;
    fields?: Array<{ value?: string; tooltip?: string }>;
  };
  position?: {
    x: number;
    y: number;
  };
  geometry?: {
    width?: number;
    height?: number;
  };
  parent?: {
    id: string;
  };
};

export function listBoardItems(
  client: MiroClient,
  boardId: string,
  params?: Record<string, string>
): AsyncGenerator<MiroItem[], void, undefined> {
  return client.listAll<MiroItem>(`/boards/${boardId}/items`, params);
}
