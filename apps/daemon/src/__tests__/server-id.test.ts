import { afterEach, describe, expect, it } from "bun:test";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getOrCreateServerId } from "../server-id.js";

function createTempDir(): string {
  const dir = join(
    tmpdir(),
    `openplane-test-${randomBytes(8).toString("hex")}`
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("getOrCreateServerId", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it("creates a server ID with srv_ prefix", () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    const id = getOrCreateServerId(dir, { env: {} });
    // biome-ignore lint/performance/useTopLevelRegex: scoped regex acceptable here
    expect(id).toMatch(/^srv_/);
    expect(id.length).toBeGreaterThan(4);
  });

  it("persists the server ID to disk", () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    const id = getOrCreateServerId(dir, { env: {} });
    const filePath = join(dir, "server-id");
    expect(existsSync(filePath)).toBe(true);

    const persisted = readFileSync(filePath, "utf8").trim();
    expect(persisted).toBe(id);
  });

  it("returns the same ID on subsequent calls", () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    const id1 = getOrCreateServerId(dir, { env: {} });
    const id2 = getOrCreateServerId(dir, { env: {} });
    expect(id1).toBe(id2);
  });

  it("uses OPENPLANE_SERVER_ID env override", () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    const env = { OPENPLANE_SERVER_ID: "custom_server_id" };
    const id = getOrCreateServerId(dir, { env });
    expect(id).toBe("custom_server_id");
  });

  it("persists env override to disk", () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    const env = { OPENPLANE_SERVER_ID: "env_id" };
    getOrCreateServerId(dir, { env });

    const filePath = join(dir, "server-id");
    const persisted = readFileSync(filePath, "utf8").trim();
    expect(persisted).toBe("env_id");
  });

  it("ignores empty OPENPLANE_SERVER_ID", () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    const env = { OPENPLANE_SERVER_ID: "" };
    const id = getOrCreateServerId(dir, { env });
    // biome-ignore lint/performance/useTopLevelRegex: scoped regex acceptable here
    expect(id).toMatch(/^srv_/);
  });

  it("ignores whitespace-only OPENPLANE_SERVER_ID", () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    const env = { OPENPLANE_SERVER_ID: "   " };
    const id = getOrCreateServerId(dir, { env });
    // biome-ignore lint/performance/useTopLevelRegex: scoped regex acceptable here
    expect(id).toMatch(/^srv_/);
  });
});
