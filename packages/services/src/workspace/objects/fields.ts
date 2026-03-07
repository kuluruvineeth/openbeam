import type {
  FieldType,
  WorkspaceFieldDefinition,
} from "@openbeam/types/services/workspace";
import { FIELD_TYPES } from "@openbeam/types/services/workspace";
import type { WorkspaceDuckDB } from "../duckdb/client";
import { WorkspaceDuckDBError } from "../duckdb/client";
import { escapeSqlValue } from "../duckdb/query";
import { generateViewForObject } from "../duckdb/views";

type FieldValidationError = {
  field: string;
  message: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^https?:\/\/.+/;
const PHONE_REGEX = /^[+\d\s()-]{6,20}$/;

export function validateFieldValue(
  value: unknown,
  fieldType: FieldType,
  fieldDef: WorkspaceFieldDefinition
): FieldValidationError | null {
  if (value === null || value === undefined || value === "") {
    if (fieldDef.required) {
      return { field: fieldDef.name, message: "Field is required" };
    }
    return null;
  }

  const stringValue =
    typeof value === "object" ? JSON.stringify(value) : String(value);

  switch (fieldType) {
    case "email":
      if (!EMAIL_REGEX.test(stringValue)) {
        return { field: fieldDef.name, message: "Invalid email format" };
      }
      break;

    case "url":
      if (!URL_REGEX.test(stringValue)) {
        return { field: fieldDef.name, message: "Invalid URL format" };
      }
      break;

    case "phone":
      if (!PHONE_REGEX.test(stringValue)) {
        return { field: fieldDef.name, message: "Invalid phone format" };
      }
      break;

    case "number":
    case "currency":
    case "percent":
      if (Number.isNaN(Number(stringValue))) {
        return { field: fieldDef.name, message: "Value must be numeric" };
      }
      break;

    case "boolean":
      if (!["true", "false", "1", "0"].includes(stringValue.toLowerCase())) {
        return { field: fieldDef.name, message: "Value must be boolean" };
      }
      break;

    case "date":
      if (Number.isNaN(Date.parse(stringValue))) {
        return { field: fieldDef.name, message: "Invalid date format" };
      }
      break;

    case "datetime":
      if (Number.isNaN(Date.parse(stringValue))) {
        return { field: fieldDef.name, message: "Invalid datetime format" };
      }
      break;

    case "enum":
      if (fieldDef.enumValues && !fieldDef.enumValues.includes(stringValue)) {
        return {
          field: fieldDef.name,
          message: `Value must be one of: ${fieldDef.enumValues.join(", ")}`,
        };
      }
      break;

    case "multi_enum": {
      const values = parseMultiEnumValue(stringValue);
      if (fieldDef.enumValues) {
        const invalid = values.filter((v) => !fieldDef.enumValues?.includes(v));
        if (invalid.length > 0) {
          return {
            field: fieldDef.name,
            message: `Invalid enum values: ${invalid.join(", ")}`,
          };
        }
      }
      break;
    }

    case "text":
    case "richtext":
    case "relation":
    case "user":
    case "file":
      break;

    default:
      break;
  }

  return null;
}

export function validateEntryValues(
  values: Record<string, unknown>,
  fields: WorkspaceFieldDefinition[]
): FieldValidationError[] {
  const errors: FieldValidationError[] = [];

  for (const field of fields) {
    const value = values[field.name];
    const error = validateFieldValue(value, field.type, field);
    if (error) {
      errors.push(error);
    }
  }

  return errors;
}

export function isValidFieldType(type: string): type is FieldType {
  return (FIELD_TYPES as readonly string[]).includes(type);
}

function parseMultiEnumValue(value: string): string[] {
  if (value.startsWith("[")) {
    return JSON.parse(value);
  }
  return value.split(",").map((v) => v.trim());
}

export async function addField(
  db: WorkspaceDuckDB,
  objectName: string,
  field: {
    name: string;
    type: FieldType;
    required?: boolean;
    defaultValue?: string;
    enumValues?: string[];
    enumColors?: Record<string, string>;
    relatedObjectId?: string;
    relationshipType?: string;
    description?: string;
  }
): Promise<WorkspaceFieldDefinition> {
  const objects = await db.query<{ id: string; name: string }>(
    `SELECT id, name FROM objects WHERE name = ${escapeSqlValue(objectName)}`
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

  const existingFields = await db.query<{ name: string }>(
    `SELECT name FROM fields WHERE object_id = ${escapeSqlValue(objectId)} AND name = ${escapeSqlValue(field.name)}`
  );

  if (existingFields.length > 0) {
    throw new WorkspaceDuckDBError(
      `Field '${field.name}' already exists on object '${objectName}'`,
      "FIELD_ALREADY_EXISTS",
      false
    );
  }

  const maxOrder = await db.query<{ max_order: number }>(
    `SELECT COALESCE(MAX(sort_order), -1) as max_order FROM fields WHERE object_id = ${escapeSqlValue(objectId)}`
  );

  const fieldId = crypto.randomUUID();
  const sortOrder = (maxOrder[0]?.max_order ?? -1) + 1;
  const now = new Date().toISOString();

  const enumValuesJson = field.enumValues
    ? escapeSqlValue(JSON.stringify(field.enumValues))
    : "NULL";
  const enumColorsJson = field.enumColors
    ? escapeSqlValue(JSON.stringify(field.enumColors))
    : "NULL";

  await db.execute(
    `INSERT INTO fields (id, object_id, name, type, required, default_value, enum_values, enum_colors, enum_multiple, related_object_id, relationship_type, sort_order, description, created_at, updated_at)
     VALUES (${escapeSqlValue(fieldId)}, ${escapeSqlValue(objectId)}, ${escapeSqlValue(field.name)}, ${escapeSqlValue(field.type)}, ${escapeSqlValue(field.required ?? false)}, ${escapeSqlValue(field.defaultValue ?? null)}, ${enumValuesJson}, ${enumColorsJson}, ${escapeSqlValue(field.type === "multi_enum")}, ${escapeSqlValue(field.relatedObjectId ?? null)}, ${escapeSqlValue(field.relationshipType ?? null)}, ${escapeSqlValue(sortOrder)}, ${escapeSqlValue(field.description ?? null)}, ${escapeSqlValue(now)}, ${escapeSqlValue(now)})`
  );

  await generateViewForObject(db, objectId, objectName);

  return {
    id: fieldId,
    name: field.name,
    type: field.type,
    required: field.required ?? false,
    defaultValue: field.defaultValue,
    enumValues: field.enumValues,
    enumColors: field.enumColors,
    relatedObjectId: field.relatedObjectId,
    relationshipType:
      field.relationshipType as WorkspaceFieldDefinition["relationshipType"],
    sortOrder,
    description: field.description,
  };
}

export async function removeField(
  db: WorkspaceDuckDB,
  objectName: string,
  fieldName: string
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

  const objectId = firstObject.id;

  const fields = await db.query<{ id: string }>(
    `SELECT id FROM fields WHERE object_id = ${escapeSqlValue(objectId)} AND name = ${escapeSqlValue(fieldName)}`
  );

  const firstField = fields[0];
  if (!firstField) {
    throw new WorkspaceDuckDBError(
      `Field '${fieldName}' not found on object '${objectName}'`,
      "FIELD_NOT_FOUND",
      false
    );
  }

  const safeFieldId = escapeSqlValue(firstField.id);

  await db.execute(`DELETE FROM entry_fields WHERE field_id = ${safeFieldId}`);
  await db.execute(`DELETE FROM fields WHERE id = ${safeFieldId}`);

  await generateViewForObject(db, objectId, objectName);
}
