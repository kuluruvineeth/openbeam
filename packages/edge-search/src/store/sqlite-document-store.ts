import type { Database } from "bun:sqlite";
import type {
  EdgeDocumentListOptions,
  EdgeDocumentRecord,
  EdgeDocumentStore,
} from "@openplane/types/edge/search";

export class SQLiteDocumentStore implements EdgeDocumentStore {
  private readonly db: Database;
  private readonly tableName: string;

  constructor(db: Database, tableName = "edge_documents") {
    this.db = db;
    this.tableName = tableName;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id TEXT PRIMARY KEY,
        connector_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        document_type TEXT,
        checksum TEXT,
        metadata TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
  }

  put(documentId: string, document: EdgeDocumentRecord): Promise<void> {
    const metadata = document.metadata
      ? JSON.stringify(document.metadata)
      : null;
    this.db
      .query(
        `INSERT OR REPLACE INTO ${this.tableName} (id, connector_id, title, content, document_type, checksum, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        documentId,
        document.connectorId,
        document.title,
        document.content,
        document.documentType ?? null,
        document.checksum ?? null,
        metadata,
        document.createdAt,
        document.updatedAt
      );
    return Promise.resolve();
  }

  get(documentId: string): Promise<EdgeDocumentRecord | undefined> {
    const row = this.db
      .query<DocumentRow, [string]>(
        `SELECT * FROM ${this.tableName} WHERE id = ?`
      )
      .get(documentId);
    if (!row) {
      return Promise.resolve(undefined);
    }
    return Promise.resolve(rowToRecord(row));
  }

  delete(documentId: string): Promise<void> {
    this.db.query(`DELETE FROM ${this.tableName} WHERE id = ?`).run(documentId);
    return Promise.resolve();
  }

  has(documentId: string): Promise<boolean> {
    const row = this.db
      .query<{ c: number }, [string]>(
        `SELECT COUNT(*) as c FROM ${this.tableName} WHERE id = ?`
      )
      .get(documentId);
    return Promise.resolve((row?.c ?? 0) > 0);
  }

  list(options?: EdgeDocumentListOptions): Promise<EdgeDocumentRecord[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (options?.connectorId) {
      conditions.push("connector_id = ?");
      params.push(options.connectorId);
    }
    if (options?.documentType) {
      conditions.push("document_type = ?");
      params.push(options.documentType);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;

    const rows = this.db
      .query<DocumentRow, unknown[]>(
        `SELECT * FROM ${this.tableName} ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset);

    return Promise.resolve(rows.map(rowToRecord));
  }

  count(): Promise<number> {
    const row = this.db
      .query<{ c: number }, []>(`SELECT COUNT(*) as c FROM ${this.tableName}`)
      .get();
    return Promise.resolve(row?.c ?? 0);
  }

  clear(): Promise<void> {
    this.db.exec(`DELETE FROM ${this.tableName}`);
    return Promise.resolve();
  }
}

type DocumentRow = {
  id: string;
  connector_id: string;
  title: string;
  content: string;
  document_type: string | null;
  checksum: string | null;
  metadata: string | null;
  created_at: number;
  updated_at: number;
};

function rowToRecord(row: DocumentRow): EdgeDocumentRecord {
  return {
    documentId: row.id,
    connectorId: row.connector_id,
    title: row.title,
    content: row.content,
    documentType: row.document_type ?? undefined,
    checksum: row.checksum ?? undefined,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
