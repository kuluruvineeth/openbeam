import type { Database } from "bun:sqlite";
import type { EdgeConfig } from "@openbeam/types/edge/config";
import { EdgeConfigSchema } from "@openbeam/types/edge/config";
import type { EdgeTier } from "@openbeam/types/edge/tiers";

const EDGE_CONFIG_DDL = `
  CREATE TABLE IF NOT EXISTS edge_config (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at INTEGER
  )
`;

type ConfigListener = (config: EdgeConfig) => void;

export class EdgeConfigManager {
  private readonly db: Database;
  private readonly listeners: Set<ConfigListener> = new Set();

  constructor(db: Database) {
    this.db = db;
    this.db.exec(EDGE_CONFIG_DDL);
  }

  load(nodeId: string, tier: EdgeTier): EdgeConfig {
    const stored = this.readStored();

    return EdgeConfigSchema.parse({
      ...stored,
      nodeId,
      tier,
    });
  }

  save(config: EdgeConfig): void {
    const validated = EdgeConfigSchema.parse(config);
    const now = Date.now();

    const stmt = this.db.query(
      "INSERT OR REPLACE INTO edge_config (key, value, updated_at) VALUES (?, ?, ?)"
    );

    for (const [key, value] of Object.entries(validated)) {
      stmt.run(key, JSON.stringify(value), now);
    }

    this.notifyReload(validated);
  }

  update(nodeId: string, partial: Partial<EdgeConfig>): EdgeConfig {
    const stored = this.readStored();

    const tier =
      partial.tier ?? (stored.tier as EdgeTier | undefined) ?? "standard";

    const merged = EdgeConfigSchema.parse({
      nodeId,
      tier,
      ...stored,
      ...partial,
    });

    this.save(merged);
    return merged;
  }

  onReload(listener: ConfigListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notifyReload(config: EdgeConfig): void {
    for (const listener of this.listeners) {
      listener(config);
    }
  }

  private readStored(): Record<string, unknown> {
    const rows = this.db
      .query<{ key: string; value: string }, []>(
        "SELECT key, value FROM edge_config"
      )
      .all();

    const stored: Record<string, unknown> = {};
    for (const row of rows) {
      stored[row.key] = JSON.parse(row.value);
    }
    return stored;
  }
}
