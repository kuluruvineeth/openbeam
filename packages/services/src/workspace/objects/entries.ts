import type {
  BulkCreateEntriesInput,
  BulkDeleteEntriesInput,
  CreateEntryInput,
  UpdateEntryInput,
  WorkspaceEntry,
} from "@openbeam/types/services/workspace";
import type { WorkspaceDuckDB } from "../duckdb/client";
import { WorkspaceDuckDBError } from "../duckdb/client";
import {
  escapeSqlValue,
  sanitizeIdentifier,
  sanitizeOrderBy,
} from "../duckdb/query";

type EntryRow = {
  entry_id: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
};

type FieldLookup = {
  id: string;
  name: string;
  type: string;
};

const ENTRY_ORDER_COLUMNS = new Set(["entry_id", "created_at", "updated_at"]);

async function resolveObject(
  db: WorkspaceDuckDB,
  objectId: string
): Promise<{ id: string; name: string }> {
  const objects = await db.query<{ id: string; name: string }>(
    `SELECT id, name FROM objects WHERE id = ${escapeSqlValue(objectId)}`
  );

  const first = objects[0];
  if (!first) {
    throw new WorkspaceDuckDBError(
      `Object with id '${objectId}' not found`,
      "OBJECT_NOT_FOUND",
      false
    );
  }

  return first;
}

async function getFieldLookup(
  db: WorkspaceDuckDB,
  objectId: string
): Promise<Map<string, FieldLookup>> {
  const fields = await db.query<FieldLookup>(
    `SELECT id, name, type FROM fields WHERE object_id = ${escapeSqlValue(objectId)} ORDER BY sort_order`
  );

  return new Map(fields.map((f) => [f.name, f]));
}

function pivotRowToEntry(row: EntryRow, objectId: string): WorkspaceEntry {
  const { entry_id, created_at, updated_at, ...fieldValues } = row;

  const values: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fieldValues)) {
    if (value !== null && value !== undefined) {
      values[key] = value;
    }
  }

  return {
    id: entry_id as string,
    objectId,
    values,
    createdAt: created_at as string,
    updatedAt: updated_at as string,
  };
}

