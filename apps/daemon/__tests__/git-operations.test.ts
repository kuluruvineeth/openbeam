import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  createDaemonTestContext,
  createMessageCollector,
  type DaemonTestContext,
  type MessageCollector,
  TEST_MODEL,
  TEST_THINKING_OPTION_ID,
  tmpCwd,
  waitForCondition,
} from "./e2e-helpers.js";

async function withTimeout<T>(options: {
  promise: Promise<T>;
  timeoutMs: number;
  label: string;
}): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(
        new Error(`Timed out after ${options.timeoutMs}ms (${options.label})`)
      );
    }, options.timeoutMs);
  });
  try {
    return await Promise.race([options.promise, timeout]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

async function waitForPathRemoved(options: {
  targetPath: string;
  timeoutMs: number;
  label: string;
}): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < options.timeoutMs) {
    if (!existsSync(options.targetPath)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(
    `Timed out after ${options.timeoutMs}ms waiting for removal of ${options.label}: ${options.targetPath}`
  );
}

describe("daemon E2E - git operations", () => {
  let ctx: DaemonTestContext;
  let collector: MessageCollector;

  beforeEach(async () => {
    ctx = await createDaemonTestContext();
    collector = createMessageCollector(ctx.client);
  });

  afterEach(async () => {
    collector.unsubscribe();
    await ctx.cleanup();
  });

  describe("getCheckoutDiff", () => {
    test("returns diff for modified file in git repo", async () => {
      const cwd = tmpCwd();

      try {
        const { execSync } = await import("node:child_process");
        execSync("git init -b main", { cwd, stdio: "pipe" });
        execSync("git config user.email 'test@test.com'", {
          cwd,
          stdio: "pipe",
        });
        execSync("git config user.name 'Test'", { cwd, stdio: "pipe" });

        const testFile = join(cwd, "test.txt");
        writeFileSync(testFile, "original content\n");
        execSync("git add test.txt", { cwd, stdio: "pipe" });
        execSync("git -c commit.gpgsign=false commit -m 'Initial commit'", {
          cwd,
          stdio: "pipe",
        });

        writeFileSync(testFile, "modified content\n");

        const result = await ctx.client.getCheckoutDiff(cwd, {
          mode: "uncommitted",
        });
        expect(result.error).toBeNull();
        expect(result.files.length).toBeGreaterThan(0);
        const file = result.files.find((entry) => entry.path === "test.txt");
        expect(file).toBeTruthy();
        expect(file?.hunks.length).toBeGreaterThan(0);
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    }, 60_000);

    test("returns empty diff when no changes", async () => {
      const cwd = tmpCwd();

      try {
        const { execSync } = await import("node:child_process");
        execSync("git init -b main", { cwd, stdio: "pipe" });
        execSync("git config user.email 'test@test.com'", {
          cwd,
          stdio: "pipe",
        });
        execSync("git config user.name 'Test'", { cwd, stdio: "pipe" });

        const testFile = join(cwd, "test.txt");
        writeFileSync(testFile, "content\n");
        execSync("git add test.txt", { cwd, stdio: "pipe" });
        execSync("git -c commit.gpgsign=false commit -m 'Initial commit'", {
          cwd,
          stdio: "pipe",
        });

        const result = await ctx.client.getCheckoutDiff(cwd, {
          mode: "uncommitted",
        });

        expect(result.error).toBeNull();
        expect(result.files).toEqual([]);
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    }, 60_000);

    test("returns error for non-git directory", async () => {
      const cwd = tmpCwd();

      try {
        const result = await ctx.client.getCheckoutDiff(cwd, {
          mode: "uncommitted",
        });

        expect(result.files).toEqual([]);
        expect(result.error).toBeTruthy();
        expect(result.error?.code).toBe("NOT_GIT_REPO");
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    }, 60_000);
  });

  describe("getCheckoutStatus", () => {
    test("returns repo info for git repo with branch and dirty state", async () => {
      const cwd = tmpCwd();

      try {
        const { execSync } = await import("node:child_process");
        execSync("git init -b main", { cwd, stdio: "pipe" });
        execSync("git config user.email 'test@test.com'", {
          cwd,
          stdio: "pipe",
        });
        execSync("git config user.name 'Test'", { cwd, stdio: "pipe" });

        const testFile = join(cwd, "test.txt");
        writeFileSync(testFile, "original content\n");
        execSync("git add test.txt", { cwd, stdio: "pipe" });
        execSync("git -c commit.gpgsign=false commit -m 'Initial commit'", {
          cwd,
          stdio: "pipe",
        });

        writeFileSync(testFile, "modified content\n");

        const agent = await ctx.client.createAgent({
          provider: "codex",
          model: TEST_MODEL,
          thinkingOptionId: TEST_THINKING_OPTION_ID,
          cwd,
          title: "Git Repo Info Test",
        });

        expect(agent.id).toBeTruthy();
        expect(agent.status).toBe("idle");

        const result = await ctx.client.getCheckoutStatus(cwd);

        expect(result.error).toBeNull();
        expect(result.isGit).toBe(true);
        expect(result.repoRoot).toContain("daemon-e2e-");
        expect(result.currentBranch).toBeTruthy();
        expect(result.isDirty).toBe(true);

        await ctx.client.deleteAgent(agent.id);
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    }, 60_000);

    test("returns clean state when no uncommitted changes", async () => {
      const cwd = tmpCwd();

      try {
        const { execSync } = await import("node:child_process");
        execSync("git init -b main", { cwd, stdio: "pipe" });
        execSync("git config user.email 'test@test.com'", {
          cwd,
          stdio: "pipe",
        });
        execSync("git config user.name 'Test'", { cwd, stdio: "pipe" });

        const testFile = join(cwd, "test.txt");
        writeFileSync(testFile, "content\n");
        execSync("git add test.txt", { cwd, stdio: "pipe" });
        execSync("git -c commit.gpgsign=false commit -m 'Initial commit'", {
          cwd,
          stdio: "pipe",
        });

        const agent = await ctx.client.createAgent({
          provider: "codex",
          model: TEST_MODEL,
          thinkingOptionId: TEST_THINKING_OPTION_ID,
          cwd,
          title: "Git Repo Info Clean Test",
        });

        expect(agent.id).toBeTruthy();

        const result = await ctx.client.getCheckoutStatus(cwd);

        expect(result.error).toBeNull();
        expect(result.isGit).toBe(true);
        expect(result.isDirty).toBe(false);
        expect(result.currentBranch).toBeTruthy();

        await ctx.client.deleteAgent(agent.id);
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    }, 60_000);

    test("returns isGit false for non-git directory", async () => {
      const cwd = tmpCwd();

      try {
        const agent = await ctx.client.createAgent({
          provider: "codex",
          model: TEST_MODEL,
          thinkingOptionId: TEST_THINKING_OPTION_ID,
          cwd,
          title: "Git Repo Info Non-Git Test",
        });

        expect(agent.id).toBeTruthy();

        const result = await ctx.client.getCheckoutStatus(cwd);

        expect(result.isGit).toBe(false);

        await ctx.client.deleteAgent(agent.id);
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    }, 60_000);
  });

  describe("worktree setup", () => {
    test("runs openplane.json setup asynchronously and reports status via timeline tool_call", async () => {
      const repoRoot = tmpCwd();

      try {
        const { execSync } = await import("node:child_process");
        execSync("git init -b main", { cwd: repoRoot, stdio: "pipe" });
        execSync("git config user.email 'test@test.com'", {
          cwd: repoRoot,
          stdio: "pipe",
        });
        execSync("git config user.name 'Test'", {
          cwd: repoRoot,
          stdio: "pipe",
        });

        writeFileSync(join(repoRoot, "file.txt"), "hello\n");
        execSync("git add .", { cwd: repoRoot, stdio: "pipe" });
        execSync("git -c commit.gpgsign=false commit -m 'initial'", {
          cwd: repoRoot,
          stdio: "pipe",
        });
        execSync("git branch -M main", { cwd: repoRoot, stdio: "pipe" });

        const setupCommand =
          'while [ ! -f "$OPENPLANE_WORKTREE_PATH/allow-setup" ]; do sleep 0.05; done; echo "done" > "$OPENPLANE_WORKTREE_PATH/setup-done.txt"';
        writeFileSync(
          join(repoRoot, "openplane.json"),
          JSON.stringify({ worktree: { setup: [setupCommand] } })
        );
        execSync("git add openplane.json", { cwd: repoRoot, stdio: "pipe" });
        execSync("git -c commit.gpgsign=false commit -m 'add openplane.json'", {
          cwd: repoRoot,
          stdio: "pipe",
        });

        const agent = await withTimeout({
          promise: ctx.client.createAgent({
            provider: "codex",
            model: TEST_MODEL,
            thinkingOptionId: TEST_THINKING_OPTION_ID,
            cwd: repoRoot,
            title: "Async Worktree Setup Test",
            git: {
              createWorktree: true,
              createNewBranch: true,
              baseBranch: "main",
              newBranchName: "async-setup-test",
              worktreeSlug: "async-setup-test",
            },
          }),
          timeoutMs: 5000,
          label: "createAgent should not block on setup",
        });

        expect(agent.cwd).toContain("worktrees");
        expect(existsSync(join(agent.cwd, "setup-done.txt"))).toBe(false);

        writeFileSync(join(agent.cwd, "allow-setup"), "ok\n");

        const checkForSetupComplete = (): boolean =>
          collector.messages.some((m) => {
            if (m.type !== "agent_stream") {
              return false;
            }
            if (m.payload.agentId !== agent.id) {
              return false;
            }
            if (m.payload.event.type !== "timeline") {
              return false;
            }
            const item = m.payload.event.item;
            return (
              item.type === "tool_call" &&
              item.name === "openplane_worktree_setup" &&
              item.status === "completed"
            );
          });

        await waitForCondition(checkForSetupComplete, 20_000);

        expect(existsSync(join(agent.cwd, "setup-done.txt"))).toBe(true);

        await ctx.client.deleteAgent(agent.id);
      } finally {
        rmSync(repoRoot, { recursive: true, force: true });
      }
    }, 60_000);

    test("reports failures via timeline tool_call without deleting the created worktree", async () => {
      const repoRoot = tmpCwd();

      try {
        const { execSync } = await import("node:child_process");
        execSync("git init -b main", { cwd: repoRoot, stdio: "pipe" });
        execSync("git config user.email 'test@test.com'", {
          cwd: repoRoot,
          stdio: "pipe",
        });
        execSync("git config user.name 'Test'", {
          cwd: repoRoot,
          stdio: "pipe",
        });

        writeFileSync(join(repoRoot, "file.txt"), "hello\n");
        execSync("git add .", { cwd: repoRoot, stdio: "pipe" });
        execSync("git -c commit.gpgsign=false commit -m 'initial'", {
          cwd: repoRoot,
          stdio: "pipe",
        });
        execSync("git branch -M main", { cwd: repoRoot, stdio: "pipe" });

        const setupCommand =
          'echo "started" > "$OPENPLANE_WORKTREE_PATH/setup-start.txt"; sleep 0.1; echo "boom" 1>&2; exit 7';
        writeFileSync(
          join(repoRoot, "openplane.json"),
          JSON.stringify({
            worktree: {
              setup: [setupCommand],
              terminals: [
                {
                  name: "Should Not Start",
                  command:
                    'echo "should-not-run" > should-not-run.txt; tail -f /dev/null',
                },
              ],
            },
          })
        );
        execSync("git add openplane.json", { cwd: repoRoot, stdio: "pipe" });
        execSync("git -c commit.gpgsign=false commit -m 'add failing setup'", {
          cwd: repoRoot,
          stdio: "pipe",
        });

        const agent = await withTimeout({
          promise: ctx.client.createAgent({
            provider: "codex",
            model: TEST_MODEL,
            thinkingOptionId: TEST_THINKING_OPTION_ID,
            cwd: repoRoot,
            title: "Async Worktree Setup Failure Test",
            git: {
              createWorktree: true,
              createNewBranch: true,
              baseBranch: "main",
              newBranchName: "async-setup-failure-test",
              worktreeSlug: "async-setup-failure-test",
            },
          }),
          timeoutMs: 5000,
          label: "createAgent should not block on failing setup",
        });

        expect(agent.cwd).toContain("worktrees");
        expect(existsSync(agent.cwd)).toBe(true);

        const checkForSetupFailed = (): boolean =>
          collector.messages.some((m) => {
            if (m.type !== "agent_stream") {
              return false;
            }
            if (m.payload.agentId !== agent.id) {
              return false;
            }
            if (m.payload.event.type !== "timeline") {
              return false;
            }
            const item = m.payload.event.item;
            return (
              item.type === "tool_call" &&
              item.name === "openplane_worktree_setup" &&
              item.status === "failed"
            );
          });

        await waitForCondition(checkForSetupFailed, 20_000);

        expect(existsSync(join(agent.cwd, "setup-start.txt"))).toBe(true);
        expect(existsSync(join(agent.cwd, "should-not-run.txt"))).toBe(false);

        await ctx.client.deleteAgent(agent.id);
      } finally {
        rmSync(repoRoot, { recursive: true, force: true });
      }
    }, 60_000);
  });

  describe("createAgent with worktree", () => {
    test("creates agent in worktrees directory when worktree is requested", async () => {
      const cwd = tmpCwd();

      try {
        const { execSync } = await import("node:child_process");
        execSync("git init -b main", { cwd, stdio: "pipe" });
        execSync("git config user.email 'test@test.com'", {
          cwd,
          stdio: "pipe",
        });
        execSync("git config user.name 'Test'", { cwd, stdio: "pipe" });

        const testFile = join(cwd, "test.txt");
        writeFileSync(testFile, "content\n");
        execSync("git add test.txt", { cwd, stdio: "pipe" });
        execSync("git -c commit.gpgsign=false commit -m 'Initial commit'", {
          cwd,
          stdio: "pipe",
        });

        const agent = await ctx.client.createAgent({
          provider: "codex",
          model: TEST_MODEL,
          thinkingOptionId: TEST_THINKING_OPTION_ID,
          cwd,
          title: "Worktree Agent Test",
          git: {
            createWorktree: true,
            createNewBranch: true,
            newBranchName: "worktree-test",
            worktreeSlug: "worktree-test",
            baseBranch: "main",
          },
        });

        expect(agent.id).toBeTruthy();
        expect(agent.status).toBe("idle");
        expect(agent.cwd).toContain("worktrees");
        expect(agent.cwd).toContain("worktree-test");
        expect(existsSync(agent.cwd)).toBe(true);

        await ctx.client.deleteAgent(agent.id);
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    }, 60_000);
  });

  describe("archiveDaemonWorktree", () => {
    test("archives worktree when the last agent in it is archived", async () => {
      const repoRoot = tmpCwd();

      try {
        const { execSync } = await import("node:child_process");
        execSync("git init -b main", { cwd: repoRoot, stdio: "pipe" });
        execSync("git config user.email 'test@test.com'", {
          cwd: repoRoot,
          stdio: "pipe",
        });
        execSync("git config user.name 'Test'", {
          cwd: repoRoot,
          stdio: "pipe",
        });

        writeFileSync(join(repoRoot, "file.txt"), "hello\n");
        execSync("git add .", { cwd: repoRoot, stdio: "pipe" });
        execSync("git -c commit.gpgsign=false commit -m 'initial'", {
          cwd: repoRoot,
          stdio: "pipe",
        });
        execSync("git branch -M main", { cwd: repoRoot, stdio: "pipe" });

        const agent = await ctx.client.createAgent({
          provider: "codex",
          model: TEST_MODEL,
          thinkingOptionId: TEST_THINKING_OPTION_ID,
          cwd: repoRoot,
          title: "Archive Last Agent Cleanup Test",
          git: {
            createWorktree: true,
            createNewBranch: true,
            baseBranch: "main",
            newBranchName: "archive-last-agent",
            worktreeSlug: "archive-last-agent",
          },
        });

        expect(existsSync(agent.cwd)).toBe(true);

        const result = await ctx.client.archiveAgent(agent.id);
        expect(result.archivedAt).toBeTruthy();

        await waitForPathRemoved({
          targetPath: agent.cwd,
          timeoutMs: 10_000,
          label: "archived worktree",
        });
      } finally {
        rmSync(repoRoot, { recursive: true, force: true });
      }
    }, 60_000);

    test("does not archive the worktree until all agents in it are archived", async () => {
      const repoRoot = tmpCwd();

      try {
        const { execSync } = await import("node:child_process");
        execSync("git init -b main", { cwd: repoRoot, stdio: "pipe" });
        execSync("git config user.email 'test@test.com'", {
          cwd: repoRoot,
          stdio: "pipe",
        });
        execSync("git config user.name 'Test'", {
          cwd: repoRoot,
          stdio: "pipe",
        });

        writeFileSync(join(repoRoot, "file.txt"), "hello\n");
        execSync("git add .", { cwd: repoRoot, stdio: "pipe" });
        execSync("git -c commit.gpgsign=false commit -m 'initial'", {
          cwd: repoRoot,
          stdio: "pipe",
        });
        execSync("git branch -M main", { cwd: repoRoot, stdio: "pipe" });

        const firstAgent = await ctx.client.createAgent({
          provider: "codex",
          model: TEST_MODEL,
          thinkingOptionId: TEST_THINKING_OPTION_ID,
          cwd: repoRoot,
          title: "Archive Multi-Agent Test 1",
          git: {
            createWorktree: true,
            createNewBranch: true,
            baseBranch: "main",
            newBranchName: "archive-multi-agent",
            worktreeSlug: "archive-multi-agent",
          },
        });

        const secondAgent = await ctx.client.createAgent({
          provider: "codex",
          model: TEST_MODEL,
          thinkingOptionId: TEST_THINKING_OPTION_ID,
          cwd: firstAgent.cwd,
          title: "Archive Multi-Agent Test 2",
        });

        expect(existsSync(firstAgent.cwd)).toBe(true);

        await ctx.client.archiveAgent(firstAgent.id);

        await new Promise((resolve) => setTimeout(resolve, 300));
        expect(existsSync(firstAgent.cwd)).toBe(true);

        await ctx.client.archiveAgent(secondAgent.id);

        await waitForPathRemoved({
          targetPath: firstAgent.cwd,
          timeoutMs: 10_000,
          label: "worktree after final agent archive",
        });
      } finally {
        rmSync(repoRoot, { recursive: true, force: true });
      }
    }, 60_000);
  });
});
