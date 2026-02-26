import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { SessionOutboundMessage } from "@openplane/types/services/daemon/messages";
import {
  createDaemonTestContext,
  type DaemonTestContext,
  tmpCwd,
} from "./e2e-helpers.js";

type CheckoutDiffUpdatePayload = Extract<
  SessionOutboundMessage,
  { type: "checkout_diff_update" }
>["payload"];

function initGitRepo(cwd: string): void {
  execSync("git init -b main", { cwd, stdio: "pipe" });
  execSync("git config user.email 'test@test.com'", { cwd, stdio: "pipe" });
  execSync("git config user.name 'Test'", { cwd, stdio: "pipe" });
}

function commitFile(cwd: string, fileName: string, content: string): void {
  const filePath = join(cwd, fileName);
  writeFileSync(filePath, content);
  execSync(`git add "${fileName}"`, { cwd, stdio: "pipe" });
  execSync("git -c commit.gpgsign=false commit -m 'Initial commit'", {
    cwd,
    stdio: "pipe",
  });
}

// biome-ignore lint/suspicious/useAwait: async signature required by interface
async function waitForCheckoutDiffUpdate(
  ctx: DaemonTestContext,
  subscriptionId: string,
  predicate: (payload: CheckoutDiffUpdatePayload) => boolean,
  timeoutMs = 15_000
): Promise<CheckoutDiffUpdatePayload> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(
        new Error(
          `Timed out waiting for checkout_diff_update (${subscriptionId})`
        )
      );
    }, timeoutMs);

    const unsubscribe = ctx.client.on("checkout_diff_update", (message) => {
      if (message.type !== "checkout_diff_update") {
        return;
      }
      if (message.payload.subscriptionId !== subscriptionId) {
        return;
      }
      if (!predicate(message.payload)) {
        return;
      }
      clearTimeout(timeout);
      unsubscribe();
      resolve(message.payload);
    });
  });
}

describe("daemon E2E - checkout diff subscriptions", () => {
  let ctx: DaemonTestContext;

  beforeEach(async () => {
    ctx = await createDaemonTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  test("pushes file-level checkout diff updates with deterministic path order", async () => {
    const cwd = tmpCwd("daemon-e2e-checkout-diff");

    try {
      initGitRepo(cwd);
      commitFile(cwd, "base.txt", "base\n");

      const subscriptionId = "checkout-diff-e2e-subscription";
      const initial = await ctx.client.subscribeCheckoutDiff(
        cwd,
        { mode: "uncommitted" },
        { subscriptionId }
      );

      expect(initial.error).toBeNull();
      expect(initial.files).toEqual([]);

      writeFileSync(join(cwd, "zeta.txt"), "zeta\n");
      writeFileSync(join(cwd, "alpha.txt"), "alpha\n");

      const update = await waitForCheckoutDiffUpdate(
        ctx,
        subscriptionId,
        (payload) => {
          const paths = payload.files.map((file) => file.path);
          return paths.includes("alpha.txt") && paths.includes("zeta.txt");
        }
      );

      expect(update.error).toBeNull();
      expect(update.files.map((file) => file.path)).toEqual([
        "alpha.txt",
        "zeta.txt",
      ]);

      ctx.client.unsubscribeCheckoutDiff(subscriptionId);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  }, 60_000);

  test("pushes updates when subscribed from a subdirectory and files change outside it", async () => {
    const cwd = tmpCwd("daemon-e2e-checkout-diff");

    try {
      initGitRepo(cwd);
      commitFile(cwd, "base.txt", "base\n");

      const nestedDir = join(cwd, "nested", "dir");
      mkdirSync(nestedDir, { recursive: true });

      const subscriptionId = "checkout-diff-subdir-e2e-subscription";
      const initial = await ctx.client.subscribeCheckoutDiff(
        nestedDir,
        { mode: "uncommitted" },
        { subscriptionId }
      );

      expect(initial.error).toBeNull();
      expect(initial.files).toEqual([]);

      writeFileSync(join(cwd, "outside-subdir.txt"), "changed outside\n");

      const update = await waitForCheckoutDiffUpdate(
        ctx,
        subscriptionId,
        (payload) =>
          payload.files.some((file) => file.path === "outside-subdir.txt")
      );

      expect(update.error).toBeNull();
      expect(
        update.files.some((file) => file.path === "outside-subdir.txt")
      ).toBe(true);

      ctx.client.unsubscribeCheckoutDiff(subscriptionId);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  }, 60_000);
});