export async function listEntries(
  db: WorkspaceDuckDB,
  objectName: string,
  options: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDir?: "ASC" | "DESC";
  } = {}
): Promise<{ entries: WorkspaceEntry[]; total: number }> {
  const objects = await db.query<{ id: string }>(
    `SELECT id FROM objects WHERE name = ${escapeSqlValue(objectName)}`
  );

  const firstObject = objects[0];
  if (!firstObject) {
    throw new WorkspaceDuckDBError(
      `Object '${objectName}' not found`,
      "OBJECT_NOT_FOUND",
      false
    );
  }

  const objectId = firstObject.id;
  const limit = Math.max(1, Math.min(options.limit ?? 200, 10_000));
  const offset = Math.max(0, options.offset ?? 0);
  const orderClause = sanitizeOrderBy(
    options.orderBy ?? "created_at",
    ENTRY_ORDER_COLUMNS,
    options.orderDir
  );

  const countResult = await db.query<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM entries WHERE object_id = ${escapeSqlValue(objectId)}`
  );
  const total = Number(countResult[0]?.cnt ?? 0);

  const safeViewName = `v_${sanitizeIdentifier(objectName)}`;
  const rows = await db.query<EntryRow>(
    `SELECT * FROM ${safeViewName} ORDER BY ${orderClause} LIMIT ${limit} OFFSET ${offset}`
  );

  const entries = rows.map((row) => pivotRowToEntry(row, objectId));

  return { entries, total };
}

export async function getEntry(
  db: WorkspaceDuckDB,
  objectName: string,
  entryId: string
): Promise<WorkspaceEntry | null> {
  const objects = await db.query<{ id: string }>(
    `SELECT id FROM objects WHERE name = ${escapeSqlValue(objectName)}`
  );

  const firstObject = objects[0];
  if (!firstObject) {
    throw new WorkspaceDuckDBError(
      `Object '${objectName}' not found`,
      "OBJECT_NOT_FOUND",
      false
    );
  }

  const objectId = firstObject.id;
  const safeViewName = `v_${sanitizeIdentifier(objectName)}`;

  const rows = await db.query<EntryRow>(
    `SELECT * FROM ${safeViewName} WHERE entry_id = ${escapeSqlValue(entryId)} LIMIT 1`
  );

  const firstRow = rows[0];
  if (!firstRow) {
    return null;
  }

  return pivotRowToEntry(firstRow, objectId);
}

export async function createEntry(
  db: WorkspaceDuckDB,
  input: CreateEntryInput
): Promise<WorkspaceEntry> {
  const obj = await resolveObject(db, input.objectId);
  const fieldMap = await getFieldLookup(db, obj.id);

  const entryId = crypto.randomUUID();
  const now = new Date().toISOString();
  const safeEntryId = escapeSqlValue(entryId);
  const safeObjectId = escapeSqlValue(obj.id);
  const safeNow = escapeSqlValue(now);

  await db.execute(
    `INSERT INTO entries (id, object_id, created_at, updated_at) VALUES (${safeEntryId}, ${safeObjectId}, ${safeNow}, ${safeNow})`
  );

  for (const [fieldName, value] of Object.entries(input.values)) {
    const field = fieldMap.get(fieldName);
    if (!field || value === null || value === undefined || value === "") {
      continue;
    }

    const stringValue =
      typeof value === "object" ? JSON.stringify(value) : String(value);

    await db.execute(
      `INSERT INTO entry_fields (entry_id, field_id, value) VALUES (${safeEntryId}, ${escapeSqlValue(field.id)}, ${escapeSqlValue(stringValue)})`
    );
  }

  return {
    id: entryId,
    objectId: obj.id,
    values: input.values,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateEntry(
  db: WorkspaceDuckDB,
  objectName: string,
  entryId: string,
  input: UpdateEntryInput
): Promise<WorkspaceEntry> {
  const objects = await db.query<{ id: string }>(
    `SELECT id FROM objects WHERE name = ${escapeSqlValue(objectName)}`
  );

  const firstObject = objects[0];
  if (!firstObject) {
    throw new WorkspaceDuckDBError(
      `Object '${objectName}' not found`,
      "OBJECT_NOT_FOUND",
      false
    );
  }

  const objectId = firstObject.id;
  const safeEntryId = escapeSqlValue(entryId);
  const safeObjectId = escapeSqlValue(objectId);

  const existing = await db.query<{ id: string }>(
    `SELECT id FROM entries WHERE id = ${safeEntryId} AND object_id = ${safeObjectId}`
  );

  if (existing.length === 0) {
    throw new WorkspaceDuckDBError(
      `Entry '${entryId}' not found`,
      "ENTRY_NOT_FOUND",
      false
    );
  }

  const fieldMap = await getFieldLookup(db, objectId);
  const now = new Date().toISOString();

  for (const [fieldName, value] of Object.entries(input.values)) {
    const field = fieldMap.get(fieldName);
    if (!field) {
      continue;
    }

    const safeFieldId = escapeSqlValue(field.id);

    if (value === null || value === undefined || value === "") {
      await db.execute(
        `DELETE FROM entry_fields WHERE entry_id = ${safeEntryId} AND field_id = ${safeFieldId}`
      );
      continue;
    }

    const stringValue =
      typeof value === "object" ? JSON.stringify(value) : String(value);

    const existingField = await db.query<{ entry_id: string }>(
      `SELECT entry_id FROM entry_fields WHERE entry_id = ${safeEntryId} AND field_id = ${safeFieldId}`
    );

    if (existingField.length > 0) {
      await db.execute(
        `UPDATE entry_fields SET value = ${escapeSqlValue(stringValue)} WHERE entry_id = ${safeEntryId} AND field_id = ${safeFieldId}`
      );
    } else {
      await db.execute(
        `INSERT INTO entry_fields (entry_id, field_id, value) VALUES (${safeEntryId}, ${safeFieldId}, ${escapeSqlValue(stringValue)})`
      );
    }
  }

  await db.execute(
    `UPDATE entries SET updated_at = ${escapeSqlValue(now)} WHERE id = ${safeEntryId}`
  );

  const entry = await getEntry(db, objectName, entryId);
  if (!entry) {
    throw new WorkspaceDuckDBError(
      `Entry '${entryId}' not found after update`,
      "ENTRY_NOT_FOUND",
      false
    );
  }
  return entry;
}

export async function deleteEntry(
  db: WorkspaceDuckDB,
  objectName: string,
  entryId: string
): Promise<void> {
  const objects = await db.query<{ id: string }>(
    `SELECT id FROM objects WHERE name = ${escapeSqlValue(objectName)}`
  );

  const firstObject = objects[0];
  if (!firstObject) {
    throw new WorkspaceDuckDBError(
      `Object '${objectName}' not found`,
      "OBJECT_NOT_FOUND",
      false
    );
  }

  const safeEntryId = escapeSqlValue(entryId);
  const safeObjectId = escapeSqlValue(firstObject.id);

  const existing = await db.query<{ id: string }>(
    `SELECT id FROM entries WHERE id = ${safeEntryId} AND object_id = ${safeObjectId}`
  );

  if (existing.length === 0) {
    throw new WorkspaceDuckDBError(
      `Entry '${entryId}' not found`,
      "ENTRY_NOT_FOUND",
      false
    );
  }

  await db.execute(`DELETE FROM entry_fields WHERE entry_id = ${safeEntryId}`);
  await db.execute(`DELETE FROM entries WHERE id = ${safeEntryId}`);
}

export async function bulkCreateEntries(
  db: WorkspaceDuckDB,
  input: BulkCreateEntriesInput
): Promise<{
  created: number;
  errors: Array<{ index: number; message: string }>;
}> {
  const obj = await resolveObject(db, input.objectId);
  const fieldMap = await getFieldLookup(db, obj.id);

  let created = 0;
  const errors: Array<{ index: number; message: string }> = [];

  const safeObjectId = escapeSqlValue(obj.id);

  const now = new Date().toISOString();
  const safeNow = escapeSqlValue(now);

  const entryValueRows: string[] = [];
  const fieldValueRows: string[] = [];

  for (const values of input.entries) {
    const entryId = crypto.randomUUID();
    const safeEntryId = escapeSqlValue(entryId);

    entryValueRows.push(
      `(${safeEntryId}, ${safeObjectId}, ${safeNow}, ${safeNow})`
    );

    for (const [fieldName, value] of Object.entries(values)) {
      const field = fieldMap.get(fieldName);
      if (!field || value === null || value === undefined || value === "") {
        continue;
      }

      const stringValue =
        typeof value === "object" ? JSON.stringify(value) : String(value);

      fieldValueRows.push(
        `(${safeEntryId}, ${escapeSqlValue(field.id)}, ${escapeSqlValue(stringValue)})`
      );
    }

    created += 1;
  }

  if (entryValueRows.length > 0) {
    await db.execute(
      `INSERT INTO entries (id, object_id, created_at, updated_at) VALUES ${entryValueRows.join(", ")}`
    );
  }

  if (fieldValueRows.length > 0) {
    await db.execute(
      `INSERT INTO entry_fields (entry_id, field_id, value) VALUES ${fieldValueRows.join(", ")}`
    );
  }

  return { created, errors };
}

export async function bulkDeleteEntries(
  db: WorkspaceDuckDB,
  input: BulkDeleteEntriesInput
): Promise<{ deleted: number }> {
  if (input.entryIds.length === 0) {
    return { deleted: 0 };
  }

  const idList = input.entryIds.map((id) => escapeSqlValue(id)).join(",");

  const existing = await db.query<{ id: string }>(
    `SELECT id FROM entries WHERE id IN (${idList})`
  );

  if (existing.length === 0) {
    return { deleted: 0 };
  }

  const existingIdList = existing
    .map((row) => escapeSqlValue(row.id))
    .join(",");

  await db.execute(
    `DELETE FROM entry_fields WHERE entry_id IN (${existingIdList})`
  );
  await db.execute(`DELETE FROM entries WHERE id IN (${existingIdList})`);

  return { deleted: existing.length };
}
