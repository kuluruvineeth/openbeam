import type {
  CreateObjectInput,
  UpdateObjectInput,
  WorkspaceObjectDefinition,
} from "@openbeam/types/services/workspace";
import type { WorkspaceDuckDB } from "../duckdb/client";
import { WorkspaceDuckDBError } from "../duckdb/client";
import { escapeSqlValue } from "../duckdb/query";
import {
  generateDeleteObjectDDL,
  generateInsertFieldDDL,
  generateInsertObjectDDL,
} from "../duckdb/schema";
import { dropViewForObject, generateViewForObject } from "../duckdb/views";

const NAME_PATTERN = /\bname\b/i;
const TITLE_PATTERN = /\btitle\b/i;

type ObjectRow = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  default_view: string;
  display_field: string | null;
  immutable: boolean;
  team_id: string;
  created_at: string;
  updated_at: string;
};

type FieldRow = {
  id: string;
  object_id: string;
  name: string;
  type: string;
  required: boolean;
  default_value: string | null;
  enum_values: string | null;
  enum_colors: string | null;
  enum_multiple: boolean;
  related_object_id: string | null;
  relationship_type: string | null;
  sort_order: number;
  description: string | null;
  created_at: string;
  updated_at: string;
};

function rowToObjectDefinition(
  row: ObjectRow,
  fields: FieldRow[]
): WorkspaceObjectDefinition {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    icon: row.icon ?? undefined,
    color: row.color ?? undefined,
    defaultView:
      (row.default_view as WorkspaceObjectDefinition["defaultView"]) ?? "table",
    displayField: row.display_field ?? undefined,
    immutable: row.immutable,
    teamId: row.team_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    fields: fields.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type as WorkspaceObjectDefinition["fields"][number]["type"],
      required: f.required,
      defaultValue: f.default_value ?? undefined,
      enumValues: f.enum_values ? JSON.parse(f.enum_values) : undefined,
      enumColors: f.enum_colors ? JSON.parse(f.enum_colors) : undefined,
      enumMultiple: f.enum_multiple,
      relatedObjectId: f.related_object_id ?? undefined,
      relationshipType:
        f.relationship_type as WorkspaceObjectDefinition["fields"][number]["relationshipType"],
      sortOrder: f.sort_order,
      description: f.description ?? undefined,
    })),
  };
}

export async function listObjects(
  db: WorkspaceDuckDB,
  teamId: string
): Promise<WorkspaceObjectDefinition[]> {
  const objects = await db.query<ObjectRow>(
    `SELECT * FROM objects WHERE team_id = ${escapeSqlValue(teamId)} ORDER BY name`
  );

  if (objects.length === 0) {
    return [];
  }

  const objectIds = objects.map((obj) => escapeSqlValue(obj.id)).join(",");

  const allFields = await db.query<FieldRow>(
    `SELECT * FROM fields WHERE object_id IN (${objectIds}) ORDER BY sort_order`
  );

  const fieldsByObjectId = new Map<string, FieldRow[]>();
  for (const field of allFields) {
    const existing = fieldsByObjectId.get(field.object_id) ?? [];
    existing.push(field);
    fieldsByObjectId.set(field.object_id, existing);
  }

  return objects.map((obj) =>
    rowToObjectDefinition(obj, fieldsByObjectId.get(obj.id) ?? [])
  );
}

export async function getObject(
  db: WorkspaceDuckDB,
  objectName: string
): Promise<WorkspaceObjectDefinition | null> {
  const objects = await db.query<ObjectRow>(
    `SELECT * FROM objects WHERE name = ${escapeSqlValue(objectName)} LIMIT 1`
  );

  const obj = objects[0];
  if (!obj) {
    return null;
  }

  const fields = await db.query<FieldRow>(
    `SELECT * FROM fields WHERE object_id = ${escapeSqlValue(obj.id)} ORDER BY sort_order`
  );

  return rowToObjectDefinition(obj, fields);
}

export async function getObjectById(
  db: WorkspaceDuckDB,
  objectId: string
): Promise<WorkspaceObjectDefinition | null> {
  const objects = await db.query<ObjectRow>(
    `SELECT * FROM objects WHERE id = ${escapeSqlValue(objectId)} LIMIT 1`
  );

  const obj = objects[0];
  if (!obj) {
    return null;
  }

  const fields = await db.query<FieldRow>(
    `SELECT * FROM fields WHERE object_id = ${escapeSqlValue(obj.id)} ORDER BY sort_order`
  );

  return rowToObjectDefinition(obj, fields);
}

export async function getObjectsByIds(
  db: WorkspaceDuckDB,
  objectIds: string[]
): Promise<Map<string, WorkspaceObjectDefinition>> {
  if (objectIds.length === 0) {
    return new Map();
  }

  const uniqueIds = [...new Set(objectIds)];
  const idList = uniqueIds.map((id) => escapeSqlValue(id)).join(",");

  const objects = await db.query<ObjectRow>(
    `SELECT * FROM objects WHERE id IN (${idList})`
  );

  if (objects.length === 0) {
    return new Map();
  }

  const foundIds = objects.map((obj) => escapeSqlValue(obj.id)).join(",");
  const allFields = await db.query<FieldRow>(
    `SELECT * FROM fields WHERE object_id IN (${foundIds}) ORDER BY sort_order`
  );

  const fieldsByObjectId = new Map<string, FieldRow[]>();
  for (const field of allFields) {
    const existing = fieldsByObjectId.get(field.object_id) ?? [];
    existing.push(field);
    fieldsByObjectId.set(field.object_id, existing);
  }

  const result = new Map<string, WorkspaceObjectDefinition>();
  for (const obj of objects) {
    result.set(
      obj.id,
      rowToObjectDefinition(obj, fieldsByObjectId.get(obj.id) ?? [])
    );
  }
  return result;
}

