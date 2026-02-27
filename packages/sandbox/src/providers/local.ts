import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import type {
  CodeExecutionResult,
  CommandResult,
  FileEvent,
  FileInfo,
  RunCommandOptions,
  RunningProcess,
  Sandbox,
  SandboxCodeRunner,
  SandboxCommands,
  SandboxConfig,
  SandboxFileSystem,
  SandboxInfo,
  SandboxProvider,
  SandboxStatus,
  StartCommandOptions,
} from "../types";
import { DEFAULT_TIMEOUT_MS } from "../types";

interface RunningCommand {
  pid: number;
  command: string;
  kill: () => Promise<void>;
}

const EXECUTION_INTERPRETERS: Record<"python" | "javascript" | "bash", string> =
  {
    python: "python3",
    javascript: "node",
    bash: "bash",
  };

const CODE_EXTENSION: Record<"python" | "javascript" | "bash", string> = {
  python: "py",
  javascript: "js",
  bash: "sh",
};

function ignoreTimeoutDestroyError(_error: unknown): undefined {
  return;
}

function shellEscape(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function resolveSandboxPath(rootDir: string, targetPath: string): string {
  const normalized = targetPath.startsWith("/")
    ? targetPath.slice(1)
    : targetPath;
  const resolvedPath = resolve(rootDir, normalized);
  if (
    resolvedPath !== rootDir &&
    !resolvedPath.startsWith(`${rootDir}${sep}`)
  ) {
    throw new Error("Path escapes sandbox workspace");
  }
  return resolvedPath;
}

function getFileExtension(language: "python" | "javascript" | "bash"): string {
  return CODE_EXTENSION[language];
}

export class LocalSandboxProvider implements SandboxProvider {
  readonly type = "local" as const;
  private readonly sandboxes = new Map<string, LocalSandbox>();

  isAvailable(): Promise<boolean> {
    return Promise.resolve(true);
  }

  async create(config: SandboxConfig): Promise<Sandbox> {
    const sandboxId = randomUUID();
    const workspaceRoot = await mkdtemp(join(tmpdir(), "openplane-sandbox-"));

    const sandbox = new LocalSandbox({
      id: sandboxId,
      config,
      workspaceRoot,
      onDestroy: () => {
        this.sandboxes.delete(sandboxId);
      },
    });

    this.sandboxes.set(sandboxId, sandbox);
    return sandbox;
  }

  connect(sandboxId: string): Promise<Sandbox> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      return Promise.reject(new Error(`Sandbox ${sandboxId} not found`));
    }
    return Promise.resolve(sandbox);
  }

  async list(teamId?: string): Promise<SandboxInfo[]> {
    const infos = await Promise.all(
      [...this.sandboxes.values()].map((sandbox) => sandbox.getInfo())
    );
    if (!teamId) {
      return infos;
    }
    return infos.filter((sandbox) => sandbox.teamId === teamId);
  }

  async destroy(sandboxId: string): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      return;
    }
    await sandbox.destroy();
  }
}

class LocalSandbox implements Sandbox {
  readonly id: string;
  readonly provider = "local" as const;

  private readonly workspaceRoot: string;
  private readonly teamId: string | undefined;
  private readonly template: string;
  private readonly resources: {
    cpuCores: number;
    memoryMb: number;
    diskMb: number;
  };
  private readonly onDestroy: () => void;
  private readonly createdAt: Date;
  private expiresAt: Date;
  private _status: SandboxStatus = "running";
  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  private readonly runningCommands = new Map<number, RunningCommand>();

  readonly files: SandboxFileSystem;
  readonly commands: SandboxCommands;
  readonly code: SandboxCodeRunner;

  constructor(options: {
    id: string;
    config: SandboxConfig;
    workspaceRoot: string;
    onDestroy: () => void;
  }) {
    this.id = options.id;
    this.workspaceRoot = options.workspaceRoot;
    this.teamId = options.config.teamId;
    this.template = options.config.template;
    this.resources = {
      cpuCores: options.config.cpuCores,
      memoryMb: options.config.memoryMb,
      diskMb: options.config.diskMb,
    };
    this.createdAt = new Date();
    this.expiresAt = new Date(
      this.createdAt.getTime() + (options.config.timeout ?? DEFAULT_TIMEOUT_MS)
    );
    this.onDestroy = options.onDestroy;

    this.files = this.createFileSystem();
    this.commands = this.createCommands();
    this.code = this.createCodeRunner();

    this.scheduleTimeout(options.config.timeout ?? DEFAULT_TIMEOUT_MS);
  }

  get status(): SandboxStatus {
    return this._status;
  }

  getInfo(): Promise<SandboxInfo> {
    return Promise.resolve({
      id: this.id,
      status: this._status,
      provider: this.provider,
      template: this.template,
      teamId: this.teamId,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt,
      resources: this.resources,
      host: "127.0.0.1",
      metadata: {
        workspaceRoot: this.workspaceRoot,
      },
    });
  }

