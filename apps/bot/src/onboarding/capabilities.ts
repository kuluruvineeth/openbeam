import type { CapabilityHint } from "@openbeam/types/bot";

export const CAPABILITY_HINTS: CapabilityHint[] = [
  {
    id: "find_experts",
    trigger: "post_search",
    message: "Want to know who's the expert on this topic?",
    actionLabel: "Find experts",
    cooldownDays: 7,
    maxShows: 1,
    stages: ["TOURIST", "EVALUATOR"],
  },
  {
    id: "daily_digest",
    trigger: "query_milestone",
    message: "Get a daily briefing with what matters to you.",
    actionLabel: "Enable digest",
    cooldownDays: 30,
    maxShows: 1,
    stages: ["EVALUATOR", "ADOPTER"],
  },
  {
    id: "connect_more_sources",
    trigger: "post_zero_results",
    message: "No results? Connect more data sources for better coverage.",
    actionLabel: "View connectors",
    cooldownDays: 3,
    maxShows: 3,
    stages: ["TOURIST", "EVALUATOR"],
  },
  {
    id: "memory_aware",
    trigger: "repeated_query",
    message: "I remember your previous searches. Try refining your question.",
    cooldownDays: 30,
    maxShows: 1,
    stages: ["EVALUATOR", "ADOPTER"],
  },
  {
    id: "cross_tool_search",
    trigger: "connector_mention",
    message:
      "I search across all your tools at once — no need to specify where.",
    cooldownDays: 14,
    maxShows: 2,
    stages: ["TOURIST", "EVALUATOR"],
  },
];
