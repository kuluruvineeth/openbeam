import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { SessionOutboundMessage } from "@openplane/types/services/daemon/messages";
import {
  createDaemonTestContext,
  type DaemonTestContext,
  TEST_MODEL,
  TEST_THINKING_OPTION_ID,
  tmpCwd,
} from "./e2e-helpers.js";

describe("daemon E2E - permission flow: Codex", () => {
  let ctx: DaemonTestContext;
  let messages: SessionOutboundMessage[];
  let unsubscribe: (() => void) | null;

  beforeEach(async () => {
    ctx = await createDaemonTestContext();
    messages = [];
    unsubscribe = ctx.client.subscribeRawMessages((message) => {
      messages.push(message);
    });
  });

  afterEach(async () => {
    unsubscribe?.();
    await ctx.cleanup();
  });

  test("approves permission and executes command", async () => {
    const cwd = tmpCwd();
    const filePath = join(cwd, "permission.txt");

    try {
      const agent = await ctx.client.createAgent({
        provider: "codex",
        model: TEST_MODEL,
        thinkingOptionId: TEST_THINKING_OPTION_ID,
        cwd,
        title: "Codex Permission Test",
        modeId: "read-only",
      });

      expect(agent.id).toBeTruthy();
      expect(agent.status).toBe("idle");

      messages.length = 0;

      const prompt = [
        'Request approval to run the command `printf "ok" > permission.txt`.',
        "After approval, run it and reply DONE.",
      ].join(" ");

      await ctx.client.sendMessage(agent.id, prompt);

      const permissionState = await ctx.client.waitForFinish(agent.id, 60_000);
      expect(permissionState.final?.pendingPermissions?.length).toBeGreaterThan(
        0
      );
      // biome-ignore lint/suspicious/noNonNullAssertedOptionalChain: value guaranteed by prior check
      // biome-ignore lint/style/noNonNullAssertion: value guaranteed to be set
      const permission = permissionState.final?.pendingPermissions?.[0]!;
      expect(permission).not.toBeNull();
      expect(permission.id).toBeTruthy();
      expect(permission.kind).toBe("tool");

      await ctx.client.respondToPermission(agent.id, permission.id, {
        behavior: "allow",
      });

      const finalState = await ctx.client.waitForFinish(agent.id, 120_000);
      expect(finalState.status).toBe("idle");

      expect(existsSync(filePath)).toBe(true);

      const hasPermissionResolved = messages.some((m) => {
        if (m.type === "agent_stream" && m.payload.agentId === agent.id) {
          return (
            m.payload.event.type === "permission_resolved" &&
            m.payload.event.requestId === permission.id &&
            m.payload.event.resolution.behavior === "allow"
          );
        }
        return false;
      });
      expect(hasPermissionResolved).toBe(true);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  }, 180_000);

  test("denies permission and prevents execution", async () => {
    const cwd = tmpCwd();
    const filePath = join(cwd, "permission.txt");

    try {
      const agent = await ctx.client.createAgent({
        provider: "codex",
        model: TEST_MODEL,
        thinkingOptionId: TEST_THINKING_OPTION_ID,
        cwd,
        title: "Codex Permission Deny Test",
        modeId: "read-only",
      });

      expect(agent.id).toBeTruthy();

      messages.length = 0;

      const prompt = [
        'Request approval to run the command `printf "ok" > permission.txt`.',
        "If approval is denied, acknowledge and stop.",
      ].join(" ");

      await ctx.client.sendMessage(agent.id, prompt);

      const permissionState = await ctx.client.waitForFinish(agent.id, 60_000);
      expect(permissionState.final?.pendingPermissions?.length).toBeGreaterThan(
        0
      );
      // biome-ignore lint/style/noNonNullAssertion: value guaranteed to be set
      // biome-ignore lint/suspicious/noNonNullAssertedOptionalChain: value guaranteed by prior check
      const permission = permissionState.final?.pendingPermissions?.[0]!;
      expect(permission).not.toBeNull();
      expect(permission.id).toBeTruthy();

      await ctx.client.respondToPermission(agent.id, permission.id, {
        behavior: "deny",
        message: "Not allowed.",
      });

      const finalState = await ctx.client.waitForFinish(agent.id, 120_000);
      expect(finalState.status).toBe("idle");

      expect(existsSync(filePath)).toBe(false);

      const hasPermissionDenied = messages.some((m) => {
        if (m.type === "agent_stream" && m.payload.agentId === agent.id) {
          return (
            m.payload.event.type === "permission_resolved" &&
            m.payload.event.requestId === permission.id &&
            m.payload.event.resolution.behavior === "deny"
          );
        }
        return false;
      });
      expect(hasPermissionDenied).toBe(true);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  }, 180_000);

  test("completes a new turn after interrupt", async () => {
    const cwd = tmpCwd();

    try {
      const agent = await ctx.client.createAgent({
        provider: "codex",
        model: TEST_MODEL,
        thinkingOptionId: TEST_THINKING_OPTION_ID,
        cwd,
        title: "Codex Interrupt Test",
        modeId: "full-access",
      });

      expect(agent.id).toBeTruthy();
      expect(agent.currentModeId).toBe("full-access");

      messages.length = 0;
      await ctx.client.sendMessage(agent.id, "Run: sleep 30");
      await ctx.client.waitForAgentUpsert(
        agent.id,
        (snapshot) => snapshot.status === "running",
        30_000
      );

      await ctx.client.cancelAgent(agent.id);

      await ctx.client.waitForAgentUpsert(
        agent.id,
        (snapshot) => snapshot.status === "idle" || snapshot.status === "error",
        30_000
      );

      messages.length = 0;
      await ctx.client.sendMessage(
        agent.id,
        "Say 'hello from interrupt test' and nothing else."
      );

      await ctx.client.waitForFinish(agent.id, 120_000);

      const hasAssistantMessage = messages.some(
        (m) =>
          m.type === "agent_stream" &&
          m.payload.agentId === agent.id &&
          m.payload.event.type === "timeline" &&
          m.payload.event.item.type === "assistant_message"
      );
      expect(hasAssistantMessage).toBe(true);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  }, 180_000);

  test("aborting actually stops execution", async () => {
    const cwd = tmpCwd();
    const filePath = join(cwd, "abort-test-file.txt");

    try {
      const agent = await ctx.client.createAgent({
        provider: "codex",
        model: TEST_MODEL,
        thinkingOptionId: TEST_THINKING_OPTION_ID,
        cwd,
        title: "Codex Abort Stop Test",
        modeId: "full-access",
      });

      expect(agent.id).toBeTruthy();

      messages.length = 0;
      await ctx.client.sendMessage(
        agent.id,
        "Run this bash command: sleep 15 && echo 'abort-test-completed' > abort-test-file.txt"
      );

      await ctx.client.waitForAgentUpsert(
        agent.id,
        (snapshot) => snapshot.status === "running",
        30_000
      );

      await ctx.client.cancelAgent(agent.id);

      await ctx.client.waitForFinish(agent.id, 10_000);

      expect(existsSync(filePath)).toBe(false);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  }, 60_000);

  test("switching from auto to full-access mode allows writes without permission", async () => {
    const cwd = tmpCwd();
    const filePath = join(cwd, "mode-switch-test.txt");

    try {
      const agent = await ctx.client.createAgent({
        provider: "codex",
        model: TEST_MODEL,
        thinkingOptionId: TEST_THINKING_OPTION_ID,
        cwd,
        title: "Codex Mode Switch Permission Test",
        modeId: "auto",
      });

      expect(agent.id).toBeTruthy();
      expect(agent.currentModeId).toBe("auto");

      messages.length = 0;
      const writePrompt =
        'Request approval to run the command `printf "ok" > mode-switch-test.txt`. After approval, run it and stop.';

      await ctx.client.sendMessage(agent.id, writePrompt);

      const permissionState = await ctx.client.waitForFinish(agent.id, 60_000);
      expect(permissionState.final?.pendingPermissions?.length).toBeGreaterThan(
        0
      );
      // biome-ignore lint/style/noNonNullAssertion: value guaranteed to be set
      // biome-ignore lint/suspicious/noNonNullAssertedOptionalChain: value guaranteed by prior check
      const permission = permissionState.final?.pendingPermissions?.[0]!;
      expect(permission).not.toBeNull();
      expect(permission.id).toBeTruthy();

      await ctx.client.respondToPermission(agent.id, permission.id, {
        behavior: "deny",
        message: "Permission denied for test.",
      });

      await ctx.client.waitForFinish(agent.id, 120_000);

      expect(existsSync(filePath)).toBe(false);

      messages.length = 0;
      const modeStartPosition = messages.length;

      await ctx.client.setAgentMode(agent.id, "full-access");

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Timeout waiting for full-access mode change"));
        }, 15_000);

        const checkForModeChange = (): void => {
          for (let i = modeStartPosition; i < messages.length; i++) {
            // biome-ignore lint/style/noNonNullAssertion: value guaranteed to be set
            const msg = messages[i]!;
            if (
              msg.type === "agent_update" &&
              msg.payload.kind === "upsert" &&
              msg.payload.agent.id === agent.id &&
              msg.payload.agent.currentModeId === "full-access"
            ) {
              clearTimeout(timeout);
              clearInterval(interval);
              resolve();
              return;
            }
          }
        };

        const interval = setInterval(checkForModeChange, 50);
      });

      messages.length = 0;
      const writePrompt2 =
        'Run the command `printf "ok" > mode-switch-test.txt` and reply DONE.';

      await ctx.client.sendMessage(agent.id, writePrompt2);

      await ctx.client.waitForFinish(agent.id, 120_000);

      expect(existsSync(filePath)).toBe(true);
      const content = readFileSync(filePath, "utf-8");
      expect(content).toBe("ok");

      const hasPermissionRequest = messages.some(
        (m) =>
          m.type === "agent_permission_request" &&
          m.payload.agentId === agent.id
      );
      expect(hasPermissionRequest).toBe(false);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  }, 180_000);
});