export async function createObject(
  db: WorkspaceDuckDB,
  input: CreateObjectInput,
  teamId: string
): Promise<WorkspaceObjectDefinition> {
  const existing = await db.query<{ id: string }>(
    `SELECT id FROM objects WHERE name = ${escapeSqlValue(input.name)}`
  );

  if (existing.length > 0) {
    throw new WorkspaceDuckDBError(
      `Object '${input.name}' already exists`,
      "OBJECT_ALREADY_EXISTS",
      false
    );
  }

  const now = new Date().toISOString();
  const objectId = crypto.randomUUID();

  const obj: WorkspaceObjectDefinition = {
    id: objectId,
    name: input.name,
    description: input.description,
    icon: input.icon,
    color: input.color,
    defaultView: input.defaultView ?? "table",
    immutable: false,
    teamId,
    createdAt: now,
    updatedAt: now,
    fields: input.fields.map((f, idx) => ({
      id: crypto.randomUUID(),
      name: f.name,
      type: f.type,
      required: f.required ?? false,
      defaultValue: f.defaultValue,
      enumValues: f.enumValues,
      enumColors: f.enumColors,
      relatedObjectId: f.relatedObjectId,
      relationshipType: f.relationshipType,
      sortOrder: idx,
      description: f.description,
    })),
  };

  await db.execute(generateInsertObjectDDL(obj));

  if (obj.fields.length > 0) {
    const fieldStatements = obj.fields.map((field) =>
      generateInsertFieldDDL(field, objectId)
    );
    await db.execute(fieldStatements.join(";\n"));
  }

  await generateViewForObject(db, objectId, obj.name);

  return obj;
}

export async function updateObject(
  db: WorkspaceDuckDB,
  objectName: string,
  input: UpdateObjectInput
): Promise<WorkspaceObjectDefinition> {
  const existing = await getObject(db, objectName);
  if (!existing) {
    throw new WorkspaceDuckDBError(
      `Object '${objectName}' not found`,
      "OBJECT_NOT_FOUND",
      false
    );
  }

  if (existing.immutable) {
    throw new WorkspaceDuckDBError(
      `Object '${objectName}' is immutable`,
      "OBJECT_IMMUTABLE",
      false
    );
  }

  const setClauses: string[] = [];
  const now = new Date().toISOString();

  if (input.name) {
    setClauses.push(`name = ${escapeSqlValue(input.name)}`);
  }
  if (input.description !== undefined) {
    setClauses.push(`description = ${escapeSqlValue(input.description ?? "")}`);
  }
  if (input.icon !== undefined) {
    setClauses.push(`icon = ${escapeSqlValue(input.icon ?? "")}`);
  }
  if (input.color !== undefined) {
    setClauses.push(`color = ${escapeSqlValue(input.color ?? "")}`);
  }
  if (input.defaultView) {
    setClauses.push(`default_view = ${escapeSqlValue(input.defaultView)}`);
  }
  if (input.displayField !== undefined) {
    setClauses.push(
      input.displayField
        ? `display_field = ${escapeSqlValue(input.displayField)}`
        : "display_field = NULL"
    );
  }

  setClauses.push(`updated_at = ${escapeSqlValue(now)}`);

  await db.execute(
    `UPDATE objects SET ${setClauses.join(", ")} WHERE id = ${escapeSqlValue(existing.id)}`
  );

  if (input.name && input.name !== existing.name) {
    await dropViewForObject(db, existing.name);
    await generateViewForObject(db, existing.id, input.name);
  }

  const updated = await getObjectById(db, existing.id);
  if (!updated) {
    throw new Error(`Object "${existing.id}" not found after update`);
  }
  return updated;
}

export async function deleteObject(
  db: WorkspaceDuckDB,
  objectName: string
): Promise<void> {
  const existing = await getObject(db, objectName);
  if (!existing) {
    throw new WorkspaceDuckDBError(
      `Object '${objectName}' not found`,
      "OBJECT_NOT_FOUND",
      false
    );
  }

  if (existing.immutable) {
    throw new WorkspaceDuckDBError(
      `Object '${objectName}' is immutable`,
      "OBJECT_IMMUTABLE",
      false
    );
  }

  await dropViewForObject(db, existing.name);

  const statements = generateDeleteObjectDDL(existing.id);
  for (const stmt of statements) {
    await db.execute(stmt);
  }
}

export function resolveDisplayField(obj: WorkspaceObjectDefinition): string {
  if (obj.displayField) {
    return obj.displayField;
  }

  const nameField = obj.fields.find(
    (f) => NAME_PATTERN.test(f.name) || TITLE_PATTERN.test(f.name)
  );
  if (nameField) {
    return nameField.name;
  }

  const textField = obj.fields.find((f) => f.type === "text");
  if (textField) {
    return textField.name;
  }

  return obj.fields[0]?.name ?? "id";
}
