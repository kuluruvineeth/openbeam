import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
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

const DEFAULT_DAYTONA_API_URL = "https://app.daytona.io/api";
const DEFAULT_DAYTONA_WORKDIR = "/home/daytona";
const DEFAULT_DAYTONA_TEAM_PREFIX = "op";
const MAX_SANDBOX_NAME_LENGTH = 63;
const MAX_TEAM_SLUG_LENGTH = 24;
const PROCESS_LIST_ENTRY_REGEX = /^(\d+)\s+(.*)$/;
const NEWLINE_REGEX = /\r?\n/;
const NON_ALNUM_DASH_REGEX = /[^a-z0-9-]+/g;
const LEADING_TRAILING_DASH_REGEX = /^-+|-+$/g;
const MULTI_DASH_REGEX = /-+/g;
const TRAILING_SLASH_REGEX = /\/+$/;
const DAYTONA_MANAGED_LABEL = "openbeam.sandbox";
const DAYTONA_MANAGED_LABEL_VALUE = "true";
const DAYTONA_TEAM_LABEL = "openbeam.team";
const DAYTONA_TEMPLATE_LABEL = "openbeam.template";
const COMMAND_TIMEOUT_BUFFER_MS = 1000;
const CONNECT_CACHE_TTL_MS = 30_000;
const MAX_OWNED_SANDBOXES = 500;

type DaytonaProviderConfig = {
  apiKey?: string;
  jwtToken?: string;
  organizationId?: string;
  apiUrl?: string;
  target?: string;
  workspaceDir?: string;
  teamPrefix?: string;
  sdkLoader?: DaytonaSdkLoader;
};

type DaytonaSdkLoader = () => Promise<DaytonaSdkModule>;

type DaytonaSdkModule = {
  Daytona: new (config?: DaytonaClientConfig) => unknown;
};

type DaytonaClientConfig = {
  apiKey?: string;
  jwtToken?: string;
  organizationId?: string;
  apiUrl?: string;
  target?: string;
};

type DaytonaListResult = {
  items: DaytonaSandboxInstance[];
  total?: number;
  page?: number;
  totalPages?: number;
};

type DaytonaClient = {
  create(
    params?: Record<string, unknown>,
    options?: {
      timeout?: number;
    }
  ): Promise<DaytonaSandboxInstance>;
  get(sandboxIdOrName: string): Promise<DaytonaSandboxInstance>;
  list(
    labels?: Record<string, string>,
    page?: number,
    limit?: number
  ): Promise<DaytonaListResult>;
  delete(sandbox: DaytonaSandboxInstance, timeout?: number): Promise<void>;
};

type DaytonaSandboxInstance = {
  id: string;
  state?: string;
  createdAt?: string;
  labels?: Record<string, string>;
  cpu?: number;
  memory?: number;
  disk?: number;
  fs: {
    downloadFile(path: string, timeout?: number): Promise<Buffer>;
    uploadFile(
      content: Buffer | string,
      path: string,
      timeout?: number
    ): Promise<void>;
    listFiles(path: string): Promise<DaytonaFileDetails[]>;
    deleteFile(path: string, recursive?: boolean): Promise<void>;
    createFolder(path: string, mode: string): Promise<void>;
    getFileDetails(path: string): Promise<DaytonaFileDetails>;
  };
  process: {
    executeCommand(
      command: string,
      cwd?: string,
      env?: Record<string, string>,
      timeout?: number
    ): Promise<DaytonaExecuteResponse>;
  };
  start?(timeout?: number): Promise<void>;
  stop?(timeout?: number): Promise<void>;
  setAutoStopInterval?(minutes: number): Promise<void>;
  delete(timeout?: number): Promise<void>;
};

type DaytonaExecuteResponse = {
  exitCode: number;
  result: string;
};

type DaytonaFileDetails = {
  name?: string;
  path?: string;
  isDir?: boolean;
  size?: number;
  modTime?: string;
  mode?: string;
};

