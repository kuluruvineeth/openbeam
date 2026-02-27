import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import pino from "pino";
import { afterEach, describe, expect, test } from "vitest";
import {
  createNativeHelperBridge,
  NativeHelperResponseValidationError,
  NativeHelperTimeoutError,
  NativeHelperUnavailableError,
} from "./native-helper-bridge.js";
import type { NativeHelperEvent } from "./protocol.js";

const tempDirs: string[] = [];

async function createHelperScript(source: string): Promise<string> {
  const dir = await mkdtemp(
    path.join(os.tmpdir(), "openplane-native-helper-test-")
  );
  tempDirs.push(dir);

  const scriptPath = path.join(dir, "helper.mjs");
  await writeFile(scriptPath, `${source.trim()}\n`, "utf8");
  return scriptPath;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.map((dir) =>
      rm(dir, {
        recursive: true,
        force: true,
      })
    )
  );
  tempDirs.length = 0;
});

describe("native helper bridge", () => {
  test("handles RPC calls and helper events", async () => {
    const scriptPath = await createHelperScript(`
      import readline from "node:readline";

      const input = readline.createInterface({
        input: process.stdin,
        crlfDelay: Infinity,
      });

      process.stdout.write(
        JSON.stringify({ type: "keyDown", payload: { keyCode: 66 } }) + "\\n"
      );

      input.on("line", (line) => {
        const request = JSON.parse(line);

        if (request.method === "getAccessibilityStatus") {
          process.stdout.write(
            JSON.stringify({
              id: request.id,
              result: {
                granted: true,
                promptable: false,
                detail: "ok",
              },
            }) + "\\n"
          );
          return;
        }

        if (request.method === "setShortcuts") {
          process.stdout.write(
            JSON.stringify({
              id: request.id,
              result: {
                success: true,
              },
            }) + "\\n"
          );
          return;
        }

        process.stdout.write(
          JSON.stringify({
            id: request.id,
            error: { code: -32601, message: "Method not found" },
          }) + "\\n"
        );
      });
    `);

    const events: NativeHelperEvent[] = [];
    const bridge = createNativeHelperBridge({
      logger: pino({ level: "silent" }),
      command: process.execPath,
      args: [scriptPath],
      onEvent: (event) => {
        events.push(event);
      },
    });

    await bridge.start();
    try {
      const status = await bridge.call("getAccessibilityStatus", {});
      expect(status.granted).toBe(true);
      expect(status.promptable).toBe(false);

      const shortcutResult = await bridge.call("setShortcuts", {
        pushToTalk: [57],
        toggleRecording: [58],
        pasteLastTranscript: [59],
        newNote: [60],
      });
      expect(shortcutResult.success).toBe(true);

      expect(
        events.some(
          (event) => event.type === "keyDown" && event.payload.keyCode === 66
        )
      ).toBe(true);
    } finally {
      await bridge.stop();
    }
  });

  test("accepts helper-style key events with timestamp metadata", async () => {
    const scriptPath = await createHelperScript(`
      import readline from "node:readline";

      const input = readline.createInterface({
        input: process.stdin,
        crlfDelay: Infinity,
      });

      process.stdout.write(
        JSON.stringify({
          type: "keyDown",
          payload: {
            keyCode: 63,
            altKey: false,
            shiftKey: false,
            ctrlKey: false,
            fnKeyPressed: true,
            metaKey: false,
          },
          timestamp: "2026-02-24T11:13:17Z",
        }) + "\\n"
      );

      input.on("line", (line) => {
        const request = JSON.parse(line);
        process.stdout.write(
          JSON.stringify({
            id: request.id,
            result: {
              success: true,
            },
          }) + "\\n"
        );
      });
    `);

    const events: NativeHelperEvent[] = [];
    const bridge = createNativeHelperBridge({
      logger: pino({ level: "silent" }),
      command: process.execPath,
      args: [scriptPath],
      onEvent: (event) => {
        events.push(event);
      },
    });

    await bridge.start();
    try {
      await bridge.call("setShortcuts", {
        pushToTalk: [63],
        toggleRecording: [63, 49],
        pasteLastTranscript: [55, 59, 9],
        newNote: [55, 59, 45],
      });

      const helperEvent = events.find((event) => event.type === "keyDown");
      expect(helperEvent).toBeDefined();
      if (!helperEvent || helperEvent.type !== "keyDown") {
        throw new Error("Expected helper keyDown event");
      }
      expect(helperEvent.payload.keyCode).toBe(63);
      expect(helperEvent.payload.fnKeyPressed).toBe(true);
      expect(helperEvent.payload.timestampMs).toBe(
        Date.parse("2026-02-24T11:13:17Z")
      );
    } finally {
      await bridge.stop();
    }
  });

  test("accepts legacy accessibility status payloads", async () => {
    const scriptPath = await createHelperScript(`
      import readline from "node:readline";

      const input = readline.createInterface({
        input: process.stdin,
        crlfDelay: Infinity,
      });

      input.on("line", (line) => {
        const request = JSON.parse(line);
        if (request.method !== "getAccessibilityStatus") {
          return;
        }

        process.stdout.write(
          JSON.stringify({
            id: request.id,
            result: {
              hasPermission: false,
              isEnabled: true,
            },
          }) + "\\n"
        );
      });
    `);

    const bridge = createNativeHelperBridge({
      logger: pino({ level: "silent" }),
      command: process.execPath,
      args: [scriptPath],
    });

    await bridge.start();
    try {
      const status = await bridge.call("getAccessibilityStatus", {});
      expect(status.granted).toBe(false);
      expect(status.promptable).toBe(true);
    } finally {
      await bridge.stop();
    }
  });

  test("rejects timed out calls", async () => {
    const scriptPath = await createHelperScript(`
      import readline from "node:readline";
      const input = readline.createInterface({
        input: process.stdin,
        crlfDelay: Infinity,
      });
      input.on("line", () => {
        // Intentionally ignore every call.
      });
    `);

    const bridge = createNativeHelperBridge({
      logger: pino({ level: "silent" }),
      command: process.execPath,
      args: [scriptPath],
      defaultTimeoutMs: 100,
    });

    await bridge.start();
    try {
      await expect(
        bridge.call("requestAccessibilityPermission", {}, { timeoutMs: 100 })
      ).rejects.toBeInstanceOf(NativeHelperTimeoutError);
    } finally {
      await bridge.stop();
    }
  });

  test("rejects invalid result payloads", async () => {
    const scriptPath = await createHelperScript(`
      import readline from "node:readline";
      const input = readline.createInterface({
        input: process.stdin,
        crlfDelay: Infinity,
      });
      input.on("line", (line) => {
        const request = JSON.parse(line);
        process.stdout.write(
          JSON.stringify({ id: request.id, result: { notSuccess: true } }) + "\\n"
        );
      });
    `);

    const bridge = createNativeHelperBridge({
      logger: pino({ level: "silent" }),
      command: process.execPath,
      args: [scriptPath],
    });

    await bridge.start();
    try {
      await expect(
        bridge.call(
          "pasteText",
          { transcript: "hello world" },
          { timeoutMs: 3000 }
        )
      ).rejects.toBeInstanceOf(NativeHelperResponseValidationError);
    } finally {
      await bridge.stop();
    }
  });

  test("rejects pending calls when helper exits", async () => {
    const scriptPath = await createHelperScript(`
      import readline from "node:readline";
      const input = readline.createInterface({
        input: process.stdin,
        crlfDelay: Infinity,
      });
      input.on("line", () => {
        process.exit(0);
      });
    `);

    const bridge = createNativeHelperBridge({
      logger: pino({ level: "silent" }),
      command: process.execPath,
      args: [scriptPath],
      defaultTimeoutMs: 5000,
    });

    await bridge.start();
    try {
      await expect(
        bridge.call("recheckPressedKeys", { pressedKeyCodes: [1, 2, 3] })
      ).rejects.toBeInstanceOf(NativeHelperUnavailableError);
    } finally {
      await bridge.stop();
    }
  });
});
