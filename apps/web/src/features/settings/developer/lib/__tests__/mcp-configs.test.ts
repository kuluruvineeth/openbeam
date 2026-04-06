import { describe, expect, it } from "bun:test";
import { MCP_CLIENTS, MCP_SERVER_URL } from "../mcp-configs";

const TEST_API_KEY = "op_live_test123";
const TEST_URL = "https://api.openbeam.work/mcp";

const OAUTH_CLIENT_IDS = new Set(["claude-desktop", "chatgpt"]);
const JSON_CLIENT_IDS = new Set([
  "cursor",
  "windsurf",
  "vscode",
  "cline",
  "continue",
]);

describe("MCP_SERVER_URL", () => {
  it("is a non-empty string", () => {
    expect(typeof MCP_SERVER_URL).toBe("string");
    expect(MCP_SERVER_URL.length).toBeGreaterThan(0);
  });
});

describe("MCP_CLIENTS", () => {
  it("has unique client IDs", () => {
    const ids = MCP_CLIENTS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes Continue and OpenCode", () => {
    const ids = MCP_CLIENTS.map((c) => c.id);
    expect(ids).toContain("continue");
    expect(ids).toContain("opencode");
  });

  it("covers all 10 supported clients", () => {
    expect(MCP_CLIENTS.length).toBe(10);
  });

  for (const client of MCP_CLIENTS) {
    describe(client.name, () => {
      const generated = client.configGenerator(TEST_API_KEY, TEST_URL);

      it("generates a non-empty configuration", () => {
        expect(generated.length).toBeGreaterThan(0);
      });

      it("references the server URL", () => {
        expect(generated).toContain(TEST_URL);
      });

      it("mentions openbeam by name", () => {
        expect(generated.toLowerCase()).toContain("openbeam");
      });

      if (!OAUTH_CLIENT_IDS.has(client.id)) {
        it("embeds the API key in the config", () => {
          expect(generated).toContain(TEST_API_KEY);
        });
      }

      if (JSON_CLIENT_IDS.has(client.id)) {
        it("returns valid JSON", () => {
          expect(() => JSON.parse(generated)).not.toThrow();
        });
      }

      it("defines at least one setup step", () => {
        expect(client.setupSteps.length).toBeGreaterThan(0);
        for (const step of client.setupSteps) {
          expect(step.length).toBeGreaterThan(0);
        }
      });
    });
  }
});

describe("MCP_CLIENTS deep links", () => {
  it("cursor deep link uses cursor:// scheme with encoded config", () => {
    const cursor = MCP_CLIENTS.find((c) => c.id === "cursor");
    expect(cursor?.deepLink).toBeDefined();
    const link = cursor?.deepLink?.(TEST_API_KEY, TEST_URL) ?? "";
    expect(link.startsWith("cursor://")).toBe(true);
    expect(link).toContain("name=openbeam");
    expect(link).toContain("config=");
  });
});
