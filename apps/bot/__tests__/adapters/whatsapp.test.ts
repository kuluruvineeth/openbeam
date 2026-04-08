import { describe, expect, it } from "bun:test";
import {
  handleWhatsAppVerification,
  WhatsAppAdapter,
} from "../../src/adapters/whatsapp";

describe("WhatsAppAdapter", () => {
  const adapter = new WhatsAppAdapter();

  describe("verifySignature", () => {
    it("returns false when app secret is missing", () => {
      const result = adapter.verifySignature("body", {});
      expect(result).toBe(false);
    });

    it("returns false when signature header is missing", () => {
      const result = adapter.verifySignature("body", {
        "x-hub-signature-256": "",
      });
      expect(result).toBe(false);
    });
  });

  describe("parseEvent", () => {
    it("parses a text message", async () => {
      const payload = {
        object: "whatsapp_business_account",
        entry: [
          {
            id: "entry-1",
            changes: [
              {
                field: "messages",
                value: {
                  messaging_product: "whatsapp",
                  metadata: {
                    phone_number_id: "PN1",
                    display_phone_number: "+1",
                  },
                  messages: [
                    {
                      id: "wamid.123",
                      from: "15551234567",
                      timestamp: "1700000000",
                      type: "text",
                      text: { body: "hello" },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };
      const result = await adapter.parseEvent(payload, {});
      expect(result).not.toBeNull();
      expect(result?.text).toBe("hello");
      expect(result?.platformUserId).toBe("15551234567");
      expect(result?.platformTeamId).toBe("entry-1");
      expect(result?.isDirectMessage).toBe(true);
    });

    it("returns null for non-whatsapp payloads", async () => {
      const result = await adapter.parseEvent({ object: "other" }, {});
      expect(result).toBeNull();
    });

    it("returns null when no messages present", async () => {
      const payload = {
        object: "whatsapp_business_account",
        entry: [
          {
            id: "e1",
            changes: [
              {
                field: "messages",
                value: {
                  messaging_product: "whatsapp",
                  metadata: {
                    phone_number_id: "P1",
                    display_phone_number: "+1",
                  },
                },
              },
            ],
          },
        ],
      };
      const result = await adapter.parseEvent(payload, {});
      expect(result).toBeNull();
    });
  });
});

describe("handleWhatsAppVerification", () => {
  it("returns challenge on valid subscribe request", () => {
    const result = handleWhatsAppVerification(
      "subscribe",
      process.env.WHATSAPP_VERIFY_TOKEN ?? null,
      "challenge-123"
    );
    if (process.env.WHATSAPP_VERIFY_TOKEN) {
      expect(result).toBe("challenge-123");
    } else {
      expect(result).toBeNull();
    }
  });

  it("returns null on invalid mode", () => {
    const result = handleWhatsAppVerification("invalid", "tok", "challenge");
    expect(result).toBeNull();
  });
});
