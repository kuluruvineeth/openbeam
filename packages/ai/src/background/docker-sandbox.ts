import type {
  CodeExecutionResult,
  FileInfo,
  ProcessResult,
  Sandbox,
  SandboxConfig,
  SandboxInfo,
  SandboxProvider,
} from "./sandbox";

const DEFAULT_IMAGE = "python:3.12-slim";
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const WHITESPACE_REGEX = /\s+/;

function getFileExtension(language: "python" | "javascript" | "bash"): string {
  if (language === "python") {
    return "py";
  }
  if (language === "javascript") {
    return "js";
  }
  return "sh";
}

interface DockerExecInspect {
  ExitCode?: number;
}

interface DockerContainerInspect {
  State: {
    Running: boolean;
    StartedAt: string;
  };
}

interface DockerContainerInfo {
  Id: string;
  State: string;
  Created: number;
}

interface DockerExec {
  start(options: {
    Detach?: boolean;
    Tty?: boolean;
    hijack?: boolean;
    stdin?: boolean;
  }): Promise<NodeJS.ReadWriteStream>;
  inspect(): Promise<DockerExecInspect>;
}

interface DockerContainer {
  id: string;
  start(): Promise<void>;
  stop(options?: { t?: number }): Promise<void>;
  kill(): Promise<void>;
  inspect(): Promise<DockerContainerInspect>;
  exec(options: {
    Cmd: string[];
    AttachStdin?: boolean;
    AttachStdout?: boolean;
    AttachStderr?: boolean;
    Env?: string[];
  }): Promise<DockerExec>;
}

interface DockerClient {
  ping(): Promise<void>;
  createContainer(options: {
    Image: string;
    Tty?: boolean;
    OpenStdin?: boolean;
    Cmd?: string[];
    Labels?: Record<string, string>;
    HostConfig?: {
      Memory?: number;
      CpuPeriod?: number;
      CpuQuota?: number;
      NetworkMode?: string;
      AutoRemove?: boolean;
      ReadonlyRootfs?: boolean;
      SecurityOpt?: string[];
      CapDrop?: string[];
      CapAdd?: string[];
    };
    Env?: string[];
  }): Promise<DockerContainer>;
  getContainer(containerId: string): DockerContainer;
  listContainers(options?: {
    filters?: { label?: string[] };
  }): Promise<DockerContainerInfo[]>;
}

export class DockerSandboxProvider implements SandboxProvider {
  readonly name = "Docker";
  readonly type = "docker" as const;

  private docker: DockerClient | null = null;
  private readonly containers = new Map<string, DockerContainer>();

  private async getDocker(): Promise<DockerClient> {
    if (!this.docker) {
      // @ts-expect-error - Optional dependency, may not be installed
      const dockerModule = await import("dockerode").catch(() => null);
      if (!dockerModule) {
        throw new Error("dockerode not installed");
      }
      const Dockerode = dockerModule.default;
      this.docker = new Dockerode() as DockerClient;
    }
    return this.docker;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const docker = await this.getDocker();
      await docker.ping();
      return true;
    } catch {
      return false;
    }
  }

  async create(config?: SandboxConfig): Promise<Sandbox> {
    const docker = await this.getDocker();
    const container = await docker.createContainer({
      Image: config?.template ?? DEFAULT_IMAGE,
      Tty: true,
      OpenStdin: true,
      Cmd: ["/bin/bash"],
      Labels: { "openplane.sandbox": "true" },
      HostConfig: {
        Memory: (config?.memoryMb ?? 512) * 1024 * 1024,
        CpuPeriod: 100_000,
        CpuQuota: (config?.cpuCores ?? 1) * 100_000,
        NetworkMode: config?.internetAccess === false ? "none" : "bridge",
        AutoRemove: true,
        ReadonlyRootfs: false,
        SecurityOpt: ["no-new-privileges"],
        CapDrop: ["ALL"],
        CapAdd: ["CHOWN", "SETUID", "SETGID"],
      },
      Env: config?.envVars
        ? Object.entries(config.envVars).map(([k, v]) => `${k}=${v}`)
        : undefined,
    });

    await container.start();

    const adapter = new DockerSandboxAdapter(container);
    this.containers.set(container.id, container);

    if (config?.timeout) {
      setTimeout(async () => {
        try {
          await adapter.kill();
        } catch {
          // Container may already be stopped
        }
      }, config.timeout);
    }

    return adapter;
  }

  async connect(containerId: string): Promise<Sandbox> {
    const docker = await this.getDocker();
    const container = docker.getContainer(containerId);
    const inspection = await container.inspect();

    if (!inspection.State.Running) {
      throw new Error(`Container ${containerId} is not running`);
    }

    return new DockerSandboxAdapter(container);
  }

  async list(): Promise<SandboxInfo[]> {
    const docker = await this.getDocker();
    const containers = await docker.listContainers({
      filters: { label: ["openplane.sandbox=true"] },
    });

    return containers.map((c) => ({
      id: c.Id,
      status:
        c.State === "running" ? ("running" as const) : ("stopped" as const),
      startedAt: new Date(c.Created * 1000),
      expiresAt: new Date(Date.now() + DEFAULT_TIMEOUT_MS),
    }));
  }
}

