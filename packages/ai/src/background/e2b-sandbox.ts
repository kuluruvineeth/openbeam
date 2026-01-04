import type {
  CodeExecutionResult,
  FileInfo,
  ProcessResult,
  Sandbox,
  SandboxConfig,
  SandboxInfo,
  SandboxProvider,
} from "./sandbox";

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_TIMEOUT_MS = 24 * 60 * 60 * 1000;

interface E2BFile {
  name: string;
  type: string;
  size?: number;
}

interface E2BCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  kill: () => Promise<void>;
  wait: () => Promise<void>;
}

interface E2BLogEntry {
  line: string;
}

interface E2BCodeResult {
  png?: string;
  jpeg?: string;
  svg?: string;
}

interface E2BCodeExecution {
  text?: string;
  error?: { message: string };
  logs?: E2BLogEntry[];
  results?: E2BCodeResult[];
}

interface E2BSandboxInfo {
  sandboxId: string;
  startedAt: string;
  endAt: string;
  clientId?: string;
}

interface E2BSandboxInstance {
  sandboxId: string;
  getInfo(): Promise<E2BSandboxInfo>;
  setTimeout(timeoutMs: number): Promise<void>;
  kill(): Promise<void>;
  files: {
    read(path: string): Promise<string>;
    write(path: string, content: string): Promise<void>;
    list(path: string): Promise<E2BFile[]>;
    remove(path: string): Promise<void>;
    makeDir(path: string): Promise<void>;
  };
  commands: {
    run(
      command: string,
      options?: {
        cwd?: string;
        envVars?: Record<string, string>;
        timeoutMs?: number;
        background?: boolean;
        onStdout?: (data: string) => void;
        onStderr?: (data: string) => void;
      }
    ): Promise<E2BCommandResult>;
  };
  runCode(
    code: string,
    options?: {
      onStdout?: (data: E2BLogEntry) => void;
      onStderr?: (data: E2BLogEntry) => void;
    }
  ): Promise<E2BCodeExecution>;
}

type E2BSandboxType = E2BSandboxInstance;

function getMimeType(result: E2BCodeResult): string {
  if (result.png) {
    return "image/png";
  }
  if (result.jpeg) {
    return "image/jpeg";
  }
  return "image/svg+xml";
}

export class E2BSandboxProvider implements SandboxProvider {
  readonly name = "E2B";
  readonly type = "e2b" as const;

  private readonly apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.E2B_API_KEY ?? "";
    if (!this.apiKey) {
      throw new Error("E2B_API_KEY is required");
    }
  }

  isAvailable(): Promise<boolean> {
    return Promise.resolve(!!this.apiKey);
  }

  async create(config?: SandboxConfig): Promise<Sandbox> {
    // @ts-expect-error - Optional dependency, may not be installed
    const e2bModule = await import("@e2b/code-interpreter").catch(() => null);
    if (!e2bModule) {
      throw new Error("@e2b/code-interpreter not installed");
    }
    const E2BSandbox = e2bModule.Sandbox;
    const timeout = Math.min(
      config?.timeout ?? DEFAULT_TIMEOUT_MS,
      MAX_TIMEOUT_MS
    );

    const sbx = (await E2BSandbox.create({
      timeoutMs: timeout,
      envVars: config?.envVars,
    })) as E2BSandboxType;

    return new E2BSandboxAdapter(sbx);
  }

  async connect(sandboxId: string): Promise<Sandbox> {
    // @ts-expect-error - Optional dependency, may not be installed
    const e2bModule = await import("@e2b/code-interpreter").catch(() => null);
    if (!e2bModule) {
      throw new Error("@e2b/code-interpreter not installed");
    }
    const E2BSandbox = e2bModule.Sandbox;
    const sbx = (await E2BSandbox.connect(sandboxId)) as E2BSandboxType;
    return new E2BSandboxAdapter(sbx);
  }

  list(): Promise<SandboxInfo[]> {
    return Promise.resolve([]);
  }
}

class E2BSandboxAdapter implements Sandbox {
  readonly type = "e2b" as const;
  private readonly sbx: E2BSandboxType;

  constructor(sbx: E2BSandboxType) {
    this.sbx = sbx;
  }

  get id(): string {
    return this.sbx.sandboxId;
  }

  async getInfo(): Promise<SandboxInfo> {
    const info = await this.sbx.getInfo();
    return {
      id: info.sandboxId,
      status: "running",
      startedAt: new Date(info.startedAt),
      expiresAt: new Date(info.endAt),
      url: info.clientId ? `https://${info.clientId}.e2b.dev` : undefined,
    };
  }

  async setTimeout(timeoutMs: number): Promise<void> {
    await this.sbx.setTimeout(timeoutMs);
  }

  async kill(): Promise<void> {
    await this.sbx.kill();
  }

