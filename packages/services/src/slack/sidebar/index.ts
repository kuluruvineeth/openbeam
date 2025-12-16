export {
  buildSidebarPromptBlocks,
  buildSidebarResponseBlocks,
  handleSidebarPromptSelect,
  handleSidebarSearch,
  type SidebarHandlerDeps,
  type SidebarPromptSelectParams,
  type SidebarSearchParams,
  setSuggestedPrompts,
  setThreadStatus,
  setThreadTitle,
} from "./handler";
export {
  buildPromptQuery,
  createCustomPrompt,
  getContextualPrompts,
  getPromptById,
} from "./prompts";
export {
  type AssistantThreadContextChangedEvent,
  type AssistantThreadStartedEvent,
  handleAssistantContextChanged,
  handleAssistantThreadStarted,
} from "./thread-handler";

export type {
  SidebarContext,
  SidebarPrompt,
  SidebarPromptType,
  SidebarResponse,
  SidebarSuggestion,
  ThreadContext,
} from "./types";

export {
  SIDEBAR_CALLBACK_IDS,
  SidebarContextSchema,
  SidebarPromptSchema,
  SidebarPromptTypeSchema,
} from "./types";
