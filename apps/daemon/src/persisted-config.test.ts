import { describe, expect, test } from "vitest";

import { PersistedConfigSchema } from "./persisted-config";

describe("PersistedConfigSchema agent provider runtime settings", () => {
  test("accepts provider command append args and env", () => {
    const parsed = PersistedConfigSchema.parse({
      agents: {
        providers: {
          claude: {
            command: {
              mode: "append",
              args: ["--chrome"],
            },
            env: {
              FOO: "bar",
            },
          },
        },
      },
    });

    expect(parsed.agents?.providers?.claude?.command?.mode).toBe("append");
    expect(parsed.agents?.providers?.claude?.env?.FOO).toBe("bar");
  });

  test("accepts provider command replace argv", () => {
    const parsed = PersistedConfigSchema.parse({
      agents: {
        providers: {
          codex: {
            command: {
              mode: "replace",
              argv: ["docker", "run", "--rm", "my-codex-wrapper"],
            },
          },
        },
      },
    });

    expect(parsed.agents?.providers?.codex?.command?.mode).toBe("replace");
  });

  test("rejects replace command without argv", () => {
    const result = PersistedConfigSchema.safeParse({
      agents: {
        providers: {
          opencode: {
            command: {
              mode: "replace",
            },
          },
        },
      },
    });

    expect(result.success).toBe(false);
  });

  test("accepts daemon native helper configuration", () => {
    const parsed = PersistedConfigSchema.parse({
      daemon: {
        nativeHelper: {
          enabled: true,
          command: "/tmp/openbeam-native-helper",
          args: ["--capture-shortcuts"],
          rpcTimeoutMs: 8000,
        },
      },
    });

    expect(parsed.daemon?.nativeHelper?.enabled).toBe(true);
    expect(parsed.daemon?.nativeHelper?.command).toBe(
      "/tmp/openbeam-native-helper"
    );
    expect(parsed.daemon?.nativeHelper?.args).toEqual(["--capture-shortcuts"]);
    expect(parsed.daemon?.nativeHelper?.rpcTimeoutMs).toBe(8000);
  });
});
