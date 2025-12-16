import { z } from "zod";

export const ShortcutTypeSchema = z.enum([
  "save_to_openplane",
  "summarize_thread",
  "search_context",
  "share_answer",
]);

export type ShortcutType = z.infer<typeof ShortcutTypeSchema>;

export interface MessageContext {
  channelId: string;
  messageTs: string;
  threadTs?: string;
  userId: string;
  messageText?: string;
  messageAuthor?: string;
  teamId: string;
  connectorId: string;
}

export interface ShortcutResult {
  success: boolean;
  message?: string;
  data?: unknown;
  error?: string;
}

export interface ThreadSummary {
  summary: string;
  keyPoints: string[];
  participants: string[];
  messageCount: number;
  actionItems: string[];
}

export interface SavedMessageData {
  id: string;
  channelId: string;
  messageTs: string;
  text: string;
  author: string;
  url: string;
  savedAt: number;
}

export const SHORTCUT_CALLBACK_IDS = {
  SAVE_TO_OPENPLANE: "save_message",
  SUMMARIZE_THREAD: "summarize_thread",
  SEARCH_CONTEXT: "search_context",
  SHARE_ANSWER: "share_answer",
} as const;

export const SHORTCUT_LABELS: Record<ShortcutType, string> = {
  save_to_openplane: "Save to OpenPlane",
  summarize_thread: "Summarize Thread",
  search_context: "Search with Context",
  share_answer: "Share Answer",
};

export const SHORTCUT_DESCRIPTIONS: Record<ShortcutType, string> = {
  save_to_openplane: "Save this message for quick access later",
  summarize_thread: "Get an AI summary of this thread",
  search_context: "Search using this message as context",
  share_answer: "Share the AI-generated answer to the channel",
};
