import type { WorkspaceDuckDB } from "./client";
import { escapeSqlValue, quoteIdentifier, sanitizeIdentifier } from "./query";

type FieldInfo = {
  id: string;
  name: string;
  type: string;
};

function viewName(objectName: string): string {
  return `v_${sanitizeIdentifier(objectName)}`;
}

function generatePivotViewSQL(
  objectName: string,
  objectId: string,
  fields: FieldInfo[]
): string {
  const safeViewName = viewName(objectName);
  const safeObjectId = escapeSqlValue(objectId);

  if (fields.length === 0) {
    return `CREATE OR REPLACE VIEW ${safeViewName} AS
SELECT e.id AS entry_id, e.created_at, e.updated_at
FROM entries e
WHERE e.object_id = ${safeObjectId}`;
  }

  const pivotColumns = fields.map((field) => {
    const alias = quoteIdentifier(field.name);
    const safeFieldId = escapeSqlValue(field.id);
    return `MAX(CASE WHEN f.id = ${safeFieldId} THEN ef.value END) AS ${alias}`;
  });

  return `CREATE OR REPLACE VIEW ${safeViewName} AS
SELECT
  e.id AS entry_id,
  e.created_at,
  e.updated_at,
  ${pivotColumns.join(",\n  ")}
FROM entries e
LEFT JOIN entry_fields ef ON ef.entry_id = e.id
LEFT JOIN fields f ON f.id = ef.field_id
WHERE e.object_id = ${safeObjectId}
GROUP BY e.id, e.created_at, e.updated_at`;
}

export async function generateViewForObject(
  db: WorkspaceDuckDB,
  objectId: string,
  objectName: string
): Promise<void> {
  const safeObjectId = escapeSqlValue(objectId);
  const fields = await db.query<FieldInfo>(
    `SELECT id, name, type FROM fields WHERE object_id = ${safeObjectId} ORDER BY sort_order`
  );

  const sql = generatePivotViewSQL(objectName, objectId, fields);
  await db.execute(sql);
}

export async function regenerateAllViews(db: WorkspaceDuckDB): Promise<void> {
  const objects = await db.query<{ id: string; name: string }>(
    "SELECT id, name FROM objects"
  );

  for (const obj of objects) {
    await generateViewForObject(db, obj.id, obj.name);
  }
}

export async function dropViewForObject(
  db: WorkspaceDuckDB,
  objectName: string
): Promise<void> {
  const safeViewName = viewName(objectName);
  await db.execute(`DROP VIEW IF EXISTS ${safeViewName}`);
}

export { generatePivotViewSQL };