class DockerSandboxAdapter implements Sandbox {
  readonly type = "docker" as const;
  private readonly container: DockerContainer;

  constructor(container: DockerContainer) {
    this.container = container;
  }

  get id(): string {
    return this.container.id;
  }

  async getInfo(): Promise<SandboxInfo> {
    const inspection = await this.container.inspect();
    return {
      id: this.container.id,
      status: inspection.State.Running ? "running" : "stopped",
      startedAt: new Date(inspection.State.StartedAt),
      expiresAt: new Date(Date.now() + DEFAULT_TIMEOUT_MS),
    };
  }

  async setTimeout(_timeoutMs: number): Promise<void> {
    // Docker doesn't have built-in timeout; handled externally
  }

  async kill(): Promise<void> {
    try {
      await this.container.stop({ t: 5 });
    } catch {
      await this.container.kill();
    }
  }

  files = {
    read: async (path: string): Promise<string> => {
      const exec = await this.container.exec({
        Cmd: ["cat", path],
        AttachStdout: true,
        AttachStderr: true,
      });

      const stream = await exec.start({ Detach: false, Tty: false });
      return new Promise((resolve, reject) => {
        let output = "";
        stream.on("data", (chunk: Buffer) => {
          output += chunk.toString();
        });
        stream.on("end", () => resolve(output));
        stream.on("error", reject);
      });
    },

    write: async (path: string, content: string): Promise<void> => {
      const exec = await this.container.exec({
        Cmd: ["sh", "-c", `cat > ${path}`],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
      });

      const stream = await exec.start({ hijack: true, stdin: true });
      stream.write(content);
      stream.end();

      await new Promise<void>((resolve) => {
        stream.on("end", resolve);
      });
    },

    list: async (path: string): Promise<FileInfo[]> => {
      const result = await this.process.run(`ls -la ${path}`);
      const lines = result.stdout.split("\n").slice(1);

      return lines
        .filter((line) => line.trim())
        .map((line) => {
          const parts = line.split(WHITESPACE_REGEX);
          const isDirectory = parts[0]?.startsWith("d") ?? false;
          const name = parts[8] ?? "";
          const size = Number.parseInt(parts[4] ?? "0", 10);

          return {
            path: `${path}/${name}`,
            name,
            isDirectory,
            size,
            modifiedAt: new Date(),
          };
        });
    },

    remove: async (path: string): Promise<void> => {
      await this.process.run(`rm -rf ${path}`);
    },

    exists: async (path: string): Promise<boolean> => {
      const result = await this.process.run(`test -e ${path} && echo "exists"`);
      return result.stdout.includes("exists");
    },

    mkdir: async (path: string): Promise<void> => {
      await this.process.run(`mkdir -p ${path}`);
    },

    upload: async (localPath: string, remotePath: string): Promise<void> => {
      const fs = await import("node:fs/promises");
      const content = await fs.readFile(localPath, "utf-8");
      await this.files.write(remotePath, content);
    },

    download: async (remotePath: string, localPath: string): Promise<void> => {
      const fs = await import("node:fs/promises");
      const content = await this.files.read(remotePath);
      await fs.writeFile(localPath, content);
    },
  };

