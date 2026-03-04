import type { Database } from "bun:sqlite";
import type { FTSProvider } from "@openplane/types/edge/search";

export class SQLiteFTS5Provider implements FTSProvider {
  private readonly db: Database;
  private readonly tableName: string;

  constructor(db: Database, tableName = "fts_documents") {
    this.db = db;
    this.tableName = tableName;
    this.db.exec(
      `CREATE VIRTUAL TABLE IF NOT EXISTS ${this.tableName} USING fts5(document_id, title, content)`
    );
  }

  index(documentId: string, title: string, content: string): Promise<void> {
    this.db
      .query(`DELETE FROM ${this.tableName} WHERE document_id = ?`)
      .run(documentId);
    this.db
      .query(
        `INSERT INTO ${this.tableName} (document_id, title, content) VALUES (?, ?, ?)`
      )
      .run(documentId, title, content);
    return Promise.resolve();
  }

  remove(documentId: string): Promise<void> {
    this.db
      .query(`DELETE FROM ${this.tableName} WHERE document_id = ?`)
      .run(documentId);
    return Promise.resolve();
  }

  search(
    query: string,
    limit: number
  ): Promise<Array<{ documentId: string; score: number }>> {
    if (!query.trim()) {
      return Promise.resolve([]);
    }

    const safeQuery = query.replace(/['"]/g, " ").trim();
    if (!safeQuery) {
      return Promise.resolve([]);
    }

    const rows = this.db
      .query<{ document_id: string; score: number }, [string, number]>(
        `SELECT document_id, -bm25(${this.tableName}) as score FROM ${this.tableName} WHERE ${this.tableName} MATCH ? ORDER BY score DESC LIMIT ?`
      )
      .all(safeQuery, limit);

    return Promise.resolve(
      rows.map((row) => ({
        documentId: row.document_id,
        score: row.score,
      }))
    );
  }

  clear(): Promise<void> {
    this.db.exec(`DELETE FROM ${this.tableName}`);
    return Promise.resolve();
  }

  documentCount(): Promise<number> {
    const row = this.db
      .query<{ count: number }, []>(
        `SELECT COUNT(*) as count FROM ${this.tableName}`
      )
      .get();
    return Promise.resolve(row?.count ?? 0);
  }
}