type OwnedSandboxMeta = {
  teamId?: string;
  template: string;
  resources: {
    cpuCores: number;
    memoryMb: number;
    diskMb: number;
  };
};

function sanitizeSlug(value: string, maxLength: number): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(NON_ALNUM_DASH_REGEX, "-")
    .replace(MULTI_DASH_REGEX, "-")
    .replace(LEADING_TRAILING_DASH_REGEX, "");

  const clamped = normalized.slice(0, maxLength).replace(/-+$/g, "");
  return clamped.length > 0 ? clamped : "default";
}

function splitLines(value: string): string[] {
  return value
    .split(NEWLINE_REGEX)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
}

function shellEscape(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function buildInterpreterCommand(code: string, interpreter: string): string {
  const encoded = Buffer.from(code, "utf8").toString("base64");
  return `echo ${shellEscape(encoded)} | base64 -d | ${interpreter}`;
}

function nowPlusTimeout(timeoutMs: number | undefined): Date {
  return new Date(Date.now() + (timeoutMs ?? DEFAULT_TIMEOUT_MS));
}

function toTimeoutSeconds(timeoutMs: number | undefined): number | undefined {
  if (!timeoutMs || timeoutMs <= 0) {
    return;
  }
  return Math.max(1, Math.ceil(timeoutMs / 1000));
}

function toTimeoutMinutes(timeoutMs: number | undefined): number {
  const normalized =
    timeoutMs && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS;
  return Math.max(1, Math.ceil(normalized / 60_000));
}

function toGiB(memoryMb: number): number {
  return Math.max(0.25, Math.round((memoryMb / 1024) * 100) / 100);
}

function toMb(memoryGiB: number | undefined, fallbackMb: number): number {
  if (typeof memoryGiB !== "number" || !Number.isFinite(memoryGiB)) {
    return fallbackMb;
  }
  return Math.max(128, Math.round(memoryGiB * 1024));
}

function resolveTemplateImage(template: string): string | undefined {
  const imageMap: Record<string, string> = {
    base: "daytonaio/sandbox",
    python: "daytonaio/sandbox",
    node: "daytonaio/sandbox",
    browser: "daytonaio/sandbox",
    "data-science": "daytonaio/sandbox",
    full: "daytonaio/sandbox",
  };

  const mapped = imageMap[template];
  if (mapped) {
    return mapped;
  }

  if (
    template.includes("/") ||
    template.includes(":") ||
    template.includes("@sha256:")
  ) {
    return template;
  }

  return;
}

function resolveTemplateLanguage(template: string): string {
  if (template === "node" || template === "browser") {
    return "javascript";
  }
  return "python";
}

function joinPath(base: string, child: string): string {
  if (base === "." || base === "/") {
    return `${base === "/" ? "" : "."}/${child}`;
  }
  return `${base.replace(TRAILING_SLASH_REGEX, "")}/${child}`;
}

function toSandboxStatus(state: string | undefined): SandboxStatus {
  switch (state) {
    case "created":
    case "starting":
    case "pending_build":
      return "creating";
    case "started":
      return "running";
    case "stopping":
    case "pending_stop":
      return "stopping";
    case "stopped":
    case "archived":
    case "deleted":
      return "stopped";
    case "error":
    case "build_failed":
      return "error";
    default:
      return "running";
  }
}

function isNotFoundError(error: unknown): boolean {
  const message =
    typeof error === "object" && error && "message" in error
      ? String(error.message)
      : String(error);
  return message.toLowerCase().includes("not found");
}

async function defaultDaytonaSdkLoader(): Promise<DaytonaSdkModule> {
  const moduleName = "@daytonaio/sdk";
  const importModule = new Function("name", "return import(name);") as (
    name: string
  ) => Promise<unknown>;
  const sdkModule = await importModule(moduleName).catch(() => null);
  if (
    !sdkModule ||
    typeof (sdkModule as { Daytona?: unknown }).Daytona !== "function"
  ) {
    throw new Error("@daytonaio/sdk not installed");
  }
  return sdkModule as unknown as DaytonaSdkModule;
}

export class DaytonaSandboxProvider implements SandboxProvider {
  readonly type = "daytona" as const;

  private readonly apiKey: string | undefined;
  private readonly jwtToken: string | undefined;
  private readonly organizationId: string | undefined;
  private readonly apiUrl: string;
  private readonly target: string | undefined;
  private readonly workspaceDir: string;
  private readonly teamPrefix: string;
  private readonly sdkLoader: DaytonaSdkLoader;

  private client: DaytonaClient | null = null;
  private readonly ownedSandboxes = new Map<string, OwnedSandboxMeta>();
  private readonly connectCache = new Map<
    string,
    { sandbox: DaytonaSandboxInstance; expiresAt: number }
  >();

  constructor(config?: DaytonaProviderConfig) {
    this.apiKey = config?.apiKey ?? process.env.DAYTONA_API_KEY;
    this.jwtToken = config?.jwtToken ?? process.env.DAYTONA_JWT_TOKEN;
    this.organizationId =
      config?.organizationId ?? process.env.DAYTONA_ORGANIZATION_ID;
    this.apiUrl = (
      config?.apiUrl ??
      process.env.DAYTONA_API_URL ??
      DEFAULT_DAYTONA_API_URL
    ).replace(TRAILING_SLASH_REGEX, "");
    this.target = config?.target ?? process.env.DAYTONA_TARGET;
    this.workspaceDir =
      config?.workspaceDir ??
      process.env.DAYTONA_WORKDIR ??
      DEFAULT_DAYTONA_WORKDIR;
    this.teamPrefix = sanitizeSlug(
      config?.teamPrefix ??
        process.env.DAYTONA_TEAM_PREFIX ??
        DEFAULT_DAYTONA_TEAM_PREFIX,
      12
    );
    this.sdkLoader = config?.sdkLoader ?? defaultDaytonaSdkLoader;
  }

  private hasCredentials(): boolean {
    if (this.apiKey) {
      return true;
    }
    return Boolean(this.jwtToken && this.organizationId);
  }

  private buildClientConfig(): DaytonaClientConfig {
    const config: DaytonaClientConfig = {
      apiUrl: this.apiUrl,
    };

    if (this.apiKey) {
      config.apiKey = this.apiKey;
    }
    if (this.jwtToken) {
      config.jwtToken = this.jwtToken;
    }
    if (this.organizationId) {
      config.organizationId = this.organizationId;
    }
    if (this.target) {
      config.target = this.target;
    }

    return config;
  }

  private async getClient(): Promise<DaytonaClient> {
    if (this.client) {
      return this.client;
    }

    const sdk = await this.sdkLoader();
    this.client = new sdk.Daytona(this.buildClientConfig()) as DaytonaClient;
    return this.client;
  }

  private evictOldestOwned(): void {
    if (this.ownedSandboxes.size <= MAX_OWNED_SANDBOXES) {
      return;
    }
    const firstKey = this.ownedSandboxes.keys().next().value;
    if (firstKey) {
      this.ownedSandboxes.delete(firstKey);
    }
  }

  private getCachedSandbox(
    sandboxId: string
  ): DaytonaSandboxInstance | undefined {
    const entry = this.connectCache.get(sandboxId);
    if (!entry) {
      return;
    }
    if (Date.now() > entry.expiresAt) {
      this.connectCache.delete(sandboxId);
      return;
    }
    return entry.sandbox;
  }

  private setCachedSandbox(
    sandboxId: string,
    sandbox: DaytonaSandboxInstance
  ): void {
    this.connectCache.set(sandboxId, {
      sandbox,
      expiresAt: Date.now() + CONNECT_CACHE_TTL_MS,
    });
  }

  private teamSlug(teamId: string | undefined): string {
    if (!teamId) {
      return "global";
    }
    return sanitizeSlug(teamId, MAX_TEAM_SLUG_LENGTH);
  }

  private buildSandboxName(teamId: string | undefined): string {
    const random = randomUUID().replace(/-/g, "").slice(0, 12);
    const prefix = `${this.teamPrefix}-${this.teamSlug(teamId)}-`;
    const merged = `${prefix}${random}`.toLowerCase();
    const sanitized = sanitizeSlug(merged, MAX_SANDBOX_NAME_LENGTH);
    return sanitized.length > 0 ? sanitized : `op-${random}`;
  }

  private inferMetaFromSandbox(
    sandbox: DaytonaSandboxInstance,
    fallbackTemplate = "base"
  ): OwnedSandboxMeta {
    const labels = sandbox.labels ?? {};
    const template = labels[DAYTONA_TEMPLATE_LABEL] ?? fallbackTemplate;
    const teamId = labels[DAYTONA_TEAM_LABEL];

    return {
      teamId,
      template,
      resources: {
        cpuCores:
          typeof sandbox.cpu === "number" && Number.isFinite(sandbox.cpu)
            ? Math.max(0.25, sandbox.cpu)
            : 1,
        memoryMb: toMb(sandbox.memory, 1024),
        diskMb: toMb(sandbox.disk, 10_240),
      },
    };
  }

  private async listManagedSandboxes(
    labels: Record<string, string>
  ): Promise<DaytonaSandboxInstance[]> {
    const client = await this.getClient();
    const all: DaytonaSandboxInstance[] = [];
    const limit = 100;
    let page = 1;

    while (true) {
      const result = await client.list(labels, page, limit);
      all.push(...result.items);

      let totalPages: number | undefined;
      if (typeof result.totalPages === "number") {
        totalPages = result.totalPages;
      } else if (typeof result.total === "number") {
        totalPages = Math.max(1, Math.ceil(result.total / limit));
      }

      if (totalPages !== undefined) {
        if (page >= totalPages) {
          break;
        }
      } else if (result.items.length < limit) {
        break;
      }

      page += 1;
    }

    return all;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.hasCredentials()) {
      return false;
    }

    try {
      const client = await this.getClient();
      await client.list(
        { [DAYTONA_MANAGED_LABEL]: DAYTONA_MANAGED_LABEL_VALUE },
        1,
        1
      );
      return true;
    } catch {
      return false;
    }
  }

  async create(config: SandboxConfig): Promise<Sandbox> {
    if (!this.hasCredentials()) {
      throw new Error("Daytona provider not configured");
    }

    const client = await this.getClient();
    const timeoutMs = config.timeout ?? DEFAULT_TIMEOUT_MS;
    const timeoutSeconds = toTimeoutSeconds(timeoutMs);
    const image = resolveTemplateImage(config.template);
    const labels: Record<string, string> = {
      [DAYTONA_MANAGED_LABEL]: DAYTONA_MANAGED_LABEL_VALUE,
      [DAYTONA_TEMPLATE_LABEL]: config.template,
    };
    if (config.teamId) {
      labels[DAYTONA_TEAM_LABEL] = config.teamId;
    }

    const sandbox = await client.create(
      {
        name: this.buildSandboxName(config.teamId),
        image,
        language: resolveTemplateLanguage(config.template),
        envVars: config.envVars,
        labels,
        networkBlockAll: config.internetAccess === false,
        autoStopInterval: toTimeoutMinutes(timeoutMs),
        resources: {
          cpu: config.cpuCores,
          memory: toGiB(config.memoryMb),
          disk: toGiB(config.diskMb),
        },
      },
      {
        timeout: timeoutSeconds,
      }
    );

    const meta: OwnedSandboxMeta = {
      teamId: config.teamId,
      template: config.template,
      resources: {
        cpuCores: config.cpuCores,
        memoryMb: config.memoryMb,
        diskMb: config.diskMb,
      },
    };
    this.ownedSandboxes.set(sandbox.id, meta);
    this.evictOldestOwned();

    return new DaytonaSandboxAdapter({
      sandbox,
      provider: this,
      meta,
      expiresAt: nowPlusTimeout(timeoutMs),
      workspaceDir: this.workspaceDir,
    });
  }

  async connect(sandboxId: string): Promise<Sandbox> {
    let sandbox = this.getCachedSandbox(sandboxId);
    if (!sandbox) {
      const client = await this.getClient();
      sandbox = await client.get(sandboxId);
      this.setCachedSandbox(sandboxId, sandbox);
    }
    const meta =
      this.ownedSandboxes.get(sandboxId) ?? this.inferMetaFromSandbox(sandbox);
    this.ownedSandboxes.set(sandboxId, meta);
    this.evictOldestOwned();

    return new DaytonaSandboxAdapter({
      sandbox,
      provider: this,
      meta,
      expiresAt: nowPlusTimeout(undefined),
      workspaceDir: this.workspaceDir,
    });
  }

  async list(teamId?: string): Promise<SandboxInfo[]> {
    const labels: Record<string, string> = {
      [DAYTONA_MANAGED_LABEL]: DAYTONA_MANAGED_LABEL_VALUE,
    };
    if (teamId) {
      labels[DAYTONA_TEAM_LABEL] = teamId;
    }

    const sandboxes = await this.listManagedSandboxes(labels);
    const infos = sandboxes.map((sandbox) => {
      const meta =
        this.ownedSandboxes.get(sandbox.id) ??
        this.inferMetaFromSandbox(sandbox);
      this.ownedSandboxes.set(sandbox.id, meta);
      return this.buildSandboxInfo(
        sandbox,
        meta,
        null,
        nowPlusTimeout(undefined)
      );
    });

    if (!teamId) {
      return infos;
    }
    return infos.filter((info) => info.teamId === teamId);
  }

  async destroy(sandboxId: string): Promise<void> {
    const client = await this.getClient();

    try {
      const sandbox = await client.get(sandboxId);
      await client.delete(sandbox, 60);
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw error;
      }
    } finally {
      this.ownedSandboxes.delete(sandboxId);
      this.connectCache.delete(sandboxId);
    }
  }

  async getSandboxById(sandboxId: string): Promise<DaytonaSandboxInstance> {
    const client = await this.getClient();
    return client.get(sandboxId);
  }

  forgetSandbox(sandboxId: string): void {
    this.ownedSandboxes.delete(sandboxId);
  }

  buildSandboxInfo(
    sandbox: DaytonaSandboxInstance,
    meta: OwnedSandboxMeta,
    statusOverride: SandboxStatus | null,
    expiresAt: Date
  ): SandboxInfo {
    const createdAt = sandbox.createdAt
      ? new Date(sandbox.createdAt)
      : new Date();
    const status = statusOverride ?? toSandboxStatus(sandbox.state);

    return {
      id: sandbox.id,
      status,
      provider: "daytona",
      template: meta.template,
      teamId: meta.teamId,
      createdAt,
      expiresAt,
      resources: meta.resources,
      metadata: {
        state: sandbox.state ?? "",
      },
    };
  }
}

