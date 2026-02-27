import type {
  FieldType,
  WorkspaceFieldDefinition,
  WorkspaceObjectDefinition,
} from "@openplane/types/services/workspace";
import type { WorkspaceDuckDB } from "./client";
import { escapeSqlValue } from "./query";

const FIELD_TYPE_TO_DUCKDB_TYPE: Record<FieldType, string> = {
  text: "VARCHAR",
  email: "VARCHAR",
  phone: "VARCHAR",
  url: "VARCHAR",
  number: "DOUBLE",
  currency: "DOUBLE",
  percent: "DOUBLE",
  boolean: "BOOLEAN",
  date: "DATE",
  datetime: "TIMESTAMP",
  enum: "VARCHAR",
  multi_enum: "VARCHAR",
  relation: "VARCHAR",
  user: "VARCHAR",
  file: "VARCHAR",
  richtext: "VARCHAR",
};

const EAV_SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS objects (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE,
  description VARCHAR,
  icon VARCHAR,
  color VARCHAR,
  default_view VARCHAR DEFAULT 'table',
  display_field VARCHAR,
  immutable BOOLEAN DEFAULT false,
  team_id VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT current_timestamp,
  updated_at TIMESTAMP DEFAULT current_timestamp
);

CREATE TABLE IF NOT EXISTS fields (
  id VARCHAR PRIMARY KEY,
  object_id VARCHAR NOT NULL REFERENCES objects(id),
  name VARCHAR NOT NULL,
  type VARCHAR NOT NULL,
  required BOOLEAN DEFAULT false,
  default_value VARCHAR,
  enum_values VARCHAR,
  enum_colors VARCHAR,
  enum_multiple BOOLEAN DEFAULT false,
  related_object_id VARCHAR,
  relationship_type VARCHAR,
  sort_order INTEGER DEFAULT 0,
  description VARCHAR,
  created_at TIMESTAMP DEFAULT current_timestamp,
  updated_at TIMESTAMP DEFAULT current_timestamp
);

CREATE TABLE IF NOT EXISTS entries (
  id VARCHAR PRIMARY KEY,
  object_id VARCHAR NOT NULL REFERENCES objects(id),
  created_at TIMESTAMP DEFAULT current_timestamp,
  updated_at TIMESTAMP DEFAULT current_timestamp
);

CREATE TABLE IF NOT EXISTS entry_fields (
  entry_id VARCHAR NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  field_id VARCHAR NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
  value VARCHAR,
  PRIMARY KEY (entry_id, field_id)
);
`;

export async function initializeEAVSchema(db: WorkspaceDuckDB): Promise<void> {
  await db.execute(EAV_SCHEMA_DDL);
}

export function fieldTypeToDuckDB(fieldType: FieldType): string {
  return FIELD_TYPE_TO_DUCKDB_TYPE[fieldType] ?? "VARCHAR";
}

export function generateInsertObjectDDL(
  obj: WorkspaceObjectDefinition
): string {
  return `INSERT INTO objects (id, name, description, icon, color, default_view, display_field, immutable, team_id, created_at, updated_at)
VALUES (${escapeSqlValue(obj.id)}, ${escapeSqlValue(obj.name)}, ${escapeSqlValue(obj.description ?? "")}, ${escapeSqlValue(obj.icon ?? "")}, ${escapeSqlValue(obj.color ?? "")}, ${escapeSqlValue(obj.defaultView)}, ${escapeSqlValue(obj.displayField ?? null)}, ${escapeSqlValue(obj.immutable)}, ${escapeSqlValue(obj.teamId)}, ${escapeSqlValue(obj.createdAt)}, ${escapeSqlValue(obj.updatedAt)})`;
}

export function generateInsertFieldDDL(
  field: WorkspaceFieldDefinition,
  objectId: string
): string {
  const enumValuesJson = field.enumValues
    ? escapeSqlValue(JSON.stringify(field.enumValues))
    : "NULL";
  const enumColorsJson = field.enumColors
    ? escapeSqlValue(JSON.stringify(field.enumColors))
    : "NULL";

  return `INSERT INTO fields (id, object_id, name, type, required, default_value, enum_values, enum_colors, enum_multiple, related_object_id, relationship_type, sort_order, description)
VALUES (${escapeSqlValue(field.id)}, ${escapeSqlValue(objectId)}, ${escapeSqlValue(field.name)}, ${escapeSqlValue(field.type)}, ${escapeSqlValue(field.required)}, ${escapeSqlValue(field.defaultValue ?? null)}, ${enumValuesJson}, ${enumColorsJson}, ${escapeSqlValue(field.enumMultiple ?? false)}, ${escapeSqlValue(field.relatedObjectId ?? null)}, ${escapeSqlValue(field.relationshipType ?? null)}, ${escapeSqlValue(field.sortOrder)}, ${escapeSqlValue(field.description ?? "")})`;
}

export function generateDeleteObjectDDL(objectId: string): string[] {
  const safeObjectId = escapeSqlValue(objectId);
  return [
    `DELETE FROM entry_fields WHERE field_id IN (SELECT id FROM fields WHERE object_id = ${safeObjectId})`,
    `DELETE FROM entries WHERE object_id = ${safeObjectId}`,
    `DELETE FROM fields WHERE object_id = ${safeObjectId}`,
    `DELETE FROM objects WHERE id = ${safeObjectId}`,
  ];
}
