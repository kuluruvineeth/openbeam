import type { BotResponse } from "@openbeam/types/bot";
import {
  buildSourceLine,
  citationLine,
  confidenceEmoji,
  expertSummary,
  followUpLabels,
  resultSnippet,
  truncate,
} from "./shared";

type Block = Record<string, unknown>;

export interface SlackPayload {
  text: string;
  blocks: Block[];
  thread_ts?: string;
}

export function renderSlack(response: BotResponse): SlackPayload {
  const blocks = renderBlocks(response);

  if (response.buttons && response.buttons.length > 0) {
    blocks.push(
      actions(
        response.buttons.map((btn) => ({
          type: "button",
          text: {
            type: "plain_text",
            text: truncate(btn.label, 75),
            emoji: true,
          },
          action_id: btn.action,
          value: btn.value,
          ...(btn.style === "primary" && { style: "primary" }),
          ...(btn.style === "danger" && { style: "danger" }),
        }))
      )
    );
  }

  const followUps = followUpLabels(response);
  if (followUps.length > 0) {
    blocks.push(divider());
    blocks.push(actions(followUps.map(followUpButton)));
  }
  if (response.responseId) {
    blocks.push(feedbackActions(response.responseId));
  }
  return { text: response.text, blocks };
}

function feedbackActions(responseId: string): Block {
  return {
    type: "actions",
    block_id: `feedback_${responseId.slice(0, 20)}`,
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: "\ud83d\udc4d", emoji: true },
        action_id: "feedback_thumbs_up",
        value: `up:${responseId}`,
      },
      {
        type: "button",
        text: { type: "plain_text", text: "\ud83d\udc4e", emoji: true },
        action_id: "feedback_thumbs_down",
        value: `down:${responseId}`,
      },
    ],
  };
}

function renderBlocks(response: BotResponse): Block[] {
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
      return [section(`:warning: ${esc(response.text)}`)];
    case "link_prompt":
      return [section(esc(response.text))];
    default:
      return [section(esc(response.text))];
  }
}

function renderSearchResults(response: BotResponse): Block[] {
  const blocks: Block[] = [header(response.title ?? "Search Results")];
  for (const item of (response.results ?? []).slice(0, 5)) {
    const title = item.url
      ? `<${item.url}|*${esc(item.title)}*>`
      : `*${esc(item.title)}*`;
    const snippet = resultSnippet(item);
    blocks.push(section(`${title}\n${esc(snippet)}`));
  }
  return blocks;
}

function renderAnswer(response: BotResponse): Block[] {
  const blocks: Block[] = [];
  const prefix = confidenceEmoji(response.confidence);
  blocks.push(section(`${prefix}${esc(response.text)}`));

  const citations = response.citations ?? [];
  if (citations.length > 0) {
    blocks.push(divider());
    const line = buildSourceLine(citations, (url, text) => `<${url}|${text}>`);
    blocks.push(context(line));
    const details = citations
      .slice(0, 5)
      .map((c) => esc(citationLine(c)))
      .join("\n");
    blocks.push(context(details));
  }
  return blocks;
}

function renderExperts(response: BotResponse): Block[] {
  const blocks: Block[] = [header(response.title ?? "Experts")];
  for (const expert of (response.experts ?? []).slice(0, 5)) {
    const email = expert.email ? ` (${esc(expert.email)})` : "";
    const summary = expertSummary(expert);
    blocks.push(section(`*${esc(expert.name)}*${email}\n${esc(summary)}`));
  }
  return blocks;
}

function renderActionResult(response: BotResponse): Block[] {
  const result = response.actionResult;
  if (!result) {
    return [section(response.text)];
  }
  const icon = result.success ? ":white_check_mark:" : ":x:";
  return [section(`${icon} *${esc(result.action)}*: ${esc(result.message)}`)];
}

function header(text: string): Block {
  return {
    type: "header",
    text: { type: "plain_text", text: truncate(text, 150), emoji: true },
  };
}

function section(mrkdwn: string): Block {
  return {
    type: "section",
    text: { type: "mrkdwn", text: truncate(mrkdwn, 3000) },
  };
}

function context(mrkdwn: string): Block {
  return {
    type: "context",
    elements: [{ type: "mrkdwn", text: truncate(mrkdwn, 3000) }],
  };
}

function divider(): Block {
  return { type: "divider" };
}

function actions(elements: Block[]): Block {
  return { type: "actions", elements };
}

function followUpButton(label: string): Block {
  return {
    type: "button",
    text: { type: "plain_text", text: truncate(label, 75), emoji: true },
    action_id: `followup_${label.slice(0, 50).replace(/\s/g, "_")}`,
    value: label,
  };
}

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