  getHost(port: number): string {
    return `127.0.0.1:${port}`;
  }

  setTimeout(ms: number): Promise<void> {
    this.clearTimeout();
    this.expiresAt = new Date(Date.now() + ms);
    this.scheduleTimeout(ms);
    return Promise.resolve();
  }

  pause(): Promise<void> {
    this._status = "paused";
    return Promise.resolve();
  }

  resume(): Promise<void> {
    this._status = "running";
    return Promise.resolve();
  }

  async destroy(): Promise<void> {
    if (this._status === "stopped") {
      return;
    }

    this._status = "stopping";
    this.clearTimeout();

    const stopPromises = [...this.runningCommands.values()].map((command) =>
      command.kill()
    );
    await Promise.allSettled(stopPromises);
    this.runningCommands.clear();

    await rm(this.workspaceRoot, { recursive: true, force: true });

    this._status = "stopped";
    this.onDestroy();
  }

  private scheduleTimeout(ms: number): void {
    this.timeoutHandle = setTimeout(() => {
      this.destroy().catch(ignoreTimeoutDestroyError);
    }, ms);
  }

  private clearTimeout(): void {
    if (!this.timeoutHandle) {
      return;
    }
    clearTimeout(this.timeoutHandle);
    this.timeoutHandle = null;
  }

