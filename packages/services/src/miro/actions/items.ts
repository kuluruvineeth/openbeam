import type { MiroClient } from "../client";
import type { MiroActionResult } from "./boards";

export async function createMiroStickyNote(
  client: MiroClient,
  boardId: string,
  properties: { content: string; shape?: string; x?: number; y?: number }
): Promise<MiroActionResult> {
  try {
    const body: Record<string, unknown> = {
      data: {
        content: properties.content,
        shape: properties.shape ?? "square",
      },
    };
    if (properties.x !== undefined && properties.y !== undefined) {
      body.position = { x: properties.x, y: properties.y };
    }

    const result = await client.post<{ id: string }>(
      `/boards/${boardId}/sticky_notes`,
      body
    );
    return {
      success: true,
      recordId: result.id,
      url: `https://miro.com/app/board/${boardId}/`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create sticky note",
    };
  }
}

export async function updateMiroStickyNote(
  client: MiroClient,
  boardId: string,
  itemId: string,
  properties: { content?: string; shape?: string }
): Promise<MiroActionResult> {
  try {
    const body: Record<string, unknown> = {};
    if (properties.content !== undefined || properties.shape !== undefined) {
      body.data = {
        ...(properties.content !== undefined && {
          content: properties.content,
        }),
        ...(properties.shape !== undefined && { shape: properties.shape }),
      };
    }

    await client.patch<{ id: string }>(
      `/boards/${boardId}/sticky_notes/${itemId}`,
      body
    );
    return {
      success: true,
      recordId: itemId,
      url: `https://miro.com/app/board/${boardId}/`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update sticky note",
    };
  }
}

export async function deleteMiroItem(
  client: MiroClient,
  boardId: string,
  itemId: string
): Promise<MiroActionResult> {
  try {
    await client.del(`/boards/${boardId}/items/${itemId}`);
    return {
      success: true,
      recordId: itemId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete item",
    };
  }
}
