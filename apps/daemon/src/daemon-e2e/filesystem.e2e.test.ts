import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  createDaemonTestContext,
  type DaemonTestContext,
} from "../test-utils/index.js";

function tmpCwd(): string {
  return mkdtempSync(path.join(tmpdir(), "daemon-e2e-"));
}

// Use gpt-5.1-codex-mini with low thinking preset for faster test execution
const CODEX_TEST_MODEL = "gpt-5.1-codex-mini";
const CODEX_TEST_THINKING_OPTION_ID = "low";

describe("daemon E2E", () => {
  let ctx: DaemonTestContext;

  beforeEach(async () => {
    ctx = await createDaemonTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  }, 60_000);

  describe("exploreFileSystem", () => {
    test("lists directory contents", async () => {
      const cwd = tmpCwd();

      // Create test files and directories
      writeFileSync(path.join(cwd, "test.txt"), "hello world\n");
      writeFileSync(path.join(cwd, "data.json"), '{"key": "value"}\n');
      mkdirSync(path.join(cwd, "subdir"));
      writeFileSync(path.join(cwd, "subdir", "nested.txt"), "nested content\n");

      // Create agent in the directory
      const agent = await ctx.client.createAgent({
        provider: "codex",
        model: CODEX_TEST_MODEL,
        thinkingOptionId: CODEX_TEST_THINKING_OPTION_ID,
        cwd,
        title: "File Explorer Test",
      });

      expect(agent.id).toBeTruthy();
      expect(agent.status).toBe("idle");

      // List directory contents
      const result = await ctx.client.exploreFileSystem(agent.id, cwd, "list");

      // Verify listing returned without error
      expect(result.error).toBeNull();
      expect(result.mode).toBe("list");
      expect(result.directory).toBeTruthy();
      expect(result.directory?.entries).toBeTruthy();

      // Find expected entries
      const entries = result.directory?.entries;
      const testTxt = entries.find((e) => e.name === "test.txt");
      const dataJson = entries.find((e) => e.name === "data.json");
      const subdir = entries.find((e) => e.name === "subdir");

      expect(testTxt).toBeTruthy();
      expect(testTxt?.kind).toBe("file");
      expect(testTxt?.size).toBeGreaterThan(0);

      expect(dataJson).toBeTruthy();
      expect(dataJson?.kind).toBe("file");

      expect(subdir).toBeTruthy();
      expect(subdir?.kind).toBe("directory");

      // Cleanup
      await ctx.client.deleteAgent(agent.id);
      rmSync(cwd, { recursive: true, force: true });
    }, 60_000); // 1 minute timeout

    test("reads file contents", async () => {
      const cwd = tmpCwd();
      const testContent = "This is test file content.\nLine 2.";
      const testFile = path.join(cwd, "readme.txt");
      writeFileSync(testFile, testContent);

      // Create agent in the directory
      const agent = await ctx.client.createAgent({
        provider: "codex",
        model: CODEX_TEST_MODEL,
        thinkingOptionId: CODEX_TEST_THINKING_OPTION_ID,
        cwd,
        title: "File Read Test",
      });

      expect(agent.id).toBeTruthy();

      // Read file contents
      const result = await ctx.client.exploreFileSystem(
        agent.id,
        testFile,
        "file"
      );

      // Verify file read
      expect(result.error).toBeNull();
      expect(result.mode).toBe("file");
      expect(result.file).toBeTruthy();
      // Server may return basename or full path
      expect(result.file?.path).toContain("readme.txt");
      expect(result.file?.kind).toBe("text");
      expect(result.file?.content).toBe(testContent);
      expect(result.file?.size).toBe(testContent.length);

      // Cleanup
      await ctx.client.deleteAgent(agent.id);
      rmSync(cwd, { recursive: true, force: true });
    }, 60_000); // 1 minute timeout

    test("returns error for non-existent path", async () => {
      const cwd = tmpCwd();

      // Create agent
      const agent = await ctx.client.createAgent({
        provider: "codex",
        model: CODEX_TEST_MODEL,
        thinkingOptionId: CODEX_TEST_THINKING_OPTION_ID,
        cwd,
        title: "File Explorer Error Test",
      });

      expect(agent.id).toBeTruthy();

      // Try to list non-existent path
      const nonExistent = path.join(cwd, "does-not-exist");
      const result = await ctx.client.exploreFileSystem(
        agent.id,
        nonExistent,
        "list"
      );

      // Should return error
      expect(result.error).toBeTruthy();

      // Cleanup
      await ctx.client.deleteAgent(agent.id);
      rmSync(cwd, { recursive: true, force: true });
    }, 60_000); // 1 minute timeout
  });
});
