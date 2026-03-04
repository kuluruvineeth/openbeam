import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  createDaemonTestContext,
  type DaemonTestContext,
} from "../test-utils/index";

function _tmpCwd(): string {
  return mkdtempSync(path.join(tmpdir(), "daemon-e2e-"));
}

const _CODEX_TEST_MODEL = "gpt-5.1-codex-mini";

function isBinaryInstalled(binary: string): boolean {
  try {
    const out = execFileSync("which", [binary], { encoding: "utf8" }).trim();
    return out.length > 0;
  } catch {
    return false;
  }
}

const hasCodex = isBinaryInstalled("codex");
const hasOpenCode = isBinaryInstalled("opencode");

describe("daemon E2E", () => {
  let ctx: DaemonTestContext;

  beforeEach(async () => {
    ctx = await createDaemonTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  }, 60_000);

  describe("listProviderModels", () => {
    test.runIf(hasCodex)(
      "returns model list for Codex provider",
      async () => {
        // List models for Codex provider - no agent needed
        const result = await ctx.client.listProviderModels("codex");

        // Verify response structure
        expect(result.provider).toBe("codex");
        expect(result.error).toBeNull();
        expect(result.fetchedAt).toBeTruthy();

        // Should return at least one model
        expect(result.models).toBeTruthy();
        expect(result.models.length).toBeGreaterThan(0);

        // Verify model structure
        const model = result.models[0];
        expect(model.provider).toBe("codex");
        expect(model.id).toBeTruthy();
        expect(model.label).toBeTruthy();
      },
      60_000 // 1 minute timeout
    );

    test("returns model list for Claude provider", async () => {
      // List models for Claude provider - no agent needed
      const result = await ctx.client.listProviderModels("claude");

      // Verify response structure
      expect(result.provider).toBe("claude");
      expect(result.error).toBeNull();
      expect(result.fetchedAt).toBeTruthy();

      // Should return at least one model
      expect(result.models).toBeTruthy();
      expect(result.models.length).toBeGreaterThan(0);

      // Verify model structure
      const model = result.models[0];
      expect(model.provider).toBe("claude");
      expect(model.id).toBeTruthy();
      expect(model.label).toBeTruthy();
    }, 60_000); // 1 minute timeout

    test.runIf(hasOpenCode)(
      "returns model list for OpenCode provider",
      async () => {
        const result = await ctx.client.listProviderModels("opencode");

        expect(result.provider).toBe("opencode");
        expect(result.error).toBeNull();
        expect(result.fetchedAt).toBeTruthy();

        expect(result.models).toBeTruthy();
        expect(result.models.length).toBeGreaterThan(0);

        const model = result.models[0];
        expect(model.provider).toBe("opencode");
        expect(model.id).toBeTruthy();
        expect(model.label).toBeTruthy();
      },
      60_000
    );
  });
});
