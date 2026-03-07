import { afterEach, describe, expect, it } from "bun:test";
import { randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadPersistedConfig,
  type PersistedConfig,
  savePersistedConfig,
} from "../persisted-config";

function createTempDir(): string {
  const dir = join(
    tmpdir(),
    `openbeam-cfg-test-${randomBytes(8).toString("hex")}`
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("loadPersistedConfig", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it("creates default config when none exists", () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    const config = loadPersistedConfig(dir);
    expect(config.version).toBe(1);
    expect(config.daemon?.listen).toBe("127.0.0.1:6868");
    expect(config.daemon?.relay?.enabled).toBe(true);
  });

  it("creates config.json file on first load", () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    loadPersistedConfig(dir);
    expect(existsSync(join(dir, "config.json"))).toBe(true);
  });

  it("loads existing valid config", () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    const custom: PersistedConfig = {
      version: 1,
      daemon: {
        listen: "0.0.0.0:7777",
        mcp: { enabled: false },
      },
    };
    writeFileSync(join(dir, "config.json"), JSON.stringify(custom));

    const config = loadPersistedConfig(dir);
    expect(config.daemon?.listen).toBe("0.0.0.0:7777");
    expect(config.daemon?.mcp?.enabled).toBe(false);
  });

  it("throws on invalid JSON", () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    writeFileSync(join(dir, "config.json"), "not-json{{{");
    expect(() => loadPersistedConfig(dir)).toThrow("Invalid JSON");
  });

  it("throws on schema validation failure", () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    writeFileSync(
      join(dir, "config.json"),
      JSON.stringify({ daemon: { listen: 12_345 } })
    );
    expect(() => loadPersistedConfig(dir)).toThrow("Invalid config");
  });

  it("strips deprecated autoDownload field", () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    const configWithDeprecated = {
      version: 1,
      providers: {
        local: {
          modelsDir: "/tmp/models",
          autoDownload: true,
        },
      },
    };
    writeFileSync(
      join(dir, "config.json"),
      JSON.stringify(configWithDeprecated)
    );

    const config = loadPersistedConfig(dir);
    expect(config.providers?.local?.modelsDir).toBe("/tmp/models");
  });
});

describe("savePersistedConfig", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it("saves valid config to disk", () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    const config: PersistedConfig = {
      version: 1,
      daemon: { listen: "127.0.0.1:9999" },
    };
    savePersistedConfig(dir, config);

    const raw = readFileSync(join(dir, "config.json"), "utf8");
    const parsed = JSON.parse(raw);
    expect(parsed.daemon.listen).toBe("127.0.0.1:9999");
  });

  it("throws on invalid config", () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    const invalidConfig = {
      daemon: { listen: 12_345 },
    } as unknown as PersistedConfig;
    expect(() => savePersistedConfig(dir, invalidConfig)).toThrow(
      "Invalid config"
    );
  });

  it("roundtrips load-save-load", () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    const original = loadPersistedConfig(dir);
    original.daemon = { ...original.daemon, listen: "0.0.0.0:8080" };
    savePersistedConfig(dir, original);

    const reloaded = loadPersistedConfig(dir);
    expect(reloaded.daemon?.listen).toBe("0.0.0.0:8080");
  });
});
