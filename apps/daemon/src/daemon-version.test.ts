import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  DaemonVersionResolutionError,
  resolveDaemonVersion,
} from "./daemon-version";

const createdDirs: string[] = [];

function createTempDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "openplane-daemon-version-"));
  createdDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of createdDirs.splice(0, createdDirs.length)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("resolveDaemonVersion", () => {
  it("resolves server version by walking up to daemon package.json", () => {
    const root = createTempDir();
    writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({ name: "daemon", version: "9.8.7" }),
      "utf8"
    );
    const nestedDir = path.join(root, "dist", "server");
    mkdirSync(nestedDir, { recursive: true });

    const moduleUrl = pathToFileURL(path.join(nestedDir, "index.js")).href;
    expect(resolveDaemonVersion(moduleUrl)).toBe("9.8.7");
  });

  it("throws when daemon package metadata cannot be resolved", () => {
    const root = createTempDir();
    writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({ name: "not-daemon-package", version: "1.2.3" }),
      "utf8"
    );
    const nestedDir = path.join(root, "dist", "server");
    mkdirSync(nestedDir, { recursive: true });

    const moduleUrl = pathToFileURL(path.join(nestedDir, "index.js")).href;
    expect(() => resolveDaemonVersion(moduleUrl)).toThrow(
      DaemonVersionResolutionError
    );
  });

  it("throws when daemon version is missing", () => {
    const root = createTempDir();
    writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({ name: "daemon" }),
      "utf8"
    );
    const nestedDir = path.join(root, "dist", "server");
    mkdirSync(nestedDir, { recursive: true });

    const moduleUrl = pathToFileURL(path.join(nestedDir, "index.js")).href;
    expect(() => resolveDaemonVersion(moduleUrl)).toThrow(
      DaemonVersionResolutionError
    );
  });
});
