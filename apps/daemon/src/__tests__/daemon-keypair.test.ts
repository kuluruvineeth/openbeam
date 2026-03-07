import { afterEach, describe, expect, it } from "bun:test";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadOrCreateDaemonKeyPair } from "../daemon-keypair";

function createTempDir(): string {
  const dir = join(
    tmpdir(),
    `openbeam-kp-test-${randomBytes(8).toString("hex")}`
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("loadOrCreateDaemonKeyPair", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it("creates a new keypair when none exists", () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    const kp = loadOrCreateDaemonKeyPair(dir);
    expect(kp.publicKey).toBeTruthy();
    expect(kp.secretKey).toBeTruthy();
    expect(typeof kp.publicKey).toBe("string");
    expect(typeof kp.secretKey).toBe("string");
  });

  it("persists keypair to disk", () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    loadOrCreateDaemonKeyPair(dir);
    const filePath = join(dir, "daemon-keypair.json");
    expect(existsSync(filePath)).toBe(true);

    const raw = readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    expect(parsed.publicKey).toBeTruthy();
    expect(parsed.secretKey).toBeTruthy();
  });

  it("sets restrictive file permissions", () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    loadOrCreateDaemonKeyPair(dir);
    const filePath = join(dir, "daemon-keypair.json");
    const stats = statSync(filePath);
    // biome-ignore lint/suspicious/noBitwiseOperators: intentional bitwise operation
    const mode = stats.mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it("returns same keypair on subsequent calls", () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    const kp1 = loadOrCreateDaemonKeyPair(dir);
    const kp2 = loadOrCreateDaemonKeyPair(dir);
    expect(kp1.publicKey).toBe(kp2.publicKey);
    expect(kp1.secretKey).toBe(kp2.secretKey);
  });

  it("generates valid base64 encoded keys", () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    const kp = loadOrCreateDaemonKeyPair(dir);
    const pubBytes = Buffer.from(kp.publicKey, "base64");
    const secBytes = Buffer.from(kp.secretKey, "base64");
    expect(pubBytes.length).toBe(32);
    expect(secBytes.length).toBe(32);
  });
});
