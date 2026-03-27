import type { Database } from "@openbeam/db";
import { findContextEntry, upsertContextEntry } from "@openbeam/db";
import { generateEntryId, getParentUri } from "./uri";

export class DirectoryBuilder {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async ensureParents(teamId: string, uri: string): Promise<void> {
    let current = getParentUri(uri);
    while (current) {
      const id = generateEntryId(teamId, current);
      const existing = await findContextEntry(this.db, teamId, current);
      if (existing) {
        break;
      }
      await upsertContextEntry(this.db, {
        id,
        uri: current,
        teamId,
        ownerId: teamId,
        ownerType: "team",
        contextType: "resource",
        isLeaf: false,
        abstractText: `Directory: ${current.split("/").filter(Boolean).pop() ?? current}`,
      });
      current = getParentUri(current);
    }
  }

  async refreshDirectory(teamId: string, directoryUri: string): Promise<void> {
    const children = await this.db.contextEntry.findMany({
      where: { teamId, parentUri: directoryUri },
      select: { abstractText: true },
    });
    const summary = `Contains ${children.length} entries`;
    const id = generateEntryId(teamId, directoryUri);
    await upsertContextEntry(this.db, {
      id,
      uri: directoryUri,
      teamId,
      ownerId: teamId,
      ownerType: "team",
      contextType: "resource",
      isLeaf: false,
      abstractText: summary,
    });
  }
}
