export interface SandboxConfig {
  timeout?: number;
  memoryMb?: number;
  cpuCores?: number;
  internetAccess?: boolean;
  template?: string;
  envVars?: Record<string, string>;
}

export interface SandboxInfo {
  id: string;
  status: "running" | "stopped" | "error";
  startedAt: Date;
  expiresAt: Date;
  url?: string;
}

export interface FileInfo {
  path: string;
  name: string;
  isDirectory: boolean;
  size: number;
  modifiedAt: Date;
}

export interface ProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface CodeExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  logs: string[];
  artifacts: Array<{
    type: "file" | "image" | "chart";
    path: string;
    mimeType?: string;
  }>;
  durationMs: number;
}

export interface Sandbox {
  readonly id: string;
  readonly type: "daytona" | "local";

  getInfo(): Promise<SandboxInfo>;

  setTimeout(timeoutMs: number): Promise<void>;

  kill(): Promise<void>;

  files: {
    read(path: string): Promise<string>;
    write(path: string, content: string): Promise<void>;
    list(path: string): Promise<FileInfo[]>;
    remove(path: string): Promise<void>;
    exists(path: string): Promise<boolean>;
    mkdir(path: string): Promise<void>;
    upload(localPath: string, remotePath: string): Promise<void>;
    download(remotePath: string, localPath: string): Promise<void>;
  };

  process: {
    run(
      command: string,
      options?: {
        cwd?: string;
        env?: Record<string, string>;
        timeout?: number;
      }
    ): Promise<ProcessResult>;

    start(
      command: string,
      options?: {
        cwd?: string;
        env?: Record<string, string>;
        onStdout?: (data: string) => void;
        onStderr?: (data: string) => void;
      }
    ): Promise<{
      pid: number;
      kill: () => Promise<void>;
      wait: () => Promise<ProcessResult>;
    }>;
  };

  code: {
    run(
      code: string,
      language?: "python" | "javascript" | "bash"
    ): Promise<CodeExecutionResult>;

    runWithStreaming(
      code: string,
      onOutput: (output: string) => void,
      language?: "python" | "javascript" | "bash"
    ): Promise<CodeExecutionResult>;
  };
}

export interface SandboxProvider {
  readonly name: string;
  readonly type: "daytona" | "local";

  isAvailable(): Promise<boolean>;

  create(config?: SandboxConfig): Promise<Sandbox>;

  connect(sandboxId: string): Promise<Sandbox>;

  list(): Promise<SandboxInfo[]>;
}

export type SandboxType = "daytona" | "local";
