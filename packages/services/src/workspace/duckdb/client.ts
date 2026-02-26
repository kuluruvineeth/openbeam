import type { DuckDBConnection, DuckDBInstance } from "@duckdb/node-api";

export type WorkspaceDuckDBConfig = {
  storagePath?: string;
  maxMemoryMb?: number;
  threads?: number;
  readOnly?: boolean;
};

const DEFAULT_CONFIG: Required<WorkspaceDuckDBConfig> = {
  storagePath: ":memory:",
  maxMemoryMb: 256,
  threads: 2,
  readOnly: false,
};

export type WorkspaceDuckDB = {
  initialize(): Promise<void>;
  getConnection(): DuckDBConnection;
  execute(sql: string): Promise<void>;
  query<T = Record<string, unknown>>(sql: string): Promise<T[]>;
  close(): void;
  isInitialized(): boolean;
};

export class WorkspaceDuckDBError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, code: string, retryable = false) {
    super(message);
    this.name = "WorkspaceDuckDBError";
    this.code = code;
    this.retryable = retryable;
  }
}

const teamInstances = new Map<string, WorkspaceDuckDB>();
const teamInitLocks = new Map<string, Promise<void>>();

function resolveStoragePath(teamId: string): string {
  const baseDir = process.env.WORKSPACE_DUCKDB_DIR;
  if (baseDir) {
    return `${baseDir}/${teamId}/workspace.duckdb`;
  }
  return ":memory:";
}

export function createWorkspaceDuckDB(
  config: WorkspaceDuckDBConfig = {}
): WorkspaceDuckDB {
  const resolved = { ...DEFAULT_CONFIG, ...config };

  let instance: DuckDBInstance | null = null;
  let connection: DuckDBConnection | null = null;
  let initialized = false;

  async function initialize(): Promise<void> {
    if (initialized) {
      return;
    }

    const { DuckDBInstance: DuckDB } = await import("@duckdb/node-api");

    instance = await DuckDB.create(resolved.storagePath, {
      max_memory: `${resolved.maxMemoryMb}MB`,
      threads: String(resolved.threads),
      access_mode: resolved.readOnly ? "READ_ONLY" : "READ_WRITE",
    });

    connection = await instance.connect();
    initialized = true;
  }

  function getConnection(): DuckDBConnection {
    if (!connection) {
      throw new WorkspaceDuckDBError(
        "DuckDB not initialized",
        "CONNECTION_NOT_READY",
        true
      );
    }
    return connection;
  }

  async function execute(sql: string): Promise<void> {
    const conn = getConnection();
    await conn.run(sql);
  }

  async function query<T = Record<string, unknown>>(sql: string): Promise<T[]> {
    const conn = getConnection();
    const result = await conn.run(sql);
    const columns = result.columnNames();
    const rows = await result.getRows();

    return rows.map((row: unknown[]) => {
      const obj: Record<string, unknown> = {};
      for (let i = 0; i < columns.length; i++) {
        const value = row[i];
        const colName = columns[i] as string;
        obj[colName] = value instanceof Date ? value.toISOString() : value;
      }
      return obj as T;
    });
  }

  function close(): void {
    if (connection) {
      connection.closeSync();
      connection = null;
    }
    if (instance) {
      instance.closeSync();
      instance = null;
    }
    initialized = false;
  }

  function isInitialized(): boolean {
    return initialized;
  }

  return { initialize, getConnection, execute, query, close, isInitialized };
}

export async function getTeamDuckDB(teamId: string): Promise<WorkspaceDuckDB> {
  const existing = teamInstances.get(teamId);
  if (existing?.isInitialized()) {
    return existing;
  }

  const pendingInit = teamInitLocks.get(teamId);
  if (pendingInit) {
    await pendingInit;
    const ready = teamInstances.get(teamId);
    if (ready?.isInitialized()) {
      return ready;
    }
  }

  const db = createWorkspaceDuckDB({
    storagePath: resolveStoragePath(teamId),
  });

  const initPromise = db.initialize().then(() => {
    teamInstances.set(teamId, db);
    teamInitLocks.delete(teamId);
  });

  teamInitLocks.set(teamId, initPromise);
  await initPromise;

  return db;
}

export async function closeTeamDuckDB(teamId: string): Promise<void> {
  const db = teamInstances.get(teamId);
  if (db) {
    await db.close();
    teamInstances.delete(teamId);
  }
}

export async function closeAllDuckDBInstances(): Promise<void> {
  const closePromises = Array.from(teamInstances.entries()).map(
    async ([teamId, db]) => {
      await db.close();
      teamInstances.delete(teamId);
    }
  );
  await Promise.all(closePromises);
}
