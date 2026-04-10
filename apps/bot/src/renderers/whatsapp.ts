import type { BotResponse } from "@openbeam/types/bot";
import {
  confidenceEmoji,
  expertSummary,
  followUpLabels,
  resultSnippet,
  truncate,
} from "./shared";

const MAX_BODY = 1024;
const MAX_TEXT = 4096;
const MAX_ROW_TITLE = 24;
const MAX_ROW_DESC = 72;
const MAX_LIST_ROWS = 10;
const MAX_BUTTON_TITLE = 20;
const MAX_BUTTONS = 3;

type Payload = Record<string, unknown>;

export function renderWhatsApp(to: string, response: BotResponse): Payload {
  if (
    response.type === "search_results" &&
    (response.results?.length ?? 0) > 0
  ) {
    return listPayload(to, response);
  }
  const text = renderText(response);

  if (response.responseId) {
    const feedbackLabels = ["\ud83d\udc4d Helpful", "\ud83d\udc4e Not helpful"];
    const followUp = followUpLabels(response).slice(0, 1);
    return feedbackButtonPayload(to, text, response.responseId, [
      ...feedbackLabels,
      ...followUp,
    ]);
  }

  const followUps = followUpLabels(response);
  if (followUps.length > 0) {
    return buttonPayload(to, text, followUps);
  }
  return textPayload(to, text);
}

function feedbackButtonPayload(
  to: string,
  text: string,
  responseId: string,
  labels: string[]
): Payload {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: truncate(text, MAX_BODY) },
      action: {
        buttons: labels.slice(0, MAX_BUTTONS).map((label, i) => ({
          type: "reply",
          reply: {
            id:
              i < 2
                ? `fb_${i === 0 ? "up" : "dn"}_${responseId.slice(0, 40)}`
                : `fup_${label.slice(0, 40)}`,
            title: truncate(label, MAX_BUTTON_TITLE),
          },
        })),
      },
    },
  };
}

export function typingPayload(messageId: string): Payload {
  return {
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId,
    typing_indicator: { type: "text" },
  };
}

function renderText(response: BotResponse): string {
  switch (response.type) {
    case "search_results":
      return renderSearchText(response);
    case "answer":
      return renderAnswerText(response);
    case "expert_list":
      return renderExpertText(response);
    case "action_result":
      return renderActionText(response);
    case "error":
      return `⚠ ${response.text}`;
    default:
      return response.text;
  }
}

function renderSearchText(response: BotResponse): string {
  const lines = [`*${response.title ?? "Search Results"}*`, ""];
  for (const [i, item] of (response.results ?? []).slice(0, 5).entries()) {
    const snippet = resultSnippet(item, 100);
    lines.push(`${i + 1}. *${item.title}*`);
    lines.push(snippet);
    if (item.url) {
      lines.push(item.url);
    }
    lines.push("");
  }
  return truncate(lines.join("\n").trim(), MAX_TEXT);
}

function renderAnswerText(response: BotResponse): string {
  const prefix = confidenceEmoji(response.confidence);
  const lines = [`${prefix}${response.text}`];
  const citations = response.citations ?? [];
  if (citations.length > 0) {
    lines.push("");
    lines.push("_Sources_");
    for (const c of citations.slice(0, 5)) {
      lines.push(
        c.url ? `[${c.index}] ${c.title} — ${c.url}` : `[${c.index}] ${c.title}`
      );
    }
  }
  return truncate(lines.join("\n"), MAX_TEXT);
}

function renderExpertText(response: BotResponse): string {
  const lines = [`*${response.title ?? "Experts"}*`, ""];
  for (const e of (response.experts ?? []).slice(0, 5)) {
    const email = e.email ? ` (${e.email})` : "";
    lines.push(`*${e.name}*${email}`);
    lines.push(expertSummary(e));
    lines.push("");
  }
  return truncate(lines.join("\n").trim(), MAX_TEXT);
}

function renderActionText(response: BotResponse): string {
  const result = response.actionResult;
  if (!result) {
    return response.text;
  }
  const icon = result.success ? "✓" : "✗";
  return `${icon} *${result.action}*: ${result.message}`;
}

function textPayload(to: string, text: string): Payload {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { body: truncate(text, MAX_TEXT) },
  };
}

function buttonPayload(to: string, text: string, labels: string[]): Payload {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: truncate(text, MAX_BODY) },
      action: {
        buttons: labels.slice(0, MAX_BUTTONS).map((label) => ({
          type: "reply",
          reply: {
            id: `fup_${label.slice(0, 50)}`,
            title: truncate(label, MAX_BUTTON_TITLE),
          },
        })),
      },
    },
  };
}

function listPayload(to: string, response: BotResponse): Payload {
  const results = (response.results ?? []).slice(0, MAX_LIST_ROWS);
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      body: {
        text: truncate(response.title ?? "Search Results", MAX_BODY),
      },
      action: {
        button: "View Results",
        sections: [
          {
            title: "Results",
            rows: results.map((item, i) => ({
              id: `result_${i}`,
              title: truncate(item.title, MAX_ROW_TITLE),
              description: truncate(
                resultSnippet(item, MAX_ROW_DESC),
                MAX_ROW_DESC
              ),
            })),
          },
        ],
      },
    },
  };
}
