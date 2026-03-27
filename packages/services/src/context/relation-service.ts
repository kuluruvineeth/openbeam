import type { Database } from "@openbeam/db";
import {
  createContextRelation,
  deleteContextRelation,
  findContextEntry,
  findContextRelations,
} from "@openbeam/db";
import type { ContextEntry, ContextRelation } from "@openbeam/types/context";

export class RelationService {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async link(
    teamId: string,
    sourceUri: string,
    targetUri: string,
    reason?: string
  ): Promise<void> {
    await createContextRelation(this.db, {
      teamId,
      sourceUri,
      targetUri,
      reason,
    });
  }

  async unlink(
    teamId: string,
    sourceUri: string,
    targetUri: string
  ): Promise<void> {
    await deleteContextRelation(this.db, teamId, sourceUri, targetUri);
  }

  async relations(
    teamId: string,
    uri: string,
    limit = 10
  ): Promise<ContextRelation[]> {
    const asSource = await findContextRelations(this.db, teamId, uri);
    const asTarget = await this.db.contextRelation.findMany({
      where: { teamId, targetUri: uri },
    });
    const all = [...asSource, ...asTarget];
    const unique = Array.from(new Map(all.map((r) => [r.id, r])).values());
    return unique.slice(0, limit) as ContextRelation[];
  }

  async relatedEntries(
    teamId: string,
    uri: string,
    limit = 5
  ): Promise<ContextEntry[]> {
    const rels = await this.relations(teamId, uri, limit);
    const uris = new Set<string>();
    for (const rel of rels) {
      if (rel.sourceUri !== uri) {
        uris.add(rel.sourceUri);
      }
      if (rel.targetUri !== uri) {
        uris.add(rel.targetUri);
      }
    }
    const entries: ContextEntry[] = [];
    for (const relUri of uris) {
      const entry = await findContextEntry(this.db, teamId, relUri);
      if (entry) {
        entries.push(entry as ContextEntry);
      }
    }
    return entries.slice(0, limit);
  }
}