  private async spawnCommand(
    command: string,
    options?: {
      cwd?: string;
      env?: Record<string, string>;
      timeout?: number;
      onStdout?: (data: string) => void;
      onStderr?: (data: string) => void;
      trackRunning?: boolean;
    }
  ): Promise<{
    pid: number;
    wait: () => Promise<CommandResult>;
    kill: () => Promise<void>;
  }> {
    const cwd = options?.cwd
      ? resolveSandboxPath(this.workspaceRoot, options.cwd)
      : this.workspaceRoot;
    await mkdir(cwd, { recursive: true });

    const startedAt = Date.now();
    const proc = spawn("sh", ["-lc", command], {
      cwd,
      env: {
        ...process.env,
        ...(options?.env ?? {}),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const pid = proc.pid ?? -1;
    let stdout = "";
    let stderr = "";
    let finished = false;

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    if (options?.timeout) {
      timeoutHandle = setTimeout(() => {
        proc.kill("SIGKILL");
      }, options.timeout);
    }

    const kill = () => {
      if (!finished) {
        proc.kill("SIGKILL");
      }
      return Promise.resolve();
    };

    const runningCommand: RunningCommand = {
      pid,
      command,
      kill,
    };

    if (options?.trackRunning && pid > 0) {
      this.runningCommands.set(pid, runningCommand);
    }

    proc.stdout.on("data", (chunk: Buffer) => {
      const data = chunk.toString();
      stdout += data;
      options?.onStdout?.(data);
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      const data = chunk.toString();
      stderr += data;
      options?.onStderr?.(data);
    });

    const wait = async (): Promise<CommandResult> =>
      new Promise((resolveResult, rejectResult) => {
        proc.once("error", (error) => {
          finished = true;
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }
          if (pid > 0) {
            this.runningCommands.delete(pid);
          }
          rejectResult(error);
        });

        proc.once("close", (code) => {
          finished = true;
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }
          if (pid > 0) {
            this.runningCommands.delete(pid);
          }
          resolveResult({
            exitCode: code ?? 1,
            stdout,
            stderr,
            durationMs: Date.now() - startedAt,
          });
        });
      });

    return {
      pid,
      wait,
      kill,
    };
  }

  private createFileSystem(): SandboxFileSystem {
    return {
      read: (path: string): Promise<string> => {
        const fullPath = resolveSandboxPath(this.workspaceRoot, path);
        return readFile(fullPath, "utf-8");
      },

      readBytes: async (path: string): Promise<Uint8Array> => {
        const fullPath = resolveSandboxPath(this.workspaceRoot, path);
        const buffer = await readFile(fullPath);
        return new Uint8Array(buffer);
      },

      write: async (path: string, content: string): Promise<void> => {
        const fullPath = resolveSandboxPath(this.workspaceRoot, path);
        await mkdir(dirname(fullPath), { recursive: true });
        await writeFile(fullPath, content, "utf-8");
      },

      writeBytes: async (path: string, data: Uint8Array): Promise<void> => {
        const fullPath = resolveSandboxPath(this.workspaceRoot, path);
        await mkdir(dirname(fullPath), { recursive: true });
        await writeFile(fullPath, Buffer.from(data));
      },

      list: async (path: string): Promise<FileInfo[]> => {
        const fullPath = resolveSandboxPath(this.workspaceRoot, path);
        const entries = await readdir(fullPath, { withFileTypes: true });
        const now = new Date();
        const infos = await Promise.all(
          entries.map(async (entry) => {
            const entryPath = resolve(fullPath, entry.name);
            const entryStat = await stat(entryPath);
            return {
              path: entryPath,
              name: entry.name,
              isDirectory: entry.isDirectory(),
              size: entryStat.size,
              modifiedAt: entryStat.mtime ?? now,
            };
          })
        );
        return infos;
      },

      remove: async (path: string): Promise<void> => {
        const fullPath = resolveSandboxPath(this.workspaceRoot, path);
        await rm(fullPath, { recursive: true, force: true });
      },

      mkdir: async (path: string): Promise<void> => {
        const fullPath = resolveSandboxPath(this.workspaceRoot, path);
        await mkdir(fullPath, { recursive: true });
      },

      exists: async (path: string): Promise<boolean> => {
        const fullPath = resolveSandboxPath(this.workspaceRoot, path);
        try {
          await stat(fullPath);
          return true;
        } catch {
          return false;
        }
      },

      stat: async (path: string): Promise<FileInfo> => {
        const fullPath = resolveSandboxPath(this.workspaceRoot, path);
        const fileStat = await stat(fullPath);
        return {
          path: fullPath,
          name: fullPath.split(sep).pop() ?? fullPath,
          isDirectory: fileStat.isDirectory(),
          size: fileStat.size,
          modifiedAt: fileStat.mtime,
        };
      },

      watch: (_path: string, _callback: (event: FileEvent) => void) => ({
        dispose: () => {
          /* noop */
        },
      }),
    };
  }

  private createCommands(): SandboxCommands {
    return {
      run: async (
        command: string,
        opts?: RunCommandOptions
      ): Promise<CommandResult> => {
        const commandHandle = await this.spawnCommand(command, {
          cwd: opts?.cwd,
          env: opts?.env,
          timeout: opts?.timeout,
          trackRunning: false,
        });
        return commandHandle.wait();
      },

      start: async (
        command: string,
        opts?: StartCommandOptions
      ): Promise<RunningProcess> => {
        const commandHandle = await this.spawnCommand(command, {
          cwd: opts?.cwd,
          env: opts?.env,
          onStdout: opts?.onStdout,
          onStderr: opts?.onStderr,
          trackRunning: true,
        });

        return {
          pid: commandHandle.pid,
          kill: commandHandle.kill,
          wait: commandHandle.wait,
        };
      },

      list: async () =>
        [...this.runningCommands.values()].map((command) => ({
          pid: command.pid,
          command: command.command,
        })),

      kill: async (pid: number) => {
        const running = this.runningCommands.get(pid);
        if (!running) {
          return;
        }
        await running.kill();
      },
    };
  }

  private createCodeRunner(): SandboxCodeRunner {
    return {
      run: async (
        code: string,
        language: "python" | "javascript" | "bash" = "python"
      ): Promise<CodeExecutionResult> => {
        const startedAt = Date.now();
        const extension = getFileExtension(language);
        const scriptPath = `.run-${Date.now()}.${extension}`;
        const fullPath = resolveSandboxPath(this.workspaceRoot, scriptPath);
        const interpreter = EXECUTION_INTERPRETERS[language];

        await writeFile(fullPath, code, "utf-8");

        try {
          const result = await this.commands.run(
            `${interpreter} ${shellEscape(fullPath)}`
          );
          return {
            success: result.exitCode === 0,
            output: result.stdout,
            error: result.exitCode === 0 ? undefined : result.stderr,
            logs: result.stdout.split("\n").filter((line) => line.length > 0),
            artifacts: [],
            durationMs: Date.now() - startedAt,
          };
        } finally {
          await unlink(fullPath).catch(() => {
            /* noop */
          });
        }
      },

      runWithStreaming: async (
        code: string,
        onOutput: (output: string) => void,
        language: "python" | "javascript" | "bash" = "python"
      ): Promise<CodeExecutionResult> => {
        const startedAt = Date.now();
        const extension = getFileExtension(language);
        const scriptPath = `.run-${Date.now()}.${extension}`;
        const fullPath = resolveSandboxPath(this.workspaceRoot, scriptPath);
        const interpreter = EXECUTION_INTERPRETERS[language];
        const logs: string[] = [];

        await writeFile(fullPath, code, "utf-8");

        try {
          const proc = await this.commands.start(
            `${interpreter} ${shellEscape(fullPath)}`,
            {
              onStdout: (data) => {
                logs.push(data);
                onOutput(data);
              },
              onStderr: (data) => {
                const line = `[stderr] ${data}`;
                logs.push(line);
                onOutput(line);
              },
            }
          );

          const result = await proc.wait();
          return {
            success: result.exitCode === 0,
            output: result.stdout,
            error: result.exitCode === 0 ? undefined : result.stderr,
            logs,
            artifacts: [],
            durationMs: Date.now() - startedAt,
          };
        } finally {
          await unlink(fullPath).catch(() => {
            /* noop */
          });
        }
      },
    };
  }
}
