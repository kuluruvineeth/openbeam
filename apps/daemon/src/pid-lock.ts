import { existsSync } from "node:fs";
import { mkdir, open, readFile, unlink } from "node:fs/promises";
import { hostname } from "node:os";
import { join } from "node:path";

export interface PidLockInfo {
  pid: number;
  startedAt: string;
  hostname: string;
  uid: number;
  sockPath: string;
}

export class PidLockError extends Error {
  constructor(
    message: string,
    // biome-ignore lint/style/useConsistentMemberAccessibility: class member accessibility
    // biome-ignore lint/style/noParameterProperties: TypeScript parameter properties
    public readonly existingLock?: PidLockInfo
  ) {
    super(message);
    this.name = "PidLockError";
  }
}

function isPidRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function getPidFilePath(openplaneHome: string): string {
  return join(openplaneHome, "openplane.pid");
}

function resolveLockOwnerPid(): number {
  if (typeof process.send === "function") {
    const ppid = process.ppid;
    if (Number.isInteger(ppid) && ppid > 1) {
      return ppid;
    }
  }

  return process.pid;
}

export async function acquirePidLock(
  openplaneHome: string,
  sockPath: string
): Promise<void> {
  const pidPath = getPidFilePath(openplaneHome);

  // Ensure openplaneHome directory exists
  if (!existsSync(openplaneHome)) {
    await mkdir(openplaneHome, { recursive: true });
  }

  // Try to read existing lock
  let existingLock: PidLockInfo | null = null;
  try {
    const content = await readFile(pidPath, "utf-8");
    existingLock = JSON.parse(content) as PidLockInfo;
  } catch {
    // No existing lock or invalid JSON - that's fine
  }

  // Check if existing lock is stale
  const lockOwnerPid = resolveLockOwnerPid();
  if (existingLock) {
    if (isPidRunning(existingLock.pid)) {
      if (existingLock.pid === lockOwnerPid) {
        return;
      }

      throw new PidLockError(
        `Another OpenPlane daemon is already running (PID ${existingLock.pid}, started ${existingLock.startedAt})`,
        existingLock
      );
    }
    // Stale lock - remove it
    // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
    await unlink(pidPath).catch(() => {});
  }

  // Create new lock with exclusive flag
  const lockInfo: PidLockInfo = {
    pid: lockOwnerPid,
    startedAt: new Date().toISOString(),
    hostname: hostname(),
    uid: process.getuid?.() ?? 0,
    sockPath,
  };

  // biome-ignore lint/suspicious/noEvolvingTypes: type narrows through function
  let fd;
  try {
    fd = await open(pidPath, "wx");
    await fd.write(JSON.stringify(lockInfo));
    // biome-ignore lint/suspicious/noExplicitAny: daemon type interop
  } catch (err: any) {
    if (err.code === "EEXIST") {
      // Race condition - another process created the file
      // Re-read and check
      try {
        const content = await readFile(pidPath, "utf-8");
        const raceLock = JSON.parse(content) as PidLockInfo;
        throw new PidLockError(
          `Another OpenPlane daemon is already running (PID ${raceLock.pid})`,
          raceLock
        );
      } catch (innerErr) {
        if (innerErr instanceof PidLockError) {
          throw innerErr;
        }
        throw new PidLockError(
          "Failed to acquire PID lock due to race condition"
        );
      }
    }
    throw err;
  } finally {
    await fd?.close();
  }
}

export async function releasePidLock(openplaneHome: string): Promise<void> {
  const pidPath = getPidFilePath(openplaneHome);
  const lockOwnerPid = resolveLockOwnerPid();
  try {
    // Only remove if it's our lock
    const content = await readFile(pidPath, "utf-8");
    const lock = JSON.parse(content) as PidLockInfo;
    if (lock.pid === lockOwnerPid) {
      await unlink(pidPath);
    }
  } catch {
    // Ignore errors - lock may already be gone
  }
}

export async function getPidLockInfo(
  openplaneHome: string
): Promise<PidLockInfo | null> {
  const pidPath = getPidFilePath(openplaneHome);
  try {
    const content = await readFile(pidPath, "utf-8");
    return JSON.parse(content) as PidLockInfo;
  } catch {
    return null;
  }
}

export async function isLocked(
  openplaneHome: string
): Promise<{ locked: boolean; info?: PidLockInfo }> {
  const info = await getPidLockInfo(openplaneHome);
  if (!info) {
    return { locked: false };
  }
  if (!isPidRunning(info.pid)) {
    return { locked: false, info };
  }
  return { locked: true, info };
}