class DaytonaSandboxAdapter implements Sandbox {
  readonly id: string;
  readonly provider = "daytona" as const;

  private sandbox: DaytonaSandboxInstance;
  private readonly daytonaProvider: DaytonaSandboxProvider;
  private readonly meta: OwnedSandboxMeta;
  private readonly workspaceDir: string;
  private expiresAt: Date;
  private statusOverride: SandboxStatus | null = null;

  readonly files: SandboxFileSystem;
  readonly commands: SandboxCommands;
  readonly code: SandboxCodeRunner;

  constructor(init: {
    sandbox: DaytonaSandboxInstance;
    provider: DaytonaSandboxProvider;
    meta: OwnedSandboxMeta;
    expiresAt: Date;
    workspaceDir: string;
  }) {
    this.id = init.sandbox.id;
    this.sandbox = init.sandbox;
    this.daytonaProvider = init.provider;
    this.meta = init.meta;
    this.expiresAt = init.expiresAt;
    this.workspaceDir = init.workspaceDir;
    this.files = this.createFileSystem();
    this.commands = this.createCommands();
    this.code = this.createCodeRunner();
  }

  get status(): SandboxStatus {
    return this.statusOverride ?? toSandboxStatus(this.sandbox.state);
  }

  private async refreshSandbox(): Promise<void> {
    this.sandbox = await this.daytonaProvider.getSandboxById(this.id);
  }

