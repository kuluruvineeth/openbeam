export interface BoxFolderCreateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface BoxItemMoveResult {
  id: string | undefined;
  url: string | undefined;
}

export interface BoxItemDeleteResult {
  id: string | undefined;
}

export interface BoxItemShareResult {
  id: string | undefined;
  url: string | undefined;
}

export interface BoxFolderListResult {
  items: unknown[];
}

export interface BoxActionResults {
  folder_create: BoxFolderCreateResult;
  item_move: BoxItemMoveResult;
  item_delete: BoxItemDeleteResult;
  item_share: BoxItemShareResult;
  folder_list: BoxFolderListResult;
}
