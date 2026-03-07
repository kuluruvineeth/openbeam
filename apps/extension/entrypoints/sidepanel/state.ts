import type {
  ExtensionActionExecution,
  ExtensionActionProposal,
} from "@openbeam/types/services/extension/actions";

export interface ActionQueueItem {
  proposal: ExtensionActionProposal;
  execution: ExtensionActionExecution | null;
}

export interface SidepanelStreamState {
  isStreaming: boolean;
  chunks: string[];
}

export interface SidepanelState {
  sessionId: string;
  prompt: string;
  status: string;
  error: string | null;
  queue: ActionQueueItem[];
  stream: SidepanelStreamState;
}

export type SidepanelAction =
  | { type: "set_prompt"; prompt: string }
  | { type: "set_status"; status: string }
  | { type: "set_error"; error: string | null }
  | { type: "clear_error" }
  | { type: "action_proposed"; proposal: ExtensionActionProposal }
  | { type: "action_status"; execution: ExtensionActionExecution }
  | { type: "stream_started" }
  | { type: "stream_chunk"; chunk: string }
  | { type: "stream_finished" };

export function createInitialSidepanelState(sessionId: string): SidepanelState {
  return {
    sessionId,
    prompt: "",
    status: "Idle",
    error: null,
    queue: [],
    stream: {
      isStreaming: false,
      chunks: [],
    },
  };
}

export function sidepanelReducer(
  state: SidepanelState,
  action: SidepanelAction
): SidepanelState {
  switch (action.type) {
    case "set_prompt":
      return {
        ...state,
        prompt: action.prompt,
      };
    case "set_status":
      return {
        ...state,
        status: action.status,
      };
    case "set_error":
      return {
        ...state,
        error: action.error,
      };
    case "clear_error":
      return {
        ...state,
        error: null,
      };
    case "action_proposed":
      return {
        ...state,
        queue: [{ proposal: action.proposal, execution: null }, ...state.queue],
      };
    case "action_status":
      return {
        ...state,
        queue: state.queue.map((item) =>
          item.proposal.actionId === action.execution.actionId
            ? { ...item, execution: action.execution }
            : item
        ),
      };
    case "stream_started":
      return {
        ...state,
        stream: {
          isStreaming: true,
          chunks: [],
        },
      };
    case "stream_chunk":
      return {
        ...state,
        stream: {
          ...state.stream,
          chunks: [...state.stream.chunks, action.chunk],
        },
      };
    case "stream_finished":
      return {
        ...state,
        stream: {
          ...state.stream,
          isStreaming: false,
        },
      };
    default:
      return state;
  }
}
