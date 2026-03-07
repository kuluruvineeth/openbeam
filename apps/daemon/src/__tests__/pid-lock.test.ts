import { afterEach, describe, expect, it } from "bun:test";
import { randomBytes } from "node:crypto";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  acquirePidLock,
  getPidLockInfo,
  isLocked,
  PidLockError,
  releasePidLock,
} from "../pid-lock";

function createTempDir(): string {
  const dir = join(
    tmpdir(),
    `openbeam-pid-test-${randomBytes(8).toString("hex")}`
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("PID lock", () => {
  const tempDirs: string[] = [];

  // biome-ignore lint/suspicious/useAwait: async signature required by interface
  afterEach(async () => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it("acquires and releases lock", async () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    await acquirePidLock(dir, "127.0.0.1:6868");
    const info = await getPidLockInfo(dir);
    expect(info).not.toBeNull();
    expect(info?.sockPath).toBe("127.0.0.1:6868");
    expect(info?.pid).toBeGreaterThan(0);

    await releasePidLock(dir);
    const afterRelease = await getPidLockInfo(dir);
    expect(afterRelease).toBeNull();
  });

  it("allows re-acquisition by same process", async () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    await acquirePidLock(dir, "127.0.0.1:6868");
    await acquirePidLock(dir, "127.0.0.1:6868");

    const info = await getPidLockInfo(dir);
    expect(info).not.toBeNull();

    await releasePidLock(dir);
  });

  it("creates daemonHome directory if missing", async () => {
    const dir = join(
      tmpdir(),
      `openbeam-pid-test-${randomBytes(8).toString("hex")}`,
      "nested"
    );
    tempDirs.push(join(tmpdir(), dir.split("/").slice(0, -1).join("/")));
    tempDirs.push(dir);

    await acquirePidLock(dir, "127.0.0.1:6868");
    const info = await getPidLockInfo(dir);
    expect(info).not.toBeNull();
    await releasePidLock(dir);
  });

  it("isLocked returns false when no lock exists", async () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    const result = await isLocked(dir);
    expect(result.locked).toBe(false);
  });

  it("isLocked returns true when locked by running process", async () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    await acquirePidLock(dir, "127.0.0.1:6868");
    const result = await isLocked(dir);
    expect(result.locked).toBe(true);
    expect(result.info).not.toBeUndefined();

    await releasePidLock(dir);
  });

  it("PidLockError has expected properties", () => {
    const lockInfo = {
      pid: 12_345,
      startedAt: new Date().toISOString(),
      hostname: "test-host",
      uid: 1000,
      sockPath: "127.0.0.1:6868",
    };
    const error = new PidLockError("Test error", lockInfo);
    expect(error.name).toBe("PidLockError");
    expect(error.message).toBe("Test error");
    expect(error.existingLock).toEqual(lockInfo);
  });
});