  async getInfo(): Promise<SandboxInfo> {
    await this.refreshSandbox();
    return this.daytonaProvider.buildSandboxInfo(
      this.sandbox,
      this.meta,
      this.statusOverride,
      this.expiresAt
    );
  }

  getHost(port: number): string {
    return `127.0.0.1:${port}`;
  }

  async setTimeout(ms: number): Promise<void> {
    this.expiresAt = nowPlusTimeout(ms);
    if (this.sandbox.setAutoStopInterval) {
      await this.sandbox.setAutoStopInterval(toTimeoutMinutes(ms));
    }
  }

  async pause(): Promise<void> {
    this.statusOverride = "stopping";
    if (this.sandbox.stop) {
      await this.sandbox.stop(toTimeoutSeconds(DEFAULT_TIMEOUT_MS));
    }
    this.statusOverride = "stopped";
    await this.refreshSandbox();
  }

  async resume(): Promise<void> {
    this.statusOverride = "creating";
    if (this.sandbox.start) {
      await this.sandbox.start(toTimeoutSeconds(DEFAULT_TIMEOUT_MS));
    }
    this.statusOverride = "running";
    await this.refreshSandbox();
  }

  async destroy(): Promise<void> {
    this.statusOverride = "stopping";
    await this.daytonaProvider.destroy(this.id);
    this.daytonaProvider.forgetSandbox(this.id);
    this.statusOverride = "stopped";
  }

