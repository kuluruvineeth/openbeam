import { describe, expect, it } from "bun:test";
import {
  parseFeedbackAction,
  parseFeedbackCallbackData,
  parseWhatsAppFeedbackId,
} from "../../src/handlers/feedback";

describe("parseFeedbackAction", () => {
  it("parses thumbs up value", () => {
    const result = parseFeedbackAction("up:resp-123");
    expect(result).toEqual({ rating: "up", responseId: "resp-123" });
  });

  it("parses thumbs down value", () => {
    const result = parseFeedbackAction("down:resp-456");
    expect(result).toEqual({ rating: "down", responseId: "resp-456" });
  });

  it("returns null for unknown format", () => {
    expect(parseFeedbackAction("other:value")).toBeNull();
    expect(parseFeedbackAction("")).toBeNull();
  });
});

describe("parseFeedbackCallbackData", () => {
  it("parses Telegram up callback", () => {
    const result = parseFeedbackCallbackData("fb:up:resp-123");
    expect(result).toEqual({ rating: "up", responseId: "resp-123" });
  });

  it("parses Telegram down callback", () => {
    const result = parseFeedbackCallbackData("fb:dn:resp-456");
    expect(result).toEqual({ rating: "down", responseId: "resp-456" });
  });

  it("returns null for follow-up callbacks", () => {
    expect(parseFeedbackCallbackData("fup:search for deploy")).toBeNull();
  });
});

describe("parseWhatsAppFeedbackId", () => {
  it("parses WhatsApp up button", () => {
    const result = parseWhatsAppFeedbackId("fb_up_resp-123");
    expect(result).toEqual({ rating: "up", responseId: "resp-123" });
  });

  it("parses WhatsApp down button", () => {
    const result = parseWhatsAppFeedbackId("fb_dn_resp-456");
    expect(result).toEqual({ rating: "down", responseId: "resp-456" });
  });

  it("returns null for follow-up buttons", () => {
    expect(parseWhatsAppFeedbackId("fup_search")).toBeNull();
  });
});
