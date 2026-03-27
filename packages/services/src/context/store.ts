import type { Database } from "@openbeam/db";
import {
  createContextRelation,
  deleteContextEntry as deleteContextEntryDb,
  deleteContextRelation as deleteContextRelationDb,
  findContextEntry,
  findContextRelations,
  incrementActiveCount,
  listContextChildren,
  upsertContextEntry,
} from "@openbeam/db";
import { getContextCache } from "@openbeam/redis";
import type {
  ContextEntry,
  ContextRelation,
  UpdateContextEntry,
} from "@openbeam/types/context";
import { vespaClient } from "@openbeam/vespa";
import { generateEntryId, getParentUri } from "./uri";

const noop = Function.prototype as () => void;

export interface TreeNode {
  uri: string;
  abstractText: string;
  contextType: string;
  isLeaf: boolean;
  children: TreeNode[];
}

interface CreateInput {
  uri: string;
  parentUri?: string | null;
  teamId: string;
  ownerId: string;
  ownerType: string;
  contextType: string;
  category?: string | null;
  isLeaf?: boolean;
  abstractText: string;
  overview?: string | null;
  content?: string | null;
}

export class ContextStore {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async create(input: CreateInput): Promise<ContextEntry> {
    const id = generateEntryId(input.teamId, input.uri);
    const parentUri = input.parentUri ?? getParentUri(input.uri);

    const entry = await upsertContextEntry(this.db, {
      id,
      uri: input.uri,
      parentUri: parentUri ?? undefined,
      teamId: input.teamId,
      ownerId: input.ownerId,
      ownerType: input.ownerType,
      contextType: input.contextType,
      category: input.category ?? undefined,
      isLeaf: input.isLeaf ?? true,
      abstractText: input.abstractText,
      overview: input.overview ?? undefined,
      content: input.content ?? undefined,
    });

    const cache = getContextCache();
    await cache.invalidateL0(input.teamId, input.uri);

    return entry as ContextEntry;
  }

  async read(teamId: string, uri: string): Promise<ContextEntry | null> {
    const entry = await findContextEntry(this.db, teamId, uri);
    return (entry as ContextEntry) ?? null;
  }

  async readL0(teamId: string, uri: string): Promise<string | null> {
    const cache = getContextCache();
    const cached = await cache.getL0(teamId, uri);
    if (cached) {
      return cached;
    }

    const entry = await findContextEntry(this.db, teamId, uri);
    if (!entry) {
      return null;
    }

    await cache.setL0(teamId, uri, entry.abstractText);
    return entry.abstractText;
  }

  async readL1(teamId: string, uri: string): Promise<string | null> {
    const entry = await findContextEntry(this.db, teamId, uri);
    return entry?.overview ?? null;
  }

  async readL2(teamId: string, uri: string): Promise<string | null> {
    const entry = await findContextEntry(this.db, teamId, uri);
    return entry?.content ?? null;
  }

  async update(
    teamId: string,
    uri: string,
    data: UpdateContextEntry
  ): Promise<ContextEntry> {
    const id = generateEntryId(teamId, uri);

    const existing = await findContextEntry(this.db, teamId, uri);
    if (!existing) {
      throw new Error(`Context entry not found: ${uri}`);
    }

    const entry = await upsertContextEntry(this.db, {
      id,
      uri,
      teamId,
      ownerId: existing.ownerId,
      ownerType: existing.ownerType,
      contextType: existing.contextType,
      abstractText: data.abstractText ?? existing.abstractText,
      overview: data.overview ?? existing.overview ?? undefined,
      content: data.content ?? existing.content ?? undefined,
      category: data.category ?? existing.category ?? undefined,
      isLeaf: data.isLeaf ?? existing.isLeaf,
    });

    const cache = getContextCache();
    await cache.invalidateL0(teamId, uri);

    return entry as ContextEntry;
  }

  async delete(teamId: string, uri: string): Promise<void> {
    const id = generateEntryId(teamId, uri);

    await deleteContextEntryDb(this.db, teamId, uri);

    const cache = getContextCache();
    await cache.invalidateL0(teamId, uri);

    try {
      await vespaClient.deleteContextEntry(id);
    } catch {
      return;
    }
  }

  async list(teamId: string, parentUri: string): Promise<ContextEntry[]> {
    const entries = await listContextChildren(this.db, teamId, parentUri);
    return entries as ContextEntry[];
  }

  tree(teamId: string, rootUri: string, maxDepth = 3): Promise<TreeNode[]> {
    return this.buildTree(teamId, rootUri, 0, maxDepth);
  }

  async link(
    teamId: string,
    sourceUri: string,
    targetUri: string,
    reason?: string
  ): Promise<void> {
    await createContextRelation(this.db, {
      sourceUri,
      targetUri,
      teamId,
      reason,
    });
  }

  async unlink(
    teamId: string,
    sourceUri: string,
    targetUri: string
  ): Promise<void> {
    await deleteContextRelationDb(this.db, teamId, sourceUri, targetUri);
  }

  async relations(teamId: string, uri: string): Promise<ContextRelation[]> {
    const outgoing = await findContextRelations(this.db, teamId, uri);
    return outgoing as ContextRelation[];
  }

  async touch(teamId: string, uri: string): Promise<void> {
    const cache = getContextCache();
    await cache.incrementHotness(teamId, uri);
    incrementActiveCount(this.db, teamId, uri).catch(noop);
  }

  private async buildTree(
    teamId: string,
    parentUri: string,
    depth: number,
    maxDepth: number
  ): Promise<TreeNode[]> {
    if (depth >= maxDepth) {
      return [];
    }

    const children = await listContextChildren(this.db, teamId, parentUri);

    const nodes: TreeNode[] = [];
    for (const child of children) {
      const childNode: TreeNode = {
        uri: child.uri,
        abstractText: child.abstractText,
        contextType: child.contextType,
        isLeaf: child.isLeaf,
        children: child.isLeaf
          ? []
          : await this.buildTree(teamId, child.uri, depth + 1, maxDepth),
      };
      nodes.push(childNode);
    }

    return nodes;
  }
}
