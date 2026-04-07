export interface MiroBoardListResult {
  boards: unknown[];
}

export interface MiroBoardCreateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface MiroStickyNoteCreateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface MiroStickyNoteUpdateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface MiroItemDeleteResult {
  recordId: string | undefined;
}

export interface MiroActionResults {
  board_list: MiroBoardListResult;
  board_create: MiroBoardCreateResult;
  sticky_note_create: MiroStickyNoteCreateResult;
  sticky_note_update: MiroStickyNoteUpdateResult;
  item_delete: MiroItemDeleteResult;
}
