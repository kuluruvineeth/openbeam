export interface NiceCxoneContactNoteResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface NiceCxoneContactSignalCreateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface NiceCxoneAgentStateUpdateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface NiceCxoneActionResults {
  contact_note: NiceCxoneContactNoteResult;
  contact_signal_create: NiceCxoneContactSignalCreateResult;
  agent_state_update: NiceCxoneAgentStateUpdateResult;
}
