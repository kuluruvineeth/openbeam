import { describe, expect, test } from "bun:test";
import { renderDiscordNotification } from "../renderers/discord";
import { renderSlackNotification } from "../renderers/slack";
import { renderTeamsNotification } from "../renderers/teams";
import { renderTelegramNotification } from "../renderers/telegram";
import { renderWhatsAppNotification } from "../renderers/whatsapp";

const BASE_PAYLOAD = {
  connectorName: "Slack",
  message: "Connection timed out",
  url: "https://app.openbeam.work/connectors/123",
};

describe("renderSlackNotification", () => {
  test("renders critical event with blocks", () => {
    const result = renderSlackNotification(
      "connector.auth.expired",
      BASE_PAYLOAD
    );
    expect(result.text).toContain("Authentication Expired");
    expect(result.blocks.length).toBeGreaterThanOrEqual(2);
    expect(result.blocks[0]).toHaveProperty("type", "section");
  });

  test("includes settings link in context block", () => {
    const result = renderSlackNotification(
      "connector.sync.failed",
      BASE_PAYLOAD
    );
    const hasPrefs = result.blocks.some(
      (b) =>
        (b as { type: string }).type === "context" &&
        JSON.stringify(b).includes("Manage preferences")
    );
    expect(hasPrefs).toBe(true);
  });

  test("includes view details when url provided", () => {
    const result = renderSlackNotification(
      "connector.sync.failed",
      BASE_PAYLOAD
    );
    const hasActions = result.blocks.some(
      (b) => (b as { type: string }).type === "actions"
    );
    expect(hasActions).toBe(true);
  });

  test("skips view details without url", () => {
    const result = renderSlackNotification("connector.sync.failed", {
      connectorName: "Slack",
    });
    const hasActions = result.blocks.some(
      (b) => (b as { type: string }).type === "actions"
    );
    expect(hasActions).toBe(false);
  });
});

describe("renderDiscordNotification", () => {
  test("renders embed with correct color for warning", () => {
    const result = renderDiscordNotification(
      "connector.sync.failed",
      BASE_PAYLOAD
    );
    expect(result.embeds).toHaveLength(1);
    expect(result.embeds[0]?.color).toBe(0xf5_a6_23);
    expect(result.embeds[0]?.description).toContain("Slack");
  });

  test("renders embed with correct color for critical", () => {
    const result = renderDiscordNotification(
      "connector.auth.expired",
      BASE_PAYLOAD
    );
    expect(result.embeds[0]?.color).toBe(0xed_42_45);
  });

  test("includes url button when url provided", () => {
    const result = renderDiscordNotification(
      "connector.sync.failed",
      BASE_PAYLOAD
    );
    expect(result.components).toHaveLength(1);
  });
});

describe("renderTelegramNotification", () => {
  test("renders HTML with bold title", () => {
    const result = renderTelegramNotification(
      "connector.sync.failed",
      BASE_PAYLOAD
    );
    expect(result.parse_mode).toBe("HTML");
    expect(result.text).toContain("<b>");
    expect(result.text).toContain("Sync Failed");
  });

  test("includes inline keyboard with url", () => {
    const result = renderTelegramNotification(
      "connector.sync.failed",
      BASE_PAYLOAD
    );
    expect(result.reply_markup).toBeTruthy();
    const keyboard = result.reply_markup?.inline_keyboard ?? [];
    expect(keyboard.length).toBeGreaterThan(0);
    expect(JSON.stringify(keyboard[0])).toContain(BASE_PAYLOAD.url);
  });
});

describe("renderWhatsAppNotification", () => {
  test("renders cta_url when url provided", () => {
    const result = renderWhatsAppNotification(
      "+1234567890",
      "connector.sync.failed",
      BASE_PAYLOAD
    );
    expect(result.to).toBe("+1234567890");
    expect(result.type).toBe("interactive");
    expect((result.interactive as Record<string, unknown>).type).toBe(
      "cta_url"
    );
  });

  test("renders text message without url", () => {
    const result = renderWhatsAppNotification(
      "+1234567890",
      "connector.sync.failed",
      { connectorName: "Slack" }
    );
    expect(result.type).toBe("text");
  });
});

describe("renderTeamsNotification", () => {
  test("renders adaptive card", () => {
    const result = renderTeamsNotification(
      "connector.sync.failed",
      BASE_PAYLOAD
    );
    expect(result.type).toBe("message");
    expect(result.attachments).toHaveLength(1);
    expect(result.attachments[0]?.content.type).toBe("AdaptiveCard");
    expect((result.attachments[0]?.content.body.length ?? 0) >= 2).toBe(true);
  });

  test("includes open url action when url provided", () => {
    const result = renderTeamsNotification(
      "connector.sync.failed",
      BASE_PAYLOAD
    );
    expect(result.attachments[0]?.content.actions).toHaveLength(1);
  });

  test("no actions without url", () => {
    const result = renderTeamsNotification("connector.sync.failed", {
      connectorName: "Slack",
    });
    expect(result.attachments[0]?.content.actions).toBeUndefined();
  });
});
