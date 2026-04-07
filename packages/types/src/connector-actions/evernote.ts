export interface EvernoteNoteCreateResult {
  noteGuid: unknown;
  url: string | undefined;
}

export interface EvernoteNoteUpdateResult {
  noteGuid: unknown;
}

export interface EvernoteNoteDeleteResult {
  noteGuid: unknown;
}

export interface EvernoteActionResults {
  note_create: EvernoteNoteCreateResult;
  note_update: EvernoteNoteUpdateResult;
  note_delete: EvernoteNoteDeleteResult;
}
