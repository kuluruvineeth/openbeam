import type { BotResponse, SearchResultItem } from "@openbeam/types/bot";
import { InteractionResponseType } from "discord-api-types/v10";
import {
  buildSourceLine,
  confidenceEmoji,
  expertSummary,
  followUpLabels,
  resultSnippet,
  truncate,
} from "./shared";

const COLOR_INFO = 0x34_98_db;
const COLOR_SUCCESS = 0x57_f2_87;
const COLOR_ERROR = 0xed_42_45;
const COLOR_MUTED = 0x95_a5_a6;

interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface Embed {
  color: number;
  title?: string;
  description?: string;
  fields?: EmbedField[];
  footer?: { text: string };
}

interface Component {
  type: number;
  components?: Record<string, unknown>[];
}

export interface DiscordPayload {
  type: number;
  data: {
    embeds?: Embed[];
    components?: Component[];
    content?: string;
    flags?: number;
  };
}

export function renderDiscord(response: BotResponse): DiscordPayload {
  const embed = renderEmbed(response);
  const components = buildFollowUpRow(response);
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      embeds: [embed],
      ...(components.length > 0 && { components }),
    },
  };
}

function renderEmbed(response: BotResponse): Embed {
  switch (response.type) {
    case "search_results":
      return searchResultsEmbed(response);
    case "answer":
      return answerEmbed(response);
    case "expert_list":
      return expertEmbed(response);
    case "action_result":
      return actionEmbed(response);
    case "error":
      return { color: COLOR_ERROR, description: response.text };
    default:
      return { color: COLOR_MUTED, description: response.text };
  }
}

function searchResultsEmbed(response: BotResponse): Embed {
  const results = (response.results ?? []).slice(0, 5);
  return {
    color: COLOR_INFO,
    title: truncate(response.title ?? "Search Results", 256),
    description: results.map(formatResult).join("\n\n"),
    footer: { text: `${results.length} results` },
  };
}

function formatResult(item: SearchResultItem, i: number): string {
  const title = item.url ? `[${item.title}](${item.url})` : `**${item.title}**`;
  const snippet = resultSnippet(item, 100);
  return `**${i + 1}.** ${title}\n${snippet}`;
}

function answerEmbed(response: BotResponse): Embed {
  const prefix = confidenceEmoji(response.confidence);
  const citations = response.citations ?? [];
  const sourceLine = buildSourceLine(
    citations,
    (url, text) => `[${text}](${url})`
  );
  return {
    color: COLOR_INFO,
    description: truncate(`${prefix}${response.text}`, 4096),
    ...(sourceLine && { footer: { text: sourceLine } }),
  };
}

function expertEmbed(response: BotResponse): Embed {
  const fields: EmbedField[] = (response.experts ?? [])
    .slice(0, 10)
    .map((e) => ({
      name: e.name,
      value: expertSummary(e),
      inline: true,
    }));
  return {
    color: COLOR_INFO,
    title: truncate(response.title ?? "Experts", 256),
    fields,
  };
}

function actionEmbed(response: BotResponse): Embed {
  const result = response.actionResult;
  if (!result) {
    return { color: COLOR_MUTED, description: response.text };
  }
  return {
    color: result.success ? COLOR_SUCCESS : COLOR_ERROR,
    title: result.action,
    description: result.message,
  };
}

function buildFollowUpRow(response: BotResponse): Component[] {
  const labels = followUpLabels(response);
  if (labels.length === 0) {
    return [];
  }
  return [
    {
      type: 1,
      components: labels.map((label, i) => ({
        type: 2,
        style: 2,
        label: truncate(label, 80),
        custom_id: `followup_${i}`,
      })),
    },
  ];
}
