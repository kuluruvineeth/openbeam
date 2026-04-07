export interface MondayBoardListResult {
  items: unknown[];
}

export interface MondayGroupListResult {
  items: unknown[];
}

export interface MondayItemCreateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface MondayItemAddUpdateResult {
  id: string | undefined;
}

export interface MondayItemMoveResult {
  id: string | undefined;
}

export interface MondayActionResults {
  board_list: MondayBoardListResult;
  group_list: MondayGroupListResult;
  item_create: MondayItemCreateResult;
  item_add_update: MondayItemAddUpdateResult;
  item_move: MondayItemMoveResult;
}