  process = {
    run: async (
      command: string,
      options?: { cwd?: string; env?: Record<string, string>; timeout?: number }
    ): Promise<ProcessResult> => {
      const startTime = Date.now();

      const cmdParts = options?.cwd
        ? ["sh", "-c", `cd ${options.cwd} && ${command}`]
        : ["sh", "-c", command];

      const exec = await this.container.exec({
        Cmd: cmdParts,
        AttachStdout: true,
        AttachStderr: true,
        Env: options?.env
          ? Object.entries(options.env).map(([k, v]) => `${k}=${v}`)
          : undefined,
      });

      const stream = await exec.start({ Detach: false, Tty: false });

      return new Promise((resolve, reject) => {
        let stdout = "";
        const stderr = "";

        const timeout = options?.timeout
          ? setTimeout(() => {
              reject(new Error("Command timed out"));
            }, options.timeout)
          : null;

        stream.on("data", (chunk: Buffer) => {
          const data = chunk.toString();
          stdout += data;
        });

        stream.on("end", async () => {
          if (timeout) {
            clearTimeout(timeout);
          }

          const inspection = await exec.inspect();
          resolve({
            exitCode: inspection.ExitCode ?? 0,
            stdout,
            stderr,
            durationMs: Date.now() - startTime,
          });
        });

        stream.on("error", (err) => {
          if (timeout) {
            clearTimeout(timeout);
          }
          reject(err);
        });
      });
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
      const exec = await this.container.exec({
        Cmd: ["sh", "-c", command],
        AttachStdout: true,
        AttachStderr: true,
      });

      const stream = await exec.start({ Detach: false, Tty: false });

      if (options?.onStdout) {
        stream.on("data", (chunk: Buffer) => {
          options.onStdout?.(chunk.toString());
        });
      }

      return {
        pid: 0,
        kill: async () => {
          // Docker exec doesn't support killing; would need process ID
        },
        wait: async (): Promise<ProcessResult> =>
          new Promise((resolve) => {
            let stdout = "";
            stream.on("data", (chunk: Buffer) => {
              stdout += chunk.toString();
            });
            stream.on("end", async () => {
              const inspection = await exec.inspect();
              resolve({
                exitCode: inspection.ExitCode ?? 0,
                stdout,
                stderr: "",
                durationMs: 0,
              });
            });
          }),
      };
    },
  };

  code = {
    run: async (
      code: string,
      language: "python" | "javascript" | "bash" = "python"
    ): Promise<CodeExecutionResult> => {
      const startTime = Date.now();

      const interpreters: Record<string, string> = {
        python: "python3",
        javascript: "node",
        bash: "bash",
      };

      const interpreter = interpreters[language];
      const extension = getFileExtension(language);
      const tempFile = `/tmp/code_${Date.now()}.${extension}`;

      await this.files.write(tempFile, code);
      const result = await this.process.run(`${interpreter} ${tempFile}`);
      await this.files.remove(tempFile);

      return {
        success: result.exitCode === 0,
        output: result.stdout,
        error: result.exitCode !== 0 ? result.stderr : undefined,
        logs: result.stdout.split("\n").filter(Boolean),
        artifacts: [],
        durationMs: Date.now() - startTime,
      };
    },

    runWithStreaming: async (
      code: string,
      onOutput: (output: string) => void,
      language: "python" | "javascript" | "bash" = "python"
    ): Promise<CodeExecutionResult> => {
      const startTime = Date.now();
      const logs: string[] = [];

      const interpreters: Record<string, string> = {
        python: "python3",
        javascript: "node",
        bash: "bash",
      };

      const interpreter = interpreters[language];
      const extension = getFileExtension(language);
      const tempFile = `/tmp/code_${Date.now()}.${extension}`;

      await this.files.write(tempFile, code);

      const proc = await this.process.start(`${interpreter} ${tempFile}`, {
        onStdout: (data) => {
          logs.push(data);
          onOutput(data);
        },
        onStderr: (data) => {
          logs.push(`[stderr] ${data}`);
          onOutput(`[stderr] ${data}`);
        },
      });

      const result = await proc.wait();
      await this.files.remove(tempFile);

      return {
        success: result.exitCode === 0,
        output: result.stdout,
        error: result.exitCode !== 0 ? result.stderr : undefined,
        logs,
        artifacts: [],
        durationMs: Date.now() - startTime,
      };
    },
  };
}

let dockerProvider: DockerSandboxProvider | null = null;

export function getDockerSandboxProvider(): DockerSandboxProvider {
  if (!dockerProvider) {
    dockerProvider = new DockerSandboxProvider();
  }
  return dockerProvider;
}
