export interface PanoptoFolderCreateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface PanoptoSessionUpdateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface PanoptoSessionMoveResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface PanoptoActionResults {
  folder_create: PanoptoFolderCreateResult;
  session_update: PanoptoSessionUpdateResult;
  session_move: PanoptoSessionMoveResult;
}
