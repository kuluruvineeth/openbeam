export type VoiceMode = "idle" | "dictation" | "action";

export type AgentState =
  | "disconnected"
  | "connecting"
  | "initializing"
  | "listening"
  | "thinking"
  | "speaking";

export type DictationEvent = {
  type: "dictation_text";
  text: string;
  final: boolean;
};

export type NavigationEvent = {
  type: "navigate";
  destination: string;
};

export type VoiceDataEvent = DictationEvent | NavigationEvent;
