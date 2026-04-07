import type {
  BotPlatform,
  BotResponse,
  SearchResultItem,
} from "@openbeam/types/bot";
import { PLATFORM_CONFIGS } from "@openbeam/types/bot";

export function formatForPlatform(
  platform: BotPlatform,
  response: BotResponse
): string {
  const config = PLATFORM_CONFIGS[platform];
  const raw = renderResponse(response);
  return truncate(raw, config.maxMessageLength);
}

function renderResponse(response: BotResponse): string {
  switch (response.type) {
    case "search_results":
      return renderSearchResults(response);
    case "answer":
      return renderAnswer(response);
    case "expert_list":
      return renderExperts(response);
    case "action_result":
      return renderActionResult(response);
    case "error":
      return `Error: ${response.text}`;
    case "link_prompt":
      return response.text;
    default:
      return response.text;
  }
}

function renderSearchResults(response: BotResponse): string {
  const header = response.title ?? "Search Results";
  const items = (response.results ?? [])
    .map((r, i) => formatResultItem(r, i + 1))
    .join("\n\n");
  return `*${header}*\n\n${items}`;
}

function formatResultItem(item: SearchResultItem, index: number): string {
  const link = item.url ? `<${item.url}|${item.title}>` : item.title;
  return `${index}. *${link}*\n${item.snippet}`;
}

function renderAnswer(response: BotResponse): string {
  const sources = (response.results ?? [])
    .slice(0, 3)
    .map((s) => (s.url ? `<${s.url}|${s.title}>` : s.title))
    .join(" | ");

  const answer = response.text;
  return sources ? `${answer}\n\n_Sources: ${sources}_` : answer;
}

function renderExperts(response: BotResponse): string {
  const experts = (response.experts ?? [])
    .map(
      (e) =>
        `*${e.name}*${e.email ? ` (${e.email})` : ""}\n${e.expertise.join(", ")} — ${e.documentCount} docs`
    )
    .join("\n\n");
  return `*${response.title ?? "Experts"}*\n\n${experts}`;
}

function renderActionResult(response: BotResponse): string {
  const r = response.actionResult;
  if (!r) {
    return response.text;
  }
  const icon = r.success ? "+" : "x";
  return `[${icon}] ${r.action}: ${r.message}`;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 3)}...`;
}
