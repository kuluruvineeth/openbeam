import { afterEach, describe, expect, it } from "bun:test";
import { randomBytes } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../config.js";

function createTempDir(): string {
  const dir = join(
    tmpdir(),
    `openplane-loadcfg-test-${randomBytes(8).toString("hex")}`
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeConfig(dir: string, config: Record<string, unknown>): void {
  writeFileSync(join(dir, "config.json"), JSON.stringify(config));
}

describe("loadConfig", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it("returns defaults when no config exists", () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    const config = loadConfig(dir, { env: {} });
    expect(config.listen).toBe("127.0.0.1:6868");
    expect(config.daemonHome).toBe(dir);
    expect(config.mcpEnabled).toBe(true);
    expect(config.relayEnabled).toBe(true);
    expect(config.agentStoragePath).toBe(join(dir, "agents"));
  });

  it("respects CLI listen override", () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    const config = loadConfig(dir, {
      env: {},
      cli: { listen: "0.0.0.0:9999" },
    });
    expect(config.listen).toBe("0.0.0.0:9999");
  });

  it("respects OPENPLANE_LISTEN env var", () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    const config = loadConfig(dir, {
      env: { OPENPLANE_LISTEN: "0.0.0.0:7777" },
    });
    expect(config.listen).toBe("0.0.0.0:7777");
  });

  it("CLI overrides env var for listen", () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    const config = loadConfig(dir, {
      env: { OPENPLANE_LISTEN: "0.0.0.0:7777" },
      cli: { listen: "0.0.0.0:8888" },
    });
    expect(config.listen).toBe("0.0.0.0:8888");
  });

  it("respects persisted config listen", () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    writeConfig(dir, { version: 1, daemon: { listen: "0.0.0.0:5555" } });
    const config = loadConfig(dir, { env: {} });
    expect(config.listen).toBe("0.0.0.0:5555");
  });

  it("merges CORS origins from persisted and env", () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    writeConfig(dir, {
      version: 1,
      daemon: { cors: { allowedOrigins: ["https://a.com"] } },
    });

    const config = loadConfig(dir, {
      env: { OPENPLANE_CORS_ORIGINS: "https://b.com,https://c.com" },
    });

    expect(config.corsAllowedOrigins).toContain("https://a.com");
    expect(config.corsAllowedOrigins).toContain("https://b.com");
    expect(config.corsAllowedOrigins).toContain("https://c.com");
  });

  it("deduplicates CORS origins", () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    writeConfig(dir, {
      version: 1,
      daemon: { cors: { allowedOrigins: ["https://a.com"] } },
    });

    const config = loadConfig(dir, {
      env: { OPENPLANE_CORS_ORIGINS: "https://a.com" },
    });

    const count = config.corsAllowedOrigins.filter(
      (o) => o === "https://a.com"
    ).length;
    expect(count).toBe(1);
  });

  it("sets mcpDebug from MCP_DEBUG env", () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    const configOff = loadConfig(dir, { env: {} });
    expect(configOff.mcpDebug).toBe(false);

    const configOn = loadConfig(dir, { env: { MCP_DEBUG: "1" } });
    expect(configOn.mcpDebug).toBe(true);
  });

  it("respects relay endpoint env vars", () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    const config = loadConfig(dir, {
      env: {
        OPENPLANE_RELAY_ENDPOINT: "relay.custom.com:443",
        OPENPLANE_RELAY_PUBLIC_ENDPOINT: "public.custom.com:443",
      },
    });

    expect(config.relayEndpoint).toBe("relay.custom.com:443");
    expect(config.relayPublicEndpoint).toBe("public.custom.com:443");
  });

  it("respects app base URL env var", () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    const config = loadConfig(dir, {
      env: { OPENPLANE_APP_BASE_URL: "https://custom.app" },
    });
    expect(config.appBaseUrl).toBe("https://custom.app");
  });

  it("CLI mcpEnabled overrides persisted", () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    writeConfig(dir, { version: 1, daemon: { mcp: { enabled: true } } });
    const config = loadConfig(dir, {
      env: {},
      cli: { mcpEnabled: false },
    });
    expect(config.mcpEnabled).toBe(false);
  });
});
