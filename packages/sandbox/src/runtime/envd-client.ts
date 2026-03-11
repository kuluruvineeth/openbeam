import type {
  CommandResult,
  FileEvent,
  FileInfo,
  RunCommandOptions,
  RunningProcess,
  SandboxCommands,
  SandboxFileSystem,
  StartCommandOptions,
} from "../types";
import { ENVD_PORT } from "../types";

export class EnvdClientError extends Error {
  readonly statusCode: number;
  readonly endpoint: string;

  constructor(message: string, statusCode: number, endpoint: string) {
    super(message);
    this.name = "EnvdClientError";
    this.statusCode = statusCode;
    this.endpoint = endpoint;
  }
}

export class EnvdClient {
  private readonly baseUrl: string;

  constructor(host: string, port: number = ENVD_PORT) {
    this.baseUrl = `http://${host}:${port}`;
  }

  async health(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async waitForReady(timeoutMs = 30_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    const interval = 500;

    while (Date.now() < deadline) {
      if (await this.health()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new EnvdClientError(
      `Envd not ready after ${timeoutMs}ms`,
      0,
      "/health"
    );
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "Unknown error");
      throw new EnvdClientError(text, response.status, path);
    }

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return response.json() as Promise<T>;
    }
    return response.text() as unknown as T;
  }

  createFileSystem(): SandboxFileSystem {
    return {
      read: async (path: string): Promise<string> =>
        this.request<string>("POST", "/files/read", { path }),

      readBytes: async (path: string): Promise<Uint8Array> => {
        const response = await fetch(`${this.baseUrl}/files/read-bytes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path }),
        });
        if (!response.ok) {
          throw new EnvdClientError(
            await response.text(),
            response.status,
            "/files/read-bytes"
          );
        }
        const buffer = await response.arrayBuffer();
        return new Uint8Array(buffer);
      },

      write: async (path: string, content: string): Promise<void> => {
        await this.request("POST", "/files/write", { path, content });
      },

      writeBytes: async (path: string, data: Uint8Array): Promise<void> => {
        const response = await fetch(`${this.baseUrl}/files/write-bytes`, {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: data as never,
        });
        if (!response.ok) {
          throw new EnvdClientError(
            await response.text(),
            response.status,
            `/files/write-bytes?path=${encodeURIComponent(path)}`
          );
        }
      },

      list: async (path: string): Promise<FileInfo[]> =>
        this.request<FileInfo[]>("POST", "/files/list", { path }),

      remove: async (path: string): Promise<void> => {
        await this.request("POST", "/files/remove", { path });
      },

      mkdir: async (path: string): Promise<void> => {
        await this.request("POST", "/files/mkdir", { path });
      },

      exists: async (path: string): Promise<boolean> =>
        this.request<boolean>("POST", "/files/exists", { path }),

      stat: async (path: string): Promise<FileInfo> =>
        this.request<FileInfo>("POST", "/files/stat", { path }),

      watch: (_path: string, _callback: (event: FileEvent) => void) => ({
        dispose: () => {
          /* noop */
        },
      }),
    };
  }

  createCommands(): SandboxCommands {
    return {
      run: async (
        cmd: string,
        opts?: RunCommandOptions
      ): Promise<CommandResult> =>
        this.request<CommandResult>("POST", "/exec/run", {
          command: cmd,
          cwd: opts?.cwd,
          env: opts?.env,
          timeout: opts?.timeout,
        }),

      start: async (
        cmd: string,
        opts?: StartCommandOptions
      ): Promise<RunningProcess> => {
        const result = await this.request<{ pid: number }>(
          "POST",
          "/exec/start",
          {
            command: cmd,
            cwd: opts?.cwd,
            env: opts?.env,
          }
        );

        return {
          pid: result.pid,
          kill: async () => {
            await this.request("POST", "/exec/kill", { pid: result.pid });
          },
          wait: async (): Promise<CommandResult> =>
            this.request<CommandResult>("POST", "/exec/wait", {
              pid: result.pid,
            }),
        };
      },

      list: async (): Promise<Array<{ pid: number; command: string }>> =>
        this.request("GET", "/exec/list"),

      kill: async (pid: number): Promise<void> => {
        await this.request("POST", "/exec/kill", { pid });
      },
    };
  }
}