  private requireCommandSuccess(
    result: CommandResult,
    operation: string
  ): void {
    if (result.exitCode === 0) {
      return;
    }
    throw new Error(
      `${operation} failed for sandbox ${this.id}: ${result.stderr || result.stdout || `exit ${result.exitCode}`}`
    );
  }

  private async runShell(
    command: string,
    options?: RunCommandOptions
  ): Promise<CommandResult> {
    const startedAt = Date.now();
    const timeoutSeconds =
      options?.timeout !== undefined
        ? toTimeoutSeconds(options.timeout + COMMAND_TIMEOUT_BUFFER_MS)
        : undefined;
    const response = await this.sandbox.process.executeCommand(
      command,
      options?.cwd,
      options?.env,
      timeoutSeconds
    );

    return {
      exitCode: response.exitCode,
      stdout: response.result ?? "",
      stderr: "",
      durationMs: Date.now() - startedAt,
    };
  }

  private mapFileInfo(basePath: string, file: DaytonaFileDetails): FileInfo {
    const resolvedPath =
      file.path ??
      (file.name
        ? joinPath(basePath, file.name)
        : joinPath(basePath, "unknown"));
    const name = file.name ?? resolvedPath.split("/").pop() ?? resolvedPath;

    return {
      path: resolvedPath,
      name,
      isDirectory: Boolean(file.isDir),
      size:
        typeof file.size === "number" && Number.isFinite(file.size)
          ? file.size
          : 0,
      modifiedAt: file.modTime ? new Date(file.modTime) : new Date(),
      permissions: file.mode,
    };
  }

