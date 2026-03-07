import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { loadConfig } from "./config";

const tempHomes: string[] = [];

async function createOpenBeamHome(config?: unknown): Promise<string> {
  const dir = await mkdtemp(
    path.join(os.tmpdir(), "openbeam-config-native-helper-")
  );
  tempHomes.push(dir);

  if (config !== undefined) {
    await writeFile(
      path.join(dir, "config.json"),
      `${JSON.stringify(config)}\n`,
      "utf8"
    );
  }

  return dir;
}

async function installMockNativeHelper(home: string): Promise<string> {
  const helperDir = path.join(home, "bin");
  const helperPath = path.join(
    helperDir,
    process.platform === "win32" ? "WindowsHelper.exe" : "SwiftHelper"
  );
  await mkdir(helperDir, { recursive: true });
  await writeFile(helperPath, "#!/bin/sh\nexit 0\n", "utf8");
  if (process.platform !== "win32") {
    await chmod(helperPath, 0o755);
  }
  return helperPath;
}

afterEach(async () => {
  await Promise.all(
    tempHomes.map((dir) =>
      rm(dir, {
        recursive: true,
        force: true,
      })
    )
  );
  tempHomes.length = 0;
});

describe("loadConfig native helper", () => {
  test("defaults native helper config to disabled", async () => {
    const home = await createOpenBeamHome();
    const config = loadConfig(home, { env: {} });

    expect(config.nativeHelper?.enabled).toBe(false);
    expect(config.nativeHelper?.command).toBeNull();
    expect(config.nativeHelper?.args).toEqual([]);
    expect(config.nativeHelper?.rpcTimeoutMs).toBe(5000);
  });

  test("loads persisted native helper config", async () => {
    const home = await createOpenBeamHome({
      version: 1,
      daemon: {
        nativeHelper: {
          enabled: true,
          command: "/opt/openbeam/native-helper",
          args: ["--verbose", "--capture-shortcuts"],
          rpcTimeoutMs: 9000,
        },
      },
    });

    const config = loadConfig(home, { env: {} });
    expect(config.nativeHelper?.enabled).toBe(true);
    expect(config.nativeHelper?.command).toBe("/opt/openbeam/native-helper");
    expect(config.nativeHelper?.args).toEqual([
      "--verbose",
      "--capture-shortcuts",
    ]);
    expect(config.nativeHelper?.rpcTimeoutMs).toBe(9000);
  });

  test("allows env overrides for native helper config", async () => {
    const home = await createOpenBeamHome({
      version: 1,
      daemon: {
        nativeHelper: {
          enabled: false,
          command: "/old/path",
          args: ["--stale"],
          rpcTimeoutMs: 5000,
        },
      },
    });

    const config = loadConfig(home, {
      env: {
        OPENBEAM_NATIVE_HELPER_ENABLED: "1",
        OPENBEAM_NATIVE_HELPER_COMMAND: "/tmp/helper",
        OPENBEAM_NATIVE_HELPER_ARGS: '["--port","9876"]',
        OPENBEAM_NATIVE_HELPER_RPC_TIMEOUT_MS: "14000",
      },
    });

    expect(config.nativeHelper?.enabled).toBe(true);
    expect(config.nativeHelper?.command).toBe("/tmp/helper");
    expect(config.nativeHelper?.args).toEqual(["--port", "9876"]);
    expect(config.nativeHelper?.rpcTimeoutMs).toBe(14_000);
  });

  test("auto-enables native helper when default binary is installed", async () => {
    const home = await createOpenBeamHome();
    const helperPath = await installMockNativeHelper(home);

    const config = loadConfig(home, { env: {} });
    expect(config.nativeHelper?.enabled).toBe(true);
    expect(config.nativeHelper?.command).toBe(helperPath);
  });

  test("respects persisted disable even when default binary is installed", async () => {
    const home = await createOpenBeamHome({
      version: 1,
      daemon: {
        nativeHelper: {
          enabled: false,
        },
      },
    });
    await installMockNativeHelper(home);

    const config = loadConfig(home, { env: {} });
    expect(config.nativeHelper?.enabled).toBe(false);
  });
});