  files = {
    read: async (path: string): Promise<string> => this.sbx.files.read(path),

    write: async (path: string, content: string): Promise<void> => {
      await this.sbx.files.write(path, content);
    },

    list: async (path: string): Promise<FileInfo[]> => {
      const files = await this.sbx.files.list(path);
      return files.map((f) => ({
        path: `${path}/${f.name}`,
        name: f.name,
        isDirectory: f.type === "dir",
        size: f.size ?? 0,
        modifiedAt: new Date(),
      }));
    },

    remove: async (path: string): Promise<void> => {
      await this.sbx.files.remove(path);
    },

    exists: async (path: string): Promise<boolean> => {
      try {
        await this.sbx.files.read(path);
        return true;
      } catch {
        return false;
      }
    },

    mkdir: async (path: string): Promise<void> => {
      await this.sbx.files.makeDir(path);
    },

    upload: async (localPath: string, remotePath: string): Promise<void> => {
      const fs = await import("node:fs/promises");
      const content = await fs.readFile(localPath, "utf-8");
      await this.sbx.files.write(remotePath, content);
    },

    download: async (remotePath: string, localPath: string): Promise<void> => {
      const fs = await import("node:fs/promises");
      const content = await this.sbx.files.read(remotePath);
      await fs.writeFile(localPath, content);
    },
  };

  process = {
    run: async (
      command: string,
      options?: { cwd?: string; env?: Record<string, string>; timeout?: number }
    ): Promise<ProcessResult> => {
      const startTime = Date.now();
      const result = await this.sbx.commands.run(command, {
        cwd: options?.cwd,
        envVars: options?.env,
        timeoutMs: options?.timeout,
      });

      return {
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        durationMs: Date.now() - startTime,
      };
    },

    start: async (
      command: string,
      options?: {
        cwd?: string;
        env?: Record<string, string>;
        onStdout?: (data: string) => void;
        onStderr?: (data: string) => void;
      }
    ) => {
      const onStdoutCb = options?.onStdout;
      const onStderrCb = options?.onStderr;

      const proc = await this.sbx.commands.run(command, {
        cwd: options?.cwd,
        envVars: options?.env,
        background: true,
        onStdout: onStdoutCb ? (data) => onStdoutCb(data) : undefined,
        onStderr: onStderrCb ? (data) => onStderrCb(data) : undefined,
      });

      return {
        pid: 0,
        kill: async () => {
          await proc.kill();
        },
        wait: async (): Promise<ProcessResult> => {
          await proc.wait();
          return {
            exitCode: proc.exitCode,
            stdout: proc.stdout,
            stderr: proc.stderr,
            durationMs: 0,
          };
        },
      };
    },
  };

  code = {
    run: async (
      code: string,
      _language: "python" | "javascript" | "bash" = "python"
    ): Promise<CodeExecutionResult> => {
      const startTime = Date.now();

      try {
        const execution = await this.sbx.runCode(code);

        return {
          success: !execution.error,
          output: execution.text ?? "",
          error: execution.error?.message,
          logs: execution.logs?.map((l) => l.line) ?? [],
          artifacts:
            execution.results
              ?.filter((r) => r.png || r.jpeg || r.svg)
              .map((r, i) => ({
                type: "image" as const,
                path: `/tmp/artifact_${i}.png`,
                mimeType: getMimeType(r),
              })) ?? [],
          durationMs: Date.now() - startTime,
        };
      } catch (error) {
        return {
          success: false,
          output: "",
          error: error instanceof Error ? error.message : String(error),
          logs: [],
          artifacts: [],
          durationMs: Date.now() - startTime,
        };
      }
    },

    runWithStreaming: async (
      code: string,
      onOutput: (output: string) => void,
      _language: "python" | "javascript" | "bash" = "python"
    ): Promise<CodeExecutionResult> => {
      const startTime = Date.now();
      const logs: string[] = [];

      try {
        const execution = await this.sbx.runCode(code, {
          onStdout: (data) => {
            logs.push(data.line);
            onOutput(data.line);
          },
          onStderr: (data) => {
            logs.push(`[stderr] ${data.line}`);
            onOutput(`[stderr] ${data.line}`);
          },
        });

        return {
          success: !execution.error,
          output: execution.text ?? "",
          error: execution.error?.message,
          logs,
          artifacts: [],
          durationMs: Date.now() - startTime,
        };
      } catch (error) {
        return {
          success: false,
          output: "",
          error: error instanceof Error ? error.message : String(error),
          logs,
          artifacts: [],
          durationMs: Date.now() - startTime,
        };
      }
    },
  };
}

let e2bProvider: E2BSandboxProvider | null = null;

export function getE2BSandboxProvider(): E2BSandboxProvider {
  if (!e2bProvider) {
    e2bProvider = new E2BSandboxProvider();
  }
  return e2bProvider;
}
