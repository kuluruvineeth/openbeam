import { describe, expect, it } from "bun:test";
import type { SandboxConfig } from "../../types";
import { DaytonaSandboxProvider } from "../daytona";

type FakeFileDetails = {
  name?: string;
  path?: string;
  isDir?: boolean;
  size?: number;
  modTime?: string;
  mode?: string;
};

class FakeDaytonaSandbox {
  readonly id: string;
  readonly labels: Record<string, string>;
  readonly cpu: number;
  readonly memory: number;
  readonly disk: number;
  readonly createdAt: string;
  state = "started";

  private readonly files = new Map<string, Buffer>();

  readonly fs: {
    downloadFile: (path: string, timeout?: number) => Promise<Buffer>;
    uploadFile: (
      content: Buffer | string,
      path: string,
      timeout?: number
    ) => Promise<void>;
    listFiles: (path: string) => Promise<FakeFileDetails[]>;
    deleteFile: (path: string, recursive?: boolean) => Promise<void>;
    createFolder: (path: string, mode: string) => Promise<void>;
    getFileDetails: (path: string) => Promise<FakeFileDetails>;
  };

  readonly process: {
    executeCommand: (
      command: string,
      cwd?: string,
      env?: Record<string, string>,
      timeout?: number
    ) => Promise<{ exitCode: number; result: string }>;
  };

  constructor(options: {
    id: string;
    labels: Record<string, string>;
    cpu: number;
    memory: number;
    disk: number;
  }) {
    this.id = options.id;
    this.labels = options.labels;
    this.cpu = options.cpu;
    this.memory = options.memory;
    this.disk = options.disk;
    this.createdAt = new Date().toISOString();

    this.fs = {
      downloadFile: (path: string): Promise<Buffer> => {
        const file = this.files.get(path);
        if (!file) {
          return Promise.reject(new Error(`File not found: ${path}`));
        }
        return Promise.resolve(Buffer.from(file));
      },

      uploadFile: (content: Buffer | string, path: string): Promise<void> => {
        const data =
          typeof content === "string" ? Buffer.from(content, "utf8") : content;
        this.files.set(path, Buffer.from(data));
        return Promise.resolve();
      },

      listFiles: (_path: string): Promise<FakeFileDetails[]> =>
        Promise.resolve(
          [...this.files.keys()].map((filePath) => ({
            name: filePath.split("/").pop(),
            path: filePath,
            isDir: false,
            size: this.files.get(filePath)?.length ?? 0,
            modTime: new Date().toISOString(),
          }))
        ),

      deleteFile: (path: string, _recursive?: boolean): Promise<void> => {
        this.files.delete(path);
        return Promise.resolve();
      },

      createFolder: (_path: string, _mode: string): Promise<void> =>
        Promise.resolve(),

      getFileDetails: (path: string): Promise<FakeFileDetails> => {
        const file = this.files.get(path);
        if (!file) {
          return Promise.reject(new Error(`File not found: ${path}`));
        }
        return Promise.resolve({
          name: path.split("/").pop(),
          path,
          isDir: false,
          size: file.length,
          modTime: new Date().toISOString(),
        });
      },
    };

    this.process = {
      executeCommand: (
        command: string,
        _cwd?: string,
        _env?: Record<string, string>,
        _timeout?: number
      ): Promise<{ exitCode: number; result: string }> => {
        if (command.includes("echo daytona-ok")) {
          return Promise.resolve({
            exitCode: 0,
            result: "daytona-ok\n",
          });
        }

        if (command.includes("python3")) {
          return Promise.resolve({
            exitCode: 0,
            result: "2\n",
          });
        }

        if (command.includes("ps -eo pid,args")) {
          return Promise.resolve({
            exitCode: 0,
            result: "101 sh -lc echo daytona-ok\n",
          });
        }

        if (command.startsWith("kill -9 ")) {
          return Promise.resolve({
            exitCode: 0,
            result: "",
          });
        }

        return Promise.resolve({
          exitCode: 0,
          result: "",
        });
      },
    };
  }

  start(_timeout?: number): Promise<void> {
    this.state = "started";
    return Promise.resolve();
  }

