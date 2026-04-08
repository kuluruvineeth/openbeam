import { describe, expect, it } from "bun:test";
import { InteractionType } from "discord-api-types/v10";
import {
  DISCORD_PING_RESPONSE,
  DiscordAdapter,
} from "../../src/adapters/discord";

describe("DiscordAdapter", () => {
  const adapter = new DiscordAdapter();

  describe("DISCORD_PING_RESPONSE", () => {
    it("has type 1 for pong", () => {
      expect(DISCORD_PING_RESPONSE.type).toBe(1);
    });
  });

  describe("parseEvent", () => {
    it("returns null for PING interactions", async () => {
      const result = await adapter.parseEvent(
        { type: InteractionType.Ping },
        {}
      );
      expect(result).toBeNull();
    });

    it("parses application command into UnifiedMessage", async () => {
      const interaction = {
        type: InteractionType.ApplicationCommand,
        id: "int-1",
        token: "tok-1",
        guild_id: "G1",
        channel_id: "C1",
        member: { user: { id: "U1", username: "alice" } },
        data: {
          name: "search",
          options: [{ type: 3, name: "query", value: "deploy docs" }],
        },
      };
      const result = await adapter.parseEvent(interaction, {});
      expect(result).not.toBeNull();
      expect(result?.command).toBe("search");
      expect(result?.text).toBe("deploy docs");
      expect(result?.platformUserId).toBe("U1");
      expect(result?.platformTeamId).toBe("G1");
      expect(result?.isDirectMessage).toBe(false);
    });

    it("detects DM when guild_id is absent", async () => {
      const interaction = {
        type: InteractionType.ApplicationCommand,
        id: "int-2",
        token: "tok-2",
        channel_id: "C1",
        user: { id: "U2", username: "bob" },
        data: { name: "ask", options: [] },
      };
      const result = await adapter.parseEvent(interaction, {});
      expect(result?.isDirectMessage).toBe(true);
      expect(result?.platformUserId).toBe("U2");
    });

    it("returns null for unknown interaction types", async () => {
      const result = await adapter.parseEvent({ type: 99 }, {});
      expect(result).toBeNull();
    });
  });
});