  private createFileSystem(): SandboxFileSystem {
    return {
      read: async (path: string): Promise<string> => {
        const data = await this.sandbox.fs.downloadFile(path);
        return Buffer.from(data).toString("utf8");
      },

      readBytes: async (path: string): Promise<Uint8Array> => {
        const data = await this.sandbox.fs.downloadFile(path);
        return new Uint8Array(Buffer.from(data));
      },

      write: async (path: string, content: string): Promise<void> => {
        await this.sandbox.fs.uploadFile(Buffer.from(content, "utf8"), path);
      },

      writeBytes: async (path: string, data: Uint8Array): Promise<void> => {
        await this.sandbox.fs.uploadFile(Buffer.from(data), path);
      },

      list: async (path: string): Promise<FileInfo[]> => {
        const files = await this.sandbox.fs.listFiles(path);
        return files.map((file) => this.mapFileInfo(path, file));
      },

      remove: async (path: string): Promise<void> => {
        await this.sandbox.fs.deleteFile(path, true);
      },

      mkdir: async (path: string): Promise<void> => {
        await this.sandbox.fs.createFolder(path, "755");
      },

      exists: async (path: string): Promise<boolean> => {
        try {
          await this.sandbox.fs.getFileDetails(path);
          return true;
        } catch (error) {
          if (isNotFoundError(error)) {
            return false;
          }
          throw error;
        }
      },

      stat: async (path: string): Promise<FileInfo> => {
        const file = await this.sandbox.fs.getFileDetails(path);
        return this.mapFileInfo(path, file);
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
      run: (cmd: string, opts?: RunCommandOptions): Promise<CommandResult> =>
        this.runShell(cmd, opts),

      start: (
        cmd: string,
        opts?: StartCommandOptions
      ): Promise<RunningProcess> => {
        let resolved: CommandResult | null = null;
        const resultPromise = this.commands.run(cmd, {
          cwd: opts?.cwd,
          env: opts?.env,
        });

        return Promise.resolve({
          pid: -1,
          kill: () => Promise.resolve(),
          wait: async (): Promise<CommandResult> => {
            if (!resolved) {
              resolved = await resultPromise;
              if (resolved.stdout.length > 0) {
                opts?.onStdout?.(resolved.stdout);
              }
              if (resolved.stderr.length > 0) {
                opts?.onStderr?.(resolved.stderr);
              }
            }
            return resolved;
          },
        });
      },

      list: async (): Promise<Array<{ pid: number; command: string }>> => {
        const result = await this.commands.run(
          "ps -eo pid,args --no-headers 2>/dev/null || ps -A -o pid,command"
        );
        this.requireCommandSuccess(result, "list processes");

        return splitLines(result.stdout)
          .map((line) => {
            const match = line.trim().match(PROCESS_LIST_ENTRY_REGEX);
            if (!match) {
              return null;
            }
            const pid = Number.parseInt(match[1] ?? "", 10);
            const command = match[2]?.trim() ?? "";
            if (!Number.isFinite(pid) || command.length === 0) {
              return null;
            }
            return { pid, command };
          })
          .filter((entry): entry is { pid: number; command: string } =>
            Boolean(entry)
          );
      },

      kill: async (pid: number): Promise<void> => {
        const result = await this.commands.run(`kill -9 ${pid}`);
        this.requireCommandSuccess(result, "kill process");
      },
    };
  }

  private async executeCode(
    code: string,
    language: "python" | "javascript" | "bash"
  ): Promise<CodeExecutionResult> {
    const startedAt = Date.now();
    const command =
      language === "bash"
        ? code
        : buildInterpreterCommand(
            code,
            language === "python" ? "python3" : "node"
          );
    const result = await this.commands.run(command, {
      timeout: DEFAULT_TIMEOUT_MS,
      cwd: this.workspaceDir,
    });

    return {
      success: result.exitCode === 0,
      output: result.stdout,
      error:
        result.exitCode === 0
          ? undefined
          : result.stderr || `exit ${result.exitCode}`,
      logs: splitLines(result.stdout),
      artifacts: [],
      durationMs: Date.now() - startedAt,
    };
  }

  private createCodeRunner(): SandboxCodeRunner {
    return {
      run: (
        code: string,
        language: "python" | "javascript" | "bash" = "python"
      ): Promise<CodeExecutionResult> => this.executeCode(code, language),

      runWithStreaming: async (
        code: string,
        onOutput: (output: string) => void,
        language: "python" | "javascript" | "bash" = "python"
      ): Promise<CodeExecutionResult> => {
        const result = await this.executeCode(code, language);
        if (result.output.length > 0) {
          onOutput(result.output);
        }
        if (result.error) {
          onOutput(`[stderr] ${result.error}`);
        }
        return result;
      },
    };
  }
}
