import type { MondayClient } from "../client";

export interface ItemActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

const CREATE_ITEM_MUTATION = `
  mutation CreateItem($boardId: ID!, $groupId: String, $itemName: String!, $columnValues: JSON) {
    create_item(board_id: $boardId, group_id: $groupId, item_name: $itemName, column_values: $columnValues) {
      id
      name
      url
    }
  }
`;

const CREATE_UPDATE_MUTATION = `
  mutation CreateUpdate($itemId: ID!, $body: String!) {
    create_update(item_id: $itemId, body: $body) {
      id
    }
  }
`;

const MOVE_ITEM_MUTATION = `
  mutation MoveItem($itemId: ID!, $groupId: String!) {
    move_item_to_group(item_id: $itemId, group_id: $groupId) {
      id
    }
  }
`;

export async function createItem(
  client: MondayClient,
  params: {
    boardId: string;
    name: string;
    groupId?: string;
    columnValues?: Record<string, unknown>;
  }
): Promise<ItemActionResult> {
  try {
    const data = await client.query<{
      create_item: { id: string; name: string; url: string };
    }>(CREATE_ITEM_MUTATION, {
      boardId: params.boardId,
      groupId: params.groupId,
      itemName: params.name,
      columnValues: params.columnValues
        ? JSON.stringify(params.columnValues)
        : undefined,
    });

    return {
      success: true,
      id: data.create_item.id,
      url: data.create_item.url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create item",
    };
  }
}

export async function addUpdate(
  client: MondayClient,
  params: { itemId: string; body: string }
): Promise<ItemActionResult> {
  try {
    const data = await client.query<{
      create_update: { id: string };
    }>(CREATE_UPDATE_MUTATION, {
      itemId: params.itemId,
      body: params.body,
    });

    return { success: true, id: data.create_update.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add update",
    };
  }
}

export async function moveItemToGroup(
  client: MondayClient,
  params: { itemId: string; groupId: string }
): Promise<ItemActionResult> {
  try {
    const data = await client.query<{
      move_item_to_group: { id: string };
    }>(MOVE_ITEM_MUTATION, {
      itemId: params.itemId,
      groupId: params.groupId,
    });

    return { success: true, id: data.move_item_to_group.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to move item",
    };
  }
}
