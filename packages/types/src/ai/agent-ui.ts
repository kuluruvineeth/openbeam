import { z } from "zod";
import { ToolCategorySchema } from "../common/errors";
import { AgentEventSchema, ToolVisibilitySchema } from "./streaming";

export const PartStateSchema = z.enum([
  "input-pending",
  "input-streaming",
  "input-available",
  "output-available",
  "output-error",
]);

export type PartState = z.infer<typeof PartStateSchema>;

export const ChatStatusSchema = z.enum([
  "idle",
  "streaming",
  "submitted",
  "ready",
  "error",
]);

export type ChatStatus = z.infer<typeof ChatStatusSchema>;

export const UIToolStatusSchema = z.object({
  isPending: z.boolean(),
  isSuccess: z.boolean(),
  isError: z.boolean(),
  isInterrupted: z.boolean(),
});

export type UIToolStatus = z.infer<typeof UIToolStatusSchema>;

export const CollapsibleStateSchema = z.object({
  isExpanded: z.boolean(),
  isCollapsed: z.boolean(),
  wasAutoCollapsed: z.boolean(),
  canToggle: z.boolean(),
});

export type CollapsibleState = z.infer<typeof CollapsibleStateSchema>;

export const StreamingTextStateSchema = z.object({
  content: z.string(),
  isStreaming: z.boolean(),
  cursorPosition: z.number().optional(),
});

export type StreamingTextState = z.infer<typeof StreamingTextStateSchema>;

export const EventUIStateSchema = z.object({
  id: z.string(),
  partState: PartStateSchema,
  collapsible: CollapsibleStateSchema.optional(),
  durationMs: z.number().optional(),
});

export type EventUIState = z.infer<typeof EventUIStateSchema>;

export const ToolDisplayMetaSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  description: z.string(),
  icon: z.string(),
  iconColor: z.string().optional(),
  category: ToolCategorySchema,
  visibility: ToolVisibilitySchema.default("visible"),
  isExpandable: z.boolean().default(true),
  renderAs: z
    .enum(["default", "search", "code", "chart", "table", "custom"])
    .default("default"),
});

export type ToolDisplayMeta = z.infer<typeof ToolDisplayMetaSchema>;

export const UIEnrichedEventSchema = z.object({
  event: AgentEventSchema,
  uiState: EventUIStateSchema,
  displayMeta: ToolDisplayMetaSchema.optional(),
});

export type UIEnrichedEvent = z.infer<typeof UIEnrichedEventSchema>;

export const AgentMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  events: z.array(UIEnrichedEventSchema),
  status: ChatStatusSchema,
  createdAt: z.number(),
  updatedAt: z.number().optional(),
});

export type AgentMessage = z.infer<typeof AgentMessageSchema>;

export const AgentConversationSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  messages: z.array(AgentMessageSchema),
  status: ChatStatusSchema,
  createdAt: z.number(),
  updatedAt: z.number().optional(),
});

export type AgentConversation = z.infer<typeof AgentConversationSchema>;

export const UICitationSchema = z.object({
  index: z.number(),
  documentId: z.string(),
  title: z.string(),
  url: z.string().optional(),
  snippet: z.string(),
  connectorType: z.string().optional(),
  relevanceScore: z.number().min(0).max(1),
});

export type UICitation = z.infer<typeof UICitationSchema>;

export const AgentUIConfigSchema = z.object({
  autoCollapseThinkingMs: z.number().default(300),
  autoCollapseToolsOnComplete: z.boolean().default(true),
  showToolInputsDefault: z.boolean().default(false),
  showTimingInfo: z.boolean().default(true),
  enableKeyboardShortcuts: z.boolean().default(true),
  maxVisibleToolCalls: z.number().default(5),
  streamingTextCursorEnabled: z.boolean().default(true),
  citationLinkBehavior: z
    .enum(["preview", "navigate", "modal"])
    .default("preview"),
});

export type AgentUIConfig = z.infer<typeof AgentUIConfigSchema>;

export const AgentUIStateSchema = z.object({
  conversationId: z.string(),
  status: ChatStatusSchema,
  inputValue: z.string(),
  isInputFocused: z.boolean(),
  expandedEvents: z.set(z.string()),
  collapsedEvents: z.set(z.string()),
  activeCitationIndex: z.number().nullable(),
  scrollPosition: z.number(),
  config: AgentUIConfigSchema,
});

export type AgentUIState = z.infer<typeof AgentUIStateSchema>;

export const ToolRegistryEntrySchema = z.object({
  name: z.string(),
  displayMeta: ToolDisplayMetaSchema,
  isEnabled: z.boolean().default(true),
  order: z.number().default(0),
});

export type ToolRegistryEntry = z.infer<typeof ToolRegistryEntrySchema>;
