import type { BotResponse } from "@openbeam/types/bot";
import type { InlineKeyboardButton, InlineKeyboardMarkup } from "grammy/types";
import {
  buildSourceLine,
  confidenceEmoji,
  expertSummary,
  followUpLabels,
  resultSnippet,
  truncate,
} from "./shared";

export interface TelegramPayload {
  text: string;
  parse_mode: "HTML";
  reply_markup?: InlineKeyboardMarkup;
}

export function renderTelegram(response: BotResponse): TelegramPayload {
  const text = renderHtml(response);
  const keyboard = buildKeyboard(response);
  return {
    text: truncate(text, 4096),
    parse_mode: "HTML",
    ...(keyboard && { reply_markup: keyboard }),
  };
}

function renderHtml(response: BotResponse): string {
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
      return `⚠ ${esc(response.text)}`;
    case "link_prompt":
      return esc(response.text);
    default:
      return esc(response.text);
  }
}

function renderSearchResults(response: BotResponse): string {
  const title = `<b>${esc(response.title ?? "Search Results")}</b>`;
  const items = (response.results ?? []).slice(0, 5).map((item, i) => {
    const name = item.url
      ? `<a href="${esc(item.url)}">${esc(item.title)}</a>`
      : `<b>${esc(item.title)}</b>`;
    const snippet = resultSnippet(item, 120);
    return `${i + 1}. ${name}\n${esc(snippet)}`;
  });
  return `${title}\n\n${items.join("\n\n")}`;
}

function renderAnswer(response: BotResponse): string {
  const prefix = confidenceEmoji(response.confidence);
  const lines = [esc(`${prefix}${response.text}`)];
  const citations = response.citations ?? [];
  if (citations.length > 0) {
    const sourceLine = buildSourceLine(
      citations,
      (url, text) => `<a href="${esc(url)}">${esc(text)}</a>`
    );
    lines.push("", `<i>${sourceLine}</i>`);
  }
  return lines.join("\n");
}

function renderExperts(response: BotResponse): string {
  const title = `<b>${esc(response.title ?? "Experts")}</b>`;
  const items = (response.experts ?? []).slice(0, 5).map((e) => {
    const email = e.email ? ` (${esc(e.email)})` : "";
    return `<b>${esc(e.name)}</b>${email}\n${esc(expertSummary(e))}`;
  });
  return `${title}\n\n${items.join("\n\n")}`;
}

function renderActionResult(response: BotResponse): string {
  const result = response.actionResult;
  if (!result) {
    return esc(response.text);
  }
  const icon = result.success ? "✓" : "✗";
  return `${icon} <b>${esc(result.action)}</b>: ${esc(result.message)}`;
}

function buildKeyboard(response: BotResponse): InlineKeyboardMarkup | null {
  const rows: InlineKeyboardButton[][] = [];

  if (response.buttons && response.buttons.length > 0) {
    const buttonRow: InlineKeyboardButton[] = response.buttons.map((btn) => ({
      text: btn.label,
      callback_data: btn.action.slice(0, 64),
    }));
    rows.push(buttonRow);
  }

  const labels = followUpLabels(response);
  for (const label of labels) {
    rows.push([
      { text: truncate(label, 64), callback_data: `fup:${label.slice(0, 55)}` },
    ]);
  }

  if (response.responseId) {
    rows.push([
      {
        text: "\ud83d\udc4d",
        callback_data: `fb:up:${response.responseId.slice(0, 50)}`,
      },
      {
        text: "\ud83d\udc4e",
        callback_data: `fb:dn:${response.responseId.slice(0, 50)}`,
      },
    ]);
  }

  return rows.length > 0 ? { inline_keyboard: rows } : null;
}

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
