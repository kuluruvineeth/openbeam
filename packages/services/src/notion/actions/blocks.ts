import {
  appendBlockChildren as apiAppendBlockChildren,
  deleteBlock as apiDeleteBlock,
  updateBlock as apiUpdateBlock,
} from "../api/blocks";
import type { NotionClient } from "../client";
import { createTextRichText } from "../utils/rich-text";

export interface BlockActionResult {
  success: boolean;
  blockId?: string;
  blockIds?: string[];
  error?: string;
}

export type BlockType =
  | "paragraph"
  | "heading_1"
  | "heading_2"
  | "heading_3"
  | "bulleted_list_item"
  | "numbered_list_item"
  | "to_do"
  | "toggle"
  | "quote"
  | "callout"
  | "divider"
  | "code";

function createBlockInput(type: BlockType, text: string): unknown {
  if (type === "divider") {
    return {
      object: "block",
      type: "divider",
      divider: {},
    };
  }

  if (type === "code") {
    return {
      object: "block",
      type: "code",
      code: {
        rich_text: createTextRichText(text),
        language: "plain text",
      },
    };
  }

  if (type === "to_do") {
    return {
      object: "block",
      type: "to_do",
      to_do: {
        rich_text: createTextRichText(text),
        checked: false,
      },
    };
  }

  return {
    object: "block",
    type,
    [type]: {
      rich_text: createTextRichText(text),
    },
  };
}

export async function appendBlocks(
  client: NotionClient,
  parentId: string,
  blocks: unknown[]
): Promise<BlockActionResult> {
  try {
    const response = await apiAppendBlockChildren(client, parentId, {
      children: blocks,
    });

    return {
      success: true,
      blockIds: response.results.map((b) => b.id),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to append blocks",
    };
  }
}

export async function appendText(
  client: NotionClient,
  parentId: string,
  text: string,
  type: BlockType = "paragraph"
): Promise<BlockActionResult> {
  const block = createBlockInput(type, text);
  return await appendBlocks(client, parentId, [block]);
}

export async function appendParagraph(
  client: NotionClient,
  parentId: string,
  text: string
): Promise<BlockActionResult> {
  return await appendText(client, parentId, text, "paragraph");
}

export async function appendHeading(
  client: NotionClient,
  parentId: string,
  text: string,
  level: 1 | 2 | 3 = 1
): Promise<BlockActionResult> {
  const type = `heading_${level}` as BlockType;
  return await appendText(client, parentId, text, type);
}

export async function appendBulletList(
  client: NotionClient,
  parentId: string,
  items: string[]
): Promise<BlockActionResult> {
  const blocks = items.map((item) =>
    createBlockInput("bulleted_list_item", item)
  );
  return await appendBlocks(client, parentId, blocks);
}

export async function appendNumberedList(
  client: NotionClient,
  parentId: string,
  items: string[]
): Promise<BlockActionResult> {
  const blocks = items.map((item) =>
    createBlockInput("numbered_list_item", item)
  );
  return await appendBlocks(client, parentId, blocks);
}

export async function appendTodoList(
  client: NotionClient,
  parentId: string,
  items: string[]
): Promise<BlockActionResult> {
  const blocks = items.map((item) => createBlockInput("to_do", item));
  return await appendBlocks(client, parentId, blocks);
}

export async function appendCode(
  client: NotionClient,
  parentId: string,
  code: string,
  language = "plain text"
): Promise<BlockActionResult> {
  const block = {
    object: "block",
    type: "code",
    code: {
      rich_text: createTextRichText(code),
      language,
    },
  };
  return await appendBlocks(client, parentId, [block]);
}

export async function appendDivider(
  client: NotionClient,
  parentId: string
): Promise<BlockActionResult> {
  return await appendText(client, parentId, "", "divider");
}

export async function updateBlock(
  client: NotionClient,
  blockId: string,
  content: Record<string, unknown>
): Promise<BlockActionResult> {
  try {
    const block = await apiUpdateBlock(client, blockId, content);

    return {
      success: true,
      blockId: block.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update block",
    };
  }
}

export async function updateBlockText(
  client: NotionClient,
  blockId: string,
  text: string,
  blockType: BlockType = "paragraph"
): Promise<BlockActionResult> {
  if (blockType === "divider") {
    return { success: true, blockId };
  }

  const content = {
    [blockType]: {
      rich_text: createTextRichText(text),
    },
  };

  return await updateBlock(client, blockId, content);
}

export async function deleteBlock(
  client: NotionClient,
  blockId: string
): Promise<BlockActionResult> {
  try {
    await apiDeleteBlock(client, blockId);

    return {
      success: true,
      blockId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete block",
    };
  }
}

export async function batchDeleteBlocks(
  client: NotionClient,
  blockIds: string[]
): Promise<BlockActionResult> {
  const errors: string[] = [];
  const deletedIds: string[] = [];

  for (const blockId of blockIds) {
    try {
      await apiDeleteBlock(client, blockId);
      deletedIds.push(blockId);
    } catch (error) {
      errors.push(
        `${blockId}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return {
    success: errors.length === 0,
    blockIds: deletedIds,
    error: errors.length > 0 ? errors.join("; ") : undefined,
  };
}