  stop(_timeout?: number): Promise<void> {
    this.state = "stopped";
    return Promise.resolve();
  }

  setAutoStopInterval(_minutes: number): Promise<void> {
    return Promise.resolve();
  }

  delete(_timeout?: number): Promise<void> {
    this.state = "deleted";
    return Promise.resolve();
  }
}

class FakeDaytonaClient {
  private readonly sandboxes = new Map<string, FakeDaytonaSandbox>();
  private sequence = 1;

  create(
    params?: Record<string, unknown>,
    _options?: {
      timeout?: number;
    }
  ): Promise<FakeDaytonaSandbox> {
    const id = `daytona-sbx-${this.sequence}`;
    this.sequence += 1;

    const resources =
      typeof params?.resources === "object" && params?.resources
        ? (params.resources as {
            cpu?: number;
            memory?: number;
            disk?: number;
          })
        : {};
    const labels =
      typeof params?.labels === "object" && params?.labels
        ? (params.labels as Record<string, string>)
        : {};

    const sandbox = new FakeDaytonaSandbox({
      id,
      labels,
      cpu: resources.cpu ?? 1,
      memory: resources.memory ?? 1,
      disk: resources.disk ?? 10,
    });
    this.sandboxes.set(id, sandbox);
    return Promise.resolve(sandbox);
  }

  get(sandboxIdOrName: string): Promise<FakeDaytonaSandbox> {
    const sandbox = this.sandboxes.get(sandboxIdOrName);
    if (!sandbox) {
      return Promise.reject(new Error(`Sandbox not found: ${sandboxIdOrName}`));
    }
    return Promise.resolve(sandbox);
  }

  list(
    labels?: Record<string, string>,
    _page?: number,
    _limit?: number
  ): Promise<{
    items: FakeDaytonaSandbox[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const items = [...this.sandboxes.values()].filter((sandbox) => {
      if (!labels) {
        return true;
      }
      return Object.entries(labels).every(
        ([key, value]) => sandbox.labels[key] === value
      );
    });

    return Promise.resolve({
      items,
      total: items.length,
      page: 1,
      totalPages: 1,
    });
  }

  delete(sandbox: FakeDaytonaSandbox, _timeout?: number): Promise<void> {
    this.sandboxes.delete(sandbox.id);
    return Promise.resolve();
  }
}

const BASE_CONFIG: SandboxConfig = {
  provider: "daytona",
  template: "python",
  timeout: 60_000,
  cpuCores: 1,
  memoryMb: 1024,
  diskMb: 2048,
  internetAccess: true,
  teamId: "team-enterprise",
};

describe("daytona provider", () => {
  it("creates, lists, executes, and destroys sandboxes via sdk adapter", async () => {
    const provider = new DaytonaSandboxProvider({
      apiKey: "test-daytona-key",
      apiUrl: "https://daytona.local/api",
      target: "self-host",
      sdkLoader: async () => ({
        Daytona: FakeDaytonaClient as unknown as new (
          config?: Record<string, unknown>
        ) => unknown,
      }),
    });

    expect(await provider.isAvailable()).toBe(true);

    const sandbox = await provider.create(BASE_CONFIG);
    expect(sandbox.id).toContain("daytona-sbx-");

    const command = await sandbox.commands.run("echo daytona-ok");
    expect(command.exitCode).toBe(0);
    expect(command.stdout).toContain("daytona-ok");

    await sandbox.files.write("notes.txt", "daytona-file-ok");
    const fileContent = await sandbox.files.read("notes.txt");
    expect(fileContent).toBe("daytona-file-ok");

    const code = await sandbox.code.run("print(1 + 1)", "python");
    expect(code.success).toBe(true);
    expect(code.output).toContain("2");

    const listed = await provider.list("team-enterprise");
    expect(listed.some((info) => info.id === sandbox.id)).toBe(true);

    await provider.destroy(sandbox.id);
    const afterDestroy = await provider.list("team-enterprise");
    expect(afterDestroy.some((info) => info.id === sandbox.id)).toBe(false);
  });
});
