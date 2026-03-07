import type {
  WorkspaceImportConfig,
  WorkspaceImportResult,
} from "@openbeam/types/services/workspace";
import type { WorkspaceDuckDB } from "./client";
import { WorkspaceDuckDBError } from "./client";
import { escapeSqlValue } from "./query";

type FieldMapping = {
  fieldId: string;
  fieldName: string;
  fieldType: string;
  sourceColumn: string;
};

async function resolveFieldMapping(
  db: WorkspaceDuckDB,
  objectName: string,
  columnMapping?: Record<string, string>
): Promise<{ objectId: string; mappings: FieldMapping[] }> {
  const objects = await db.query<{ id: string }>(
    `SELECT id FROM objects WHERE name = ${escapeSqlValue(objectName)}`
  );

  if (objects.length === 0) {
    throw new WorkspaceDuckDBError(
      `Object '${objectName}' not found`,
      "OBJECT_NOT_FOUND",
      false
    );
  }

  const firstObject = objects[0] as (typeof objects)[number];
  const objectId = firstObject.id;
  const fields = await db.query<{
    id: string;
    name: string;
    type: string;
  }>(
    `SELECT id, name, type FROM fields WHERE object_id = ${escapeSqlValue(objectId)} ORDER BY sort_order`
  );

  const mappings: FieldMapping[] = fields.map((field) => ({
    fieldId: field.id,
    fieldName: field.name,
    fieldType: field.type,
    sourceColumn: columnMapping?.[field.name] ?? field.name,
  }));

  return { objectId, mappings };
}

export async function importCSV(
  db: WorkspaceDuckDB,
  data: string,
  config: WorkspaceImportConfig
): Promise<WorkspaceImportResult> {
  const { objectId, mappings } = await resolveFieldMapping(
    db,
    config.objectName,
    config.columnMapping
  );

  const lines = data.split("\n").filter((line) => line.trim());
  if (lines.length < 2) {
    return { totalRows: 0, importedRows: 0, skippedRows: 0, errors: [] };
  }

  const firstLine = lines[0];
  if (!firstLine) {
    return { totalRows: 0, importedRows: 0, skippedRows: 0, errors: [] };
  }
  const headers = parseCSVLine(firstLine);
  const dataRows = lines.slice(1);
  const errors: WorkspaceImportResult["errors"] = [];
  let importedRows = 0;
  let skippedRows = 0;

  for (let i = 0; i < dataRows.length; i += config.batchSize) {
    const batch = dataRows.slice(i, i + config.batchSize);

    for (let j = 0; j < batch.length; j++) {
      const rowIndex = i + j + 1;
      const batchLine = batch[j];
      if (!batchLine) {
        continue;
      }
      const values = parseCSVLine(batchLine);

      if (values.length !== headers.length) {
        errors.push({
          row: rowIndex,
          message: `Column count mismatch: expected ${headers.length}, got ${values.length}`,
        });
        if (config.skipInvalidRows) {
          skippedRows += 1;
          continue;
        }
        break;
      }

      const entryId = crypto.randomUUID();
      const now = new Date().toISOString();
      const safeEntryId = escapeSqlValue(entryId);
      const safeObjectId = escapeSqlValue(objectId);
      const safeNow = escapeSqlValue(now);

      await db.execute(
        `INSERT INTO entries (id, object_id, created_at, updated_at) VALUES (${safeEntryId}, ${safeObjectId}, ${safeNow}, ${safeNow})`
      );

      for (const mapping of mappings) {
        const colIndex = headers.indexOf(mapping.sourceColumn);
        if (colIndex === -1) {
          continue;
        }

        const rawValue = values[colIndex];
        if (rawValue === "" || rawValue === undefined) {
          continue;
        }

        await db.execute(
          `INSERT INTO entry_fields (entry_id, field_id, value) VALUES (${safeEntryId}, ${escapeSqlValue(mapping.fieldId)}, ${escapeSqlValue(rawValue)})`
        );
      }

      importedRows += 1;
    }
  }

  return {
    totalRows: dataRows.length,
    importedRows,
    skippedRows,
    errors,
  };
}

export async function importJSON(
  db: WorkspaceDuckDB,
  records: Record<string, unknown>[],
  config: WorkspaceImportConfig
): Promise<WorkspaceImportResult> {
  const { objectId, mappings } = await resolveFieldMapping(
    db,
    config.objectName,
    config.columnMapping
  );

  const errors: WorkspaceImportResult["errors"] = [];
  let importedRows = 0;
  const skippedRows = 0;

  const safeObjectId = escapeSqlValue(objectId);

  for (const record of records) {
    const entryId = crypto.randomUUID();
    const now = new Date().toISOString();
    const safeEntryId = escapeSqlValue(entryId);
    const safeNow = escapeSqlValue(now);

    await db.execute(
      `INSERT INTO entries (id, object_id, created_at, updated_at) VALUES (${safeEntryId}, ${safeObjectId}, ${safeNow}, ${safeNow})`
    );

    for (const mapping of mappings) {
      const value = record[mapping.sourceColumn];
      if (value === null || value === undefined || value === "") {
        continue;
      }

      const stringValue =
        typeof value === "object" ? JSON.stringify(value) : String(value);

      await db.execute(
        `INSERT INTO entry_fields (entry_id, field_id, value) VALUES (${safeEntryId}, ${escapeSqlValue(mapping.fieldId)}, ${escapeSqlValue(stringValue)})`
      );
    }

    importedRows += 1;
  }

  return {
    totalRows: records.length,
    importedRows,
    skippedRows,
    errors,
  };
}

export async function importParquet(
  db: WorkspaceDuckDB,
  filePath: string,
  config: WorkspaceImportConfig
): Promise<WorkspaceImportResult> {
  const { objectId, mappings } = await resolveFieldMapping(
    db,
    config.objectName,
    config.columnMapping
  );

  const rows = await db.query<Record<string, unknown>>(
    `SELECT * FROM read_parquet(${escapeSqlValue(filePath)})`
  );

  const errors: WorkspaceImportResult["errors"] = [];
  let importedRows = 0;
  const safeObjectId = escapeSqlValue(objectId);

  for (const row of rows) {
    const entryId = crypto.randomUUID();
    const now = new Date().toISOString();
    const safeEntryId = escapeSqlValue(entryId);
    const safeNow = escapeSqlValue(now);

    await db.execute(
      `INSERT INTO entries (id, object_id, created_at, updated_at) VALUES (${safeEntryId}, ${safeObjectId}, ${safeNow}, ${safeNow})`
    );

    for (const mapping of mappings) {
      const value = row[mapping.sourceColumn];
      if (value === null || value === undefined) {
        continue;
      }

      const stringValue =
        typeof value === "object" ? JSON.stringify(value) : String(value);

      await db.execute(
        `INSERT INTO entry_fields (entry_id, field_id, value) VALUES (${safeEntryId}, ${escapeSqlValue(mapping.fieldId)}, ${escapeSqlValue(stringValue)})`
      );
    }

    importedRows += 1;
  }

  return {
    totalRows: rows.length,
    importedRows,
    skippedRows: 0,
    errors,
  };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }

  result.push(current.trim());
  return result;
}
