import type { BotResponse } from "@openbeam/types/bot";
import {
  confidenceEmoji,
  expertSummary,
  followUpLabels,
  resultSnippet,
  truncate,
} from "./shared";

type CardElement = Record<string, unknown>;

interface AdaptiveCard {
  type: "AdaptiveCard";
  version: "1.5";
  body: CardElement[];
  actions?: CardElement[];
}

export interface TeamsPayload {
  type: "message";
  attachments: Array<{
    contentType: string;
    content: AdaptiveCard;
  }>;
}

export function renderTeams(response: BotResponse): TeamsPayload {
  const card = buildCard(response);
  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: card,
      },
    ],
  };
}

function buildCard(response: BotResponse): AdaptiveCard {
  const body = renderBody(response);
  const actions = buildActions(response);
  return {
    type: "AdaptiveCard",
    version: "1.5",
    body,
    ...(actions.length > 0 && { actions }),
  };
}

function renderBody(response: BotResponse): CardElement[] {
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
      return [textBlock(`⚠ ${response.text}`, { color: "attention" })];
    default:
      return [textBlock(response.text)];
  }
}

function renderSearchResults(response: BotResponse): CardElement[] {
  const elements: CardElement[] = [
    textBlock(response.title ?? "Search Results", {
      weight: "bolder",
      size: "large",
    }),
  ];
  for (const item of (response.results ?? []).slice(0, 5)) {
    const snippet = resultSnippet(item, 120);
    elements.push(
      columnSet([
        column("stretch", [
          textBlock(`**${item.title}**`, { weight: "bolder" }),
          textBlock(snippet, { isSubtle: true, size: "small" }),
        ]),
      ])
    );
  }
  return elements;
}

function renderAnswer(response: BotResponse): CardElement[] {
  const prefix = confidenceEmoji(response.confidence);
  const elements: CardElement[] = [textBlock(`${prefix}${response.text}`)];
  const citations = response.citations ?? [];
  if (citations.length > 0) {
    const facts = citations.slice(0, 5).map((c) => ({
      title: `[${c.index}]`,
      value: c.title,
    }));
    elements.push({ type: "FactSet", facts });
  }
  return elements;
}

function renderExperts(response: BotResponse): CardElement[] {
  const elements: CardElement[] = [
    textBlock(response.title ?? "Experts", {
      weight: "bolder",
      size: "large",
    }),
  ];
  for (const expert of (response.experts ?? []).slice(0, 5)) {
    const subtitle = expertSummary(expert);
    elements.push(
      columnSet([
        column("stretch", [
          textBlock(`**${expert.name}**`, { weight: "bolder" }),
          textBlock(subtitle, { isSubtle: true, size: "small" }),
        ]),
      ])
    );
  }
  return elements;
}

function renderActionResult(response: BotResponse): CardElement[] {
  const result = response.actionResult;
  if (!result) {
    return [textBlock(response.text)];
  }
  const icon = result.success ? "✓" : "✗";
  return [
    textBlock(`${icon} **${result.action}**`, { weight: "bolder" }),
    textBlock(result.message),
  ];
}

function buildActions(response: BotResponse): CardElement[] {
  const labels = followUpLabels(response);
  const actions: CardElement[] = [];

  if (response.buttons) {
    for (const btn of response.buttons) {
      actions.push({
        type: "Action.Submit",
        title: btn.label,
        ...(btn.style === "primary" && { style: "positive" }),
        ...(btn.style === "danger" && { style: "destructive" }),
        data: { action: btn.action, value: btn.value },
      });
    }
  }

  for (const item of (response.results ?? []).slice(0, 3)) {
    if (item.url) {
      actions.push({
        type: "Action.OpenUrl",
        title: truncate(item.title, 40),
        url: item.url,
      });
    }
  }

  for (const label of labels) {
    actions.push({
      type: "Action.Submit",
      title: truncate(label, 40),
      data: { action: "followup", query: label },
    });
  }

  if (response.responseId) {
    actions.push(
      {
        type: "Action.Submit",
        title: "\ud83d\udc4d Helpful",
        data: { action: "feedback_up", responseId: response.responseId },
      },
      {
        type: "Action.Submit",
        title: "\ud83d\udc4e Not helpful",
        data: { action: "feedback_down", responseId: response.responseId },
      }
    );
  }

  return actions.slice(0, 6);
}

function textBlock(
  text: string,
  opts: Record<string, unknown> = {}
): CardElement {
  return { type: "TextBlock", text: truncate(text, 3000), wrap: true, ...opts };
}

function columnSet(columns: CardElement[]): CardElement {
  return { type: "ColumnSet", columns };
}

function column(width: string, items: CardElement[]): CardElement {
  return { type: "Column", width, items };
}
