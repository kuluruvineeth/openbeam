import { z } from "zod";

export const SidebarContextSchema = z.object({
  channelId: z.string(),
  channelName: z.string().optional(),
  channelType: z.enum(["channel", "group", "im", "mpim"]),
  teamId: z.string(),
  userId: z.string(),
  threadTs: z.string().optional(),
});

export type SidebarContext = z.infer<typeof SidebarContextSchema>;

export const SidebarPromptTypeSchema = z.enum([
  "channel_summary",
  "thread_summary",
  "recent_decisions",
  "action_items",
  "knowledge_search",
  "quick_answer",
]);

export type SidebarPromptType = z.infer<typeof SidebarPromptTypeSchema>;

export const SidebarPromptSchema = z.object({
  id: z.string(),
  type: SidebarPromptTypeSchema,
  label: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
  query: z.string(),
});

export type SidebarPrompt = z.infer<typeof SidebarPromptSchema>;

export interface SidebarSuggestion {
  id: string;
  title: string;
  preview: string;
  url?: string;
  documentType?: string;
  relevanceScore: number;
}

export interface SidebarResponse {
  content: string;
  suggestions: SidebarSuggestion[];
  sources: Array<{
    title: string;
    url?: string;
  }>;
  promptUsed: SidebarPrompt;
  generatedAt: Date;
}

export interface ThreadContext {
  channelId: string;
  threadTs: string;
  userId: string;
  title?: string;
}

export const SIDEBAR_CALLBACK_IDS = {
  PROMPT_SELECT: "sidebar_prompt_select",
  SUGGESTION_CLICK: "sidebar_suggestion_click",
  SEARCH_SUBMIT: "sidebar_search_submit",
  FEEDBACK: "sidebar_feedback",
} as const;
