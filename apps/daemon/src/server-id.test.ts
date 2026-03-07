import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getOrCreateServerId } from "./server-id";

function tmpHome(): string {
  return mkdtempSync(path.join(tmpdir(), "openbeam-server-id-"));
}

describe("getOrCreateServerId", () => {
  let home: string;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.OPENBEAM_SERVER_ID = undefined;
    home = tmpHome();
  });

  afterEach(() => {
    process.env = originalEnv;
    rmSync(home, { recursive: true, force: true });
  });

  it("creates and persists a stable id per OPENBEAM_HOME", () => {
    const first = getOrCreateServerId(home);
    const second = getOrCreateServerId(home);
    expect(first).toBe(second);
    expect(first.startsWith("srv_")).toBe(true);

    const idPath = path.join(home, "server-id");
    expect(existsSync(idPath)).toBe(true);
    expect(readFileSync(idPath, "utf8").trim()).toBe(first);
  });

  it("respects and persists OPENBEAM_SERVER_ID override", () => {
    process.env.OPENBEAM_SERVER_ID = "test-daemon-id";
    const id = getOrCreateServerId(home);
    expect(id).toBe("test-daemon-id");

    const idPath = path.join(home, "server-id");
    expect(existsSync(idPath)).toBe(true);
    expect(readFileSync(idPath, "utf8").trim()).toBe("test-daemon-id");
  });
});
