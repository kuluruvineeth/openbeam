import { describe, expect, it } from "bun:test";
import type { SandboxConfig } from "../../types";
import { LocalSandboxProvider } from "../local";

const BASE_CONFIG: SandboxConfig = {
  provider: "local",
  template: "base",
  timeout: 60_000,
  cpuCores: 1,
  memoryMb: 512,
  diskMb: 1024,
  internetAccess: false,
  teamId: "team-local",
};

describe("local sandbox provider", () => {
  it("creates sandboxes and supports command/file operations", async () => {
    const provider = new LocalSandboxProvider();
    const sandbox = await provider.create(BASE_CONFIG);

    const runResult = await sandbox.commands.run("echo local-provider-ok");
    expect(runResult.exitCode).toBe(0);
    expect(runResult.stdout).toContain("local-provider-ok");

    await sandbox.files.write("hello.txt", "world");
    const content = await sandbox.files.read("hello.txt");
    expect(content).toBe("world");

    const infos = await provider.list("team-local");
    expect(infos.some((info) => info.id === sandbox.id)).toBe(true);

    await provider.destroy(sandbox.id);
    const afterDelete = await provider.list("team-local");
    expect(afterDelete.some((info) => info.id === sandbox.id)).toBe(false);
  });

  it("rejects path traversal outside workspace", async () => {
    const provider = new LocalSandboxProvider();
    const sandbox = await provider.create(BASE_CONFIG);

    expect(() => sandbox.files.read("../etc/passwd")).toThrow(
      "Path escapes sandbox workspace"
    );
  });
});
