import type { SidebarContext, SidebarPrompt, SidebarPromptType } from "./types";

const BASE_PROMPTS: Record<SidebarPromptType, Omit<SidebarPrompt, "id">> = {
  channel_summary: {
    type: "channel_summary",
    label: "Summarize this channel",
    description: "Get a summary of recent activity",
    icon: "📋",
    query: "Summarize the recent activity and key discussions in this channel",
  },
  thread_summary: {
    type: "thread_summary",
    label: "Summarize this thread",
    description: "Get a quick summary of the thread",
    icon: "💬",
    query: "Summarize this thread conversation",
  },
  recent_decisions: {
    type: "recent_decisions",
    label: "Recent decisions",
    description: "Find decisions made in discussions",
    icon: "✅",
    query: "What decisions were made recently in this channel?",
  },
  action_items: {
    type: "action_items",
    label: "Action items",
    description: "Extract tasks and follow-ups",
    icon: "📝",
    query: "What action items or tasks were mentioned in this channel?",
  },
  knowledge_search: {
    type: "knowledge_search",
    label: "Search knowledge",
    description: "Search across all connected sources",
    icon: "🔍",
    query: "",
  },
  quick_answer: {
    type: "quick_answer",
    label: "Quick answer",
    description: "Ask a question about this channel",
    icon: "💡",
    query: "",
  },
};

export function getContextualPrompts(context: SidebarContext): SidebarPrompt[] {
  const prompts: SidebarPrompt[] = [];

  if (context.threadTs) {
    prompts.push({
      ...BASE_PROMPTS.thread_summary,
      id: `thread_summary_${context.threadTs}`,
    });
  }

  if (context.channelType === "channel" || context.channelType === "group") {
    prompts.push(
      {
        ...BASE_PROMPTS.channel_summary,
        id: `channel_summary_${context.channelId}`,
      },
      {
        ...BASE_PROMPTS.recent_decisions,
        id: `recent_decisions_${context.channelId}`,
      },
      {
        ...BASE_PROMPTS.action_items,
        id: `action_items_${context.channelId}`,
      }
    );
  }

  prompts.push(
    {
      ...BASE_PROMPTS.knowledge_search,
      id: `knowledge_search_${context.channelId}`,
    },
    {
      ...BASE_PROMPTS.quick_answer,
      id: `quick_answer_${context.channelId}`,
    }
  );

  return prompts;
}

export function buildPromptQuery(
  prompt: SidebarPrompt,
  context: SidebarContext,
  customQuery?: string
): string {
  if (customQuery) {
    return customQuery;
  }

  const channelRef = context.channelName
    ? `#${context.channelName}`
    : context.channelId;

  switch (prompt.type) {
    case "channel_summary":
      return `Summarize the recent activity and key discussions in ${channelRef}`;
    case "thread_summary":
      return "Summarize the conversation in this thread";
    case "recent_decisions":
      return `What decisions were made recently in ${channelRef}?`;
    case "action_items":
      return `What action items or tasks were mentioned in ${channelRef}?`;
    default:
      return prompt.query;
  }
}

export function getPromptById(promptId: string): SidebarPrompt | undefined {
  const promptType = Object.keys(BASE_PROMPTS).find((key) =>
    promptId.startsWith(key)
  ) as SidebarPromptType | undefined;

  if (!(promptType && BASE_PROMPTS[promptType])) {
    return;
  }

  return {
    ...BASE_PROMPTS[promptType],
    id: promptId,
  };
}

export function createCustomPrompt(
  type: SidebarPromptType,
  query: string,
  _context: SidebarContext
): SidebarPrompt {
  const base = BASE_PROMPTS[type];
  return {
    ...base,
    id: `${type}_custom_${Date.now()}`,
    query,
  };
}
