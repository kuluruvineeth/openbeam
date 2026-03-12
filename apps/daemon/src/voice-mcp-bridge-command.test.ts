import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

import {
  resolveVoiceMcpBridgeFromRuntime,
  resolveVoiceMcpBridgeScriptPath,
} from "./voice-mcp-bridge-command";

const bootstrapModuleUrl = new URL(
  "./bootstrap.ts",
  import.meta.url
).toString();

const bridgeScriptPath = fileURLToPath(
  new URL("../scripts/mcp-stdio-socket-bridge-cli.mjs", bootstrapModuleUrl)
);
const hasBridgeScript = existsSync(bridgeScriptPath);

(hasBridgeScript ? describe : describe.skip)(
  "resolveVoiceMcpBridgeFromRuntime",
  () => {
    test("resolves default JS bridge script with node execPath", () => {
      const result = resolveVoiceMcpBridgeFromRuntime({
        bootstrapModuleUrl,
        execPath: "/usr/local/bin/node",
      });

      const expectedScriptPath = fileURLToPath(
        new URL(
          "../scripts/mcp-stdio-socket-bridge-cli.mjs",
          bootstrapModuleUrl
        )
      );

      expect(result.source).toBe("default-js-script");
      expect(result.resolved.command).toBe("/usr/local/bin/node");
      expect(result.resolved.baseArgs).toEqual([expectedScriptPath]);
    });

    test("uses explicit script override when provided", () => {
      const result = resolveVoiceMcpBridgeFromRuntime({
        bootstrapModuleUrl,
        execPath: "/usr/local/bin/node",
        explicitScriptPath: bridgeScriptPath,
      });

      expect(result.source).toBe("explicit-js-script");
      expect(result.resolved.command).toBe("/usr/local/bin/node");
      expect(result.resolved.baseArgs).toEqual([bridgeScriptPath]);
    });

    test("throws when explicit script path is missing", () => {
      expect(() =>
        resolveVoiceMcpBridgeScriptPath({
          bootstrapModuleUrl,
          explicitScriptPath: "/tmp/does-not-exist-voice-bridge-script.mjs",
        })
      ).toThrow("MCP stdio-socket bridge script not found");
    });
  }
);
