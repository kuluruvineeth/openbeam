export interface FellowActionItemCompleteResult {
  id: string | undefined;
}

export interface FellowActionItemArchiveResult {
  id: string | undefined;
}

export interface FellowActionResults {
  action_item_complete: FellowActionItemCompleteResult;
  action_item_archive: FellowActionItemArchiveResult;
}
