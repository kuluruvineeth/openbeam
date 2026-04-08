import type {
  BotPlatform,
  BotResponse,
  ExpertItem,
  SearchResultItem,
} from "@openbeam/types/bot";
import { PLATFORM_CONFIGS } from "@openbeam/types/bot";

const MARKDOWNV2_ESCAPE_RE = /([_*[\]()~`>#+\-=|{}.!])/g;

export function formatForPlatform(
  platform: BotPlatform,
  response: BotResponse
): string {
  const config = PLATFORM_CONFIGS[platform];
  const renderer = RENDERERS[platform] ?? RENDERERS.WHATSAPP;
  const raw = renderResponse(response, renderer);
  return truncate(raw, config.maxMessageLength);
}

interface Renderer {
  bold(text: string): string;
  link(url: string, text: string): string;
  italic(text: string): string;
  escape(text: string): string;
}

const slackRenderer: Renderer = {
  bold: (t) => `*${t}*`,
  link: (url, text) => `<${url}|${text}>`,
  italic: (t) => `_${t}_`,
  escape: (t) => t,
};

const markdownRenderer: Renderer = {
  bold: (t) => `**${t}**`,
  link: (url, text) => `[${text}](${url})`,
  italic: (t) => `_${t}_`,
  escape: (t) => t,
};

const telegramRenderer: Renderer = {
  bold: (t) => `*${escapeMarkdownV2(t)}*`,
  link: (url, text) => `[${escapeMarkdownV2(text)}](${url})`,
  italic: (t) => `_${escapeMarkdownV2(t)}_`,
  escape: escapeMarkdownV2,
};

const plainRenderer: Renderer = {
  bold: (t) => `*${t}*`,
  link: (_url, text) => text,
  italic: (t) => t,
  escape: (t) => t,
};

const RENDERERS: Record<BotPlatform, Renderer> = {
  SLACK: slackRenderer,
  TEAMS: markdownRenderer,
  DISCORD: markdownRenderer,
  TELEGRAM: telegramRenderer,
  WHATSAPP: plainRenderer,
};

export function escapeMarkdownV2(text: string): string {
  return text.replace(MARKDOWNV2_ESCAPE_RE, "\\$1");
}

function renderResponse(response: BotResponse, r: Renderer): string {
  switch (response.type) {
    case "search_results":
      return renderSearchResults(response, r);
    case "answer":
      return renderAnswer(response, r);
    case "expert_list":
      return renderExperts(response, r);
    case "action_result":
      return renderActionResult(response, r);
    case "error":
      return `${r.escape("Error:")} ${r.escape(response.text)}`;
    case "link_prompt":
      return r.escape(response.text);
    default:
      return r.escape(response.text);
  }
}

function renderSearchResults(response: BotResponse, r: Renderer): string {
  const header = r.bold(response.title ?? "Search Results");
  const items = (response.results ?? [])
    .map((item, i) => formatResultItem(item, i + 1, r))
    .join("\n\n");
  return `${header}\n\n${items}`;
}

function formatResultItem(
  item: SearchResultItem,
  index: number,
  r: Renderer
): string {
  const title = item.url ? r.link(item.url, item.title) : r.bold(item.title);
  return `${index}. ${title}\n${r.escape(item.snippet)}`;
}

function renderAnswer(response: BotResponse, r: Renderer): string {
  const sources = (response.results ?? [])
    .slice(0, 3)
    .map((s) => (s.url ? r.link(s.url, s.title) : r.escape(s.title)))
    .join(" | ");

  const answer = r.escape(response.text);
  return sources ? `${answer}\n\n${r.italic(`Sources: ${sources}`)}` : answer;
}

function renderExperts(response: BotResponse, r: Renderer): string {
  const header = r.bold(response.title ?? "Experts");
  const items = (response.experts ?? [])
    .map((e) => formatExpertItem(e, r))
    .join("\n\n");
  return `${header}\n\n${items}`;
}

function formatExpertItem(expert: ExpertItem, r: Renderer): string {
  const email = expert.email ? ` (${r.escape(expert.email)})` : "";
  const skills = r.escape(expert.expertise.join(", "));
  return `${r.bold(expert.name)}${email}\n${skills} — ${expert.documentCount} docs`;
}

function renderActionResult(response: BotResponse, r: Renderer): string {
  const result = response.actionResult;
  if (!result) {
    return r.escape(response.text);
  }
  const icon = result.success ? "+" : "x";
  return `[${icon}] ${r.escape(result.action)}: ${r.escape(result.message)}`;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 3)}...`;
}
