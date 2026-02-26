import { z } from "zod";

export type SandboxProviderType = "daytona" | "local";

export type SandboxStatus =
  | "creating"
  | "running"
  | "paused"
  | "stopping"
  | "stopped"
  | "error";

export const SandboxConfigSchema = z.object({
  provider: z.enum(["daytona", "local"]).default("daytona"),
  template: z.string().default("base"),
  timeout: z.number().min(1000).max(86_400_000).default(300_000),
  cpuCores: z.number().min(0.25).max(8).default(1),
  memoryMb: z.number().min(128).max(8192).default(1024),
  diskMb: z.number().min(256).max(51_200).default(10_240),
  internetAccess: z.boolean().default(true),
  envVars: z.record(z.string(), z.string()).optional(),
  teamId: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

export type SandboxConfig = z.infer<typeof SandboxConfigSchema>;

export interface SandboxInfo {
  id: string;
  status: SandboxStatus;
  provider: SandboxProviderType;
  template: string;
  teamId?: string;
  createdAt: Date;
  expiresAt: Date;
  resources: {
    cpuCores: number;
    memoryMb: number;
    diskMb: number;
  };
  host?: string;
  metadata?: Record<string, string>;
}

export interface FileInfo {
  path: string;
  name: string;
  isDirectory: boolean;
  size: number;
  modifiedAt: Date;
  permissions?: string;
}

export interface FileEvent {
  type: "created" | "modified" | "deleted" | "renamed";
  path: string;
  oldPath?: string;
}

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface RunningProcess {
  pid: number;
  kill(): Promise<void>;
  wait(): Promise<CommandResult>;
}

export interface RunCommandOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

export interface StartCommandOptions {
  cwd?: string;
  env?: Record<string, string>;
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
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

export interface SandboxFileSystem {
  read(path: string): Promise<string>;
  readBytes(path: string): Promise<Uint8Array>;
  write(path: string, content: string): Promise<void>;
  writeBytes(path: string, data: Uint8Array): Promise<void>;
  list(path: string): Promise<FileInfo[]>;
  remove(path: string): Promise<void>;
  mkdir(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  stat(path: string): Promise<FileInfo>;
  watch(
    path: string,
    callback: (event: FileEvent) => void
  ): { dispose(): void };
}

export interface SandboxCommands {
  run(cmd: string, opts?: RunCommandOptions): Promise<CommandResult>;
  start(cmd: string, opts?: StartCommandOptions): Promise<RunningProcess>;
  list(): Promise<Array<{ pid: number; command: string }>>;
  kill(pid: number): Promise<void>;
}

export interface SandboxCodeRunner {
  run(
    code: string,
    language?: "python" | "javascript" | "bash"
  ): Promise<CodeExecutionResult>;
  runWithStreaming(
    code: string,
    onOutput: (output: string) => void,
    language?: "python" | "javascript" | "bash"
  ): Promise<CodeExecutionResult>;
}

export interface Sandbox {
  readonly id: string;
  readonly provider: SandboxProviderType;
  readonly status: SandboxStatus;

  getInfo(): Promise<SandboxInfo>;
  getHost(port: number): string;
  setTimeout(ms: number): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  destroy(): Promise<void>;

  files: SandboxFileSystem;
  commands: SandboxCommands;
  code: SandboxCodeRunner;
}

export interface SandboxProvider {
  readonly type: SandboxProviderType;

  isAvailable(): Promise<boolean>;
  create(config: SandboxConfig): Promise<Sandbox>;
  connect(sandboxId: string): Promise<Sandbox>;
  list(teamId?: string): Promise<SandboxInfo[]>;
  destroy(sandboxId: string): Promise<void>;
}

export interface SandboxTemplate {
  id: string;
  name: string;
  description: string;
  image: string;
  languages: string[];
  preInstalledPackages: string[];
}

export const ENVD_PORT = 49_983;
export const DEFAULT_WORKSPACE_DIR = "/workspace";
export const DEFAULT_TIMEOUT_MS = 300_000;
export const MAX_TIMEOUT_MS = 86_400_000;
