import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import {
  BinaryMuxChannel,
  decodeBinaryMuxFrame,
  encodeBinaryMuxFrame,
  TerminalBinaryMessageType,
} from "@openbeam/types/services/daemon/binary";
import WebSocket from "ws";
import {
  createDaemonTestContext,
  type DaemonTestContext,
  tmpCwd,
  waitForCondition,
} from "./e2e-helpers";

const decoder = new TextDecoder();

function percentile(values: number[], p: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.ceil((p / 100) * sorted.length) - 1
  );
  return sorted[index] ?? 0;
}

const shouldRun = !process.env.CI;

(shouldRun ? describe : describe.skip)("daemon E2E terminal", () => {
  let ctx: DaemonTestContext;

  beforeEach(async () => {
    ctx = await createDaemonTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  test("lists terminals for a directory (auto-creates first)", async () => {
    const cwd = tmpCwd("daemon-terminal-e2e");

    try {
      const result = await ctx.client.listTerminals(cwd);

      expect(result.cwd).toBe(cwd);
      expect(result.terminals).toHaveLength(1);
      expect(result.terminals[0]?.name).toBe("Terminal 1");
      expect(result.terminals[0]?.id).toBeTruthy();
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  }, 30_000);

  test("creates additional terminal with custom name", async () => {
    const cwd = tmpCwd("daemon-terminal-e2e");

    try {
      await ctx.client.listTerminals(cwd);

      const result = await ctx.client.createTerminal(cwd, "Dev Server");

      expect(result.error).toBeNull();
      expect(result.terminal).toBeTruthy();
      expect(result.terminal?.name).toBe("Dev Server");
      expect(result.terminal?.cwd).toBe(cwd);

      const list = await ctx.client.listTerminals(cwd);
      expect(list.terminals).toHaveLength(2);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  }, 30_000);

  test("emits terminals_changed for subscribed cwd when terminals are created", async () => {
    const cwd = tmpCwd("daemon-terminal-e2e");

    try {
      await ctx.client.listTerminals(cwd);

      const snapshots: Array<{ cwd: string; names: string[] }> = [];
      const unsubscribe = ctx.client.on("terminals_changed", (message) => {
        if (message.type !== "terminals_changed") {
          return;
        }
        snapshots.push({
          cwd: message.payload.cwd,
          names: message.payload.terminals.map((terminal) => terminal.name),
        });
      });

      ctx.client.subscribeTerminals({ cwd });
      await ctx.client.createTerminal(cwd, "Dev Server");

      await waitForCondition(
        () =>
          snapshots.some(
            (snapshot) =>
              snapshot.cwd === cwd && snapshot.names.includes("Dev Server")
          ),
        10_000
      );

      ctx.client.unsubscribeTerminals({ cwd });
      unsubscribe();
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  }, 30_000);

  test("subscribes to terminal and receives state", async () => {
    const cwd = tmpCwd("daemon-terminal-e2e");

    try {
      const list = await ctx.client.listTerminals(cwd);
      const terminalId = list.terminals[0]?.id;

      const subscribeResult = await ctx.client.subscribeTerminal(terminalId);

      expect(subscribeResult.error).toBeNull();
      expect(subscribeResult.terminalId).toBe(terminalId);
      expect(subscribeResult.state).toBeTruthy();
      expect(subscribeResult.state?.rows).toBeGreaterThan(0);
      expect(subscribeResult.state?.cols).toBeGreaterThan(0);
      expect(subscribeResult.state?.grid).toBeTruthy();
      expect(subscribeResult.state?.cursor).toBeTruthy();

      ctx.client.unsubscribeTerminal(terminalId);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  }, 30_000);

  test("sends input to terminal and receives output", async () => {
    const cwd = tmpCwd("daemon-terminal-e2e");

    try {
      const list = await ctx.client.listTerminals(cwd);
      const terminalId = list.terminals[0]?.id;

      await ctx.client.subscribeTerminal(terminalId);

      ctx.client.sendTerminalInput(terminalId, {
        type: "input",
        data: "echo hello\r",
      });

      let foundHello = false;
      const start = Date.now();
      const timeout = 10_000;

      while (!foundHello && Date.now() - start < timeout) {
        try {
          const output = await ctx.client.waitForTerminalOutput(
            terminalId,
            2000
          );
          expect(output.terminalId).toBe(terminalId);
          expect(output.state).toBeTruthy();

          const gridText = output.state.grid
            .map((row) =>
              row
                .map((cell) => cell.char)
                .join("")
                .trimEnd()
            )
            .filter((line) => line.length > 0)
            .join("\n");

          if (gridText.includes("hello")) {
            foundHello = true;
          }
        } catch {
          /* timeout waiting for output, retry */
        }
      }

      expect(foundHello).toBe(true);

      ctx.client.unsubscribeTerminal(terminalId);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  }, 30_000);

  test("kills terminal", async () => {
    const cwd = tmpCwd("daemon-terminal-e2e");

    try {
      const createResult = await ctx.client.createTerminal(cwd, "To Kill");
      expect(createResult.terminal).toBeTruthy();
      const terminalId = createResult.terminal?.id;

      const killResult = await ctx.client.killTerminal(terminalId);
      expect(killResult.success).toBe(true);
      expect(killResult.terminalId).toBe(terminalId);

      const subscribeResult = await ctx.client.subscribeTerminal(terminalId);
      expect(subscribeResult.error).toBe("Terminal not found");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  }, 30_000);

  test("streams terminal output over binary mux and supports modifier keys", async () => {
    const cwd = tmpCwd("daemon-terminal-e2e");

    try {
      const list = await ctx.client.listTerminals(cwd);
      const terminalId = list.terminals[0]?.id;

      const attach = await ctx.client.attachTerminalStream(terminalId, {
        rows: 24,
        cols: 80,
      });
      expect(attach.error).toBeNull();
      expect(attach.streamId).toBeTypeOf("number");
      // biome-ignore lint/style/noNonNullAssertion: value guaranteed to be set
      const streamId = attach.streamId!;

      let text = "";
      const unsubscribe = ctx.client.onTerminalStreamData(streamId, (chunk) => {
        text += decoder.decode(chunk.data, { stream: true });
      });

      ctx.client.sendTerminalStreamInput(streamId, "echo binary-stream\r");
      await waitForCondition(() => text.includes("binary-stream"), 10_000);

      ctx.client.sendTerminalStreamInput(streamId, "cat -v\r");
      await waitForCondition(() => text.includes("cat -v"), 10_000);

      ctx.client.sendTerminalStreamKey(streamId, { key: "b", ctrl: true });
      ctx.client.sendTerminalStreamInput(streamId, "\r");
      await waitForCondition(() => text.includes("^B"), 10_000);

      ctx.client.sendTerminalStreamKey(streamId, { key: "c", ctrl: true });

      const detach = await ctx.client.detachTerminalStream(streamId);
      expect(detach.success).toBe(true);
      unsubscribe();
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  }, 30_000);

  test("emits terminal_stream_exit and removes terminal when shell exits", async () => {
    const cwd = tmpCwd("daemon-terminal-e2e");

    try {
      const list = await ctx.client.listTerminals(cwd);
      const terminalId = list.terminals[0]?.id;

      const attach = await ctx.client.attachTerminalStream(terminalId, {
        rows: 24,
        cols: 80,
      });
      expect(attach.error).toBeNull();
      // biome-ignore lint/style/noNonNullAssertion: value guaranteed to be set
      const streamId = attach.streamId!;

      let sawExit = false;
      const unsubscribeExit = ctx.client.on(
        "terminal_stream_exit",
        (message) => {
          if (message.type !== "terminal_stream_exit") {
            return;
          }
          if (
            message.payload.terminalId === terminalId &&
            message.payload.streamId === streamId
          ) {
            sawExit = true;
          }
        }
      );

      ctx.client.sendTerminalStreamKey(streamId, { key: "d", ctrl: true });

      await waitForCondition(() => sawExit, 10_000);

      const next = await ctx.client.listTerminals(cwd);
      expect(next.terminals).toHaveLength(1);
      expect(next.terminals[0]?.id).not.toBe(terminalId);

      unsubscribeExit();
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  }, 30_000);

  test("replays detached terminal output from resume offset", async () => {
    const cwd = tmpCwd("daemon-terminal-e2e");

    try {
      const list = await ctx.client.listTerminals(cwd);
      const terminalId = list.terminals[0]?.id;

      const attach = await ctx.client.attachTerminalStream(terminalId, {
        rows: 24,
        cols: 80,
      });
      expect(attach.error).toBeNull();
      // biome-ignore lint/style/noNonNullAssertion: value guaranteed to be set
      const streamId = attach.streamId!;

      let output = "";
      let latestOffset = attach.currentOffset;
      const unsubscribe = ctx.client.onTerminalStreamData(streamId, (chunk) => {
        output += decoder.decode(chunk.data, { stream: true });
        latestOffset = chunk.endOffset;
      });

      ctx.client.sendTerminalStreamInput(streamId, "echo before-detach\r");
      await waitForCondition(() => output.includes("before-detach"), 10_000);

      const firstDetach = await ctx.client.detachTerminalStream(streamId);
      expect(firstDetach.success).toBe(true);
      unsubscribe();

      ctx.client.sendTerminalInput(terminalId, {
        type: "input",
        data: "echo while-detached\r",
      });
      await new Promise((resolve) => setTimeout(resolve, 300));

      const resumed = await ctx.client.attachTerminalStream(terminalId, {
        resumeOffset: latestOffset,
      });
      expect(resumed.error).toBeNull();
      expect(resumed.streamId).toBeTypeOf("number");
      expect(resumed.reset).toBe(false);

      let replayedText = "";
      const resumedUnsub = ctx.client.onTerminalStreamData(
        // biome-ignore lint/style/noNonNullAssertion: value guaranteed to be set
        resumed.streamId!,
        (chunk) => {
          if (chunk.replay) {
            replayedText += decoder.decode(chunk.data, { stream: true });
          }
        }
      );

      await waitForCondition(
        () => replayedText.includes("while-detached"),
        10_000
      );

      const secondDetach = await ctx.client.detachTerminalStream(
        // biome-ignore lint/style/noNonNullAssertion: value guaranteed to be set
        resumed.streamId!
      );
      expect(secondDetach.success).toBe(true);
      resumedUnsub();
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  }, 30_000);

  test("applies stream backpressure window until client ack advances", async () => {
    const cwd = tmpCwd("daemon-terminal-e2e");

    try {
      const list = await ctx.client.listTerminals(cwd);
      const terminalId = list.terminals[0]?.id;

      const ws = new WebSocket(`ws://127.0.0.1:${ctx.daemon.port}/ws`);
      await new Promise<void>((resolve, reject) => {
        ws.once("open", () => resolve());
        ws.once("error", reject);
      });

      const attachRequestId = `attach-${Date.now()}`;
      let streamId: number | null = null;
      let latestEndOffset = 0;
      let outputBytes = 0;

      const streamReady = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(
            new Error("Timed out waiting for attach_terminal_stream_response")
          );
        }, 10_000);

        ws.on("message", (raw) => {
          if (Array.isArray(raw)) {
            // biome-ignore lint/style/noParameterAssign: intentional parameter mutation
            raw = Buffer.concat(
              raw.map((part) =>
                Buffer.isBuffer(part) ? part : Buffer.from(part)
              )
            );
          }
          if (typeof raw !== "string" && !Buffer.isBuffer(raw)) {
            return;
          }
          const text = typeof raw === "string" ? raw : raw.toString("utf8");
          try {
            const parsed = JSON.parse(text) as {
              type?: string;
              message?: {
                type?: string;
                payload?: { streamId?: number | null; requestId?: string };
              };
            };
            if (
              parsed.type === "session" &&
              parsed.message?.type === "attach_terminal_stream_response" &&
              parsed.message.payload?.requestId === attachRequestId
            ) {
              const nextStreamId = parsed.message.payload.streamId;
              if (typeof nextStreamId === "number") {
                streamId = nextStreamId;
                clearTimeout(timeout);
                resolve();
              }
            }
          } catch {
            /* non-JSON binary mux frames */
          }
        });
      });

      ws.on("message", (raw) => {
        if (typeof raw === "string") {
          return;
        }
        if (Array.isArray(raw)) {
          // biome-ignore lint/style/noParameterAssign: intentional parameter mutation
          raw = Buffer.concat(
            raw.map((part) =>
              Buffer.isBuffer(part) ? part : Buffer.from(part)
            )
          );
        }
        const bytes = Buffer.isBuffer(raw)
          ? new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength)
          : new Uint8Array(raw as ArrayBuffer);
        const frame = decodeBinaryMuxFrame(bytes);
        if (
          !frame ||
          frame.channel !== BinaryMuxChannel.Terminal ||
          frame.messageType !== TerminalBinaryMessageType.OutputUtf8
        ) {
          return;
        }
        const chunkBytes = frame.payload?.byteLength ?? 0;
        outputBytes += chunkBytes;
        latestEndOffset = frame.offset + chunkBytes;
      });

      ws.send(
        JSON.stringify({
          type: "session",
          message: {
            type: "attach_terminal_stream_request",
            terminalId,
            requestId: attachRequestId,
          },
        })
      );
      await streamReady;
      expect(streamId).toBeTypeOf("number");

      ws.send(
        JSON.stringify({
          type: "session",
          message: {
            type: "terminal_input",
            terminalId,
            message: {
              type: "input",
              data: "head -c 1048576 /dev/zero | tr '\\0' 'A'\r",
            },
          },
        })
      );

      await waitForCondition(() => outputBytes > 0, 10_000);
      await new Promise((resolve) => setTimeout(resolve, 800));
      const beforeAckBytes = outputBytes;
      expect(beforeAckBytes).toBeGreaterThan(0);
      expect(beforeAckBytes).toBeLessThan(320 * 1024);
      expect(latestEndOffset).toBeGreaterThan(0);

      ws.send(
        encodeBinaryMuxFrame({
          channel: BinaryMuxChannel.Terminal,
          messageType: TerminalBinaryMessageType.Ack,
          // biome-ignore lint/style/noNonNullAssertion: value guaranteed to be set
          streamId: streamId!,
          offset: latestEndOffset,
          payload: new Uint8Array(0),
        })
      );

      await waitForCondition(() => outputBytes > beforeAckBytes, 10_000);

      ws.send(
        JSON.stringify({
          type: "session",
          message: {
            type: "detach_terminal_stream_request",
            streamId,
            requestId: `detach-${Date.now()}`,
          },
        })
      );

      ws.close();
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  }, 30_000);

  test("measures local terminal round-trip latency via daemon client stream", async () => {
    const cwd = tmpCwd("daemon-terminal-e2e");

    try {
      const list = await ctx.client.listTerminals(cwd);
      const terminalId = list.terminals[0]?.id;

      const attach = await ctx.client.attachTerminalStream(terminalId);
      expect(attach.error).toBeNull();
      // biome-ignore lint/style/noNonNullAssertion: value guaranteed to be set
      const streamId = attach.streamId!;

      let output = "";
      const unsubscribe = ctx.client.onTerminalStreamData(streamId, (chunk) => {
        output += decoder.decode(chunk.data, { stream: true });
      });

      const samplesMs: number[] = [];
      const iterations = 8;
      for (let i = 0; i < iterations; i++) {
        const marker = `OPENBEAM_LAT_${i}_${Date.now()}`;
        const start = performance.now();
        ctx.client.sendTerminalStreamInput(streamId, `echo ${marker}\r`);
        await waitForCondition(() => output.includes(marker), 10_000);
        samplesMs.push(performance.now() - start);
      }

      const p95 = percentile(samplesMs, 95);

      expect(samplesMs).toHaveLength(iterations);
      expect(p95).toBeLessThan(350);

      const detach = await ctx.client.detachTerminalStream(streamId);
      expect(detach.success).toBe(true);
      unsubscribe();
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  }, 30_000);
});
