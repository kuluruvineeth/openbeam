import type { WorkspaceRelation } from "@openbeam/types/services/workspace";
import type { WorkspaceDuckDB } from "../duckdb/client";
import { escapeSqlValue } from "../duckdb/query";
import { getObjectsByIds, resolveDisplayField } from "./definitions";

type RelationFieldRow = {
  id: string;
  object_id: string;
  name: string;
  related_object_id: string;
  relationship_type: string;
};

type ReverseRelation = {
  fieldName: string;
  sourceObjectName: string;
  sourceObjectId: string;
  displayField: string;
  entries: Record<string, Array<{ id: string; label: string }>>;
};

export async function getRelationsForObject(
  db: WorkspaceDuckDB,
  objectId: string
): Promise<WorkspaceRelation[]> {
  const rows = await db.query<RelationFieldRow>(
    `SELECT id, object_id, name, related_object_id, relationship_type
     FROM fields
     WHERE object_id = ${escapeSqlValue(objectId)} AND type = 'relation' AND related_object_id IS NOT NULL
     ORDER BY sort_order`
  );

  return rows.map((row) => ({
    id: row.id,
    sourceObjectId: row.object_id,
    sourceFieldId: row.id,
    targetObjectId: row.related_object_id,
    relationshipType:
      row.relationship_type as WorkspaceRelation["relationshipType"],
  }));
}

export async function resolveRelationLabels(
  db: WorkspaceDuckDB,
  objectId: string,
  entries: Record<string, unknown>[]
): Promise<{
  labels: Record<string, Record<string, string>>;
  relatedObjectNames: Record<string, string>;
}> {
  const labels: Record<string, Record<string, string>> = {};
  const relatedObjectNames: Record<string, string> = {};

  const relationFields = await db.query<RelationFieldRow>(
    `SELECT id, object_id, name, related_object_id, relationship_type
     FROM fields
     WHERE object_id = ${escapeSqlValue(objectId)} AND type = 'relation' AND related_object_id IS NOT NULL`
  );

  const relatedObjectIds = relationFields.map((rf) => rf.related_object_id);
  const relatedObjectsMap = await getObjectsByIds(db, relatedObjectIds);

  for (const rf of relationFields) {
    const relatedObj = relatedObjectsMap.get(rf.related_object_id);
    if (!relatedObj) {
      continue;
    }

    relatedObjectNames[rf.name] = relatedObj.name;
    const displayFieldName = resolveDisplayField(relatedObj);

    const entryIds = new Set<string>();
    for (const entry of entries) {
      const val = entry[rf.name];
      if (val === null || val === undefined || val === "") {
        continue;
      }

      for (const id of parseRelationValue(String(val))) {
        entryIds.add(id);
      }
    }

    if (entryIds.size === 0) {
      labels[rf.name] = {};
      continue;
    }

    const idList = Array.from(entryIds)
      .map((id) => escapeSqlValue(id))
      .join(",");

    const displayRows = await db.query<{ entry_id: string; value: string }>(
      `SELECT e.id as entry_id, ef.value
       FROM entries e
       JOIN entry_fields ef ON ef.entry_id = e.id
       JOIN fields f ON f.id = ef.field_id
       WHERE e.id IN (${idList})
       AND f.object_id = ${escapeSqlValue(relatedObj.id)}
       AND f.name = ${escapeSqlValue(displayFieldName)}`
    );

    const labelMap: Record<string, string> = {};
    for (const row of displayRows) {
      labelMap[row.entry_id] = row.value || row.entry_id;
    }
    for (const id of entryIds) {
      if (!labelMap[id]) {
        labelMap[id] = id;
      }
    }

    labels[rf.name] = labelMap;
  }

  return { labels, relatedObjectNames };
}

export async function findReverseRelations(
  db: WorkspaceDuckDB,
  objectId: string
): Promise<ReverseRelation[]> {
  const reverseFields = await db.query<
    RelationFieldRow & { source_object_name: string }
  >(
    `SELECT f.id, f.object_id, f.name, f.related_object_id, f.relationship_type,
            o.name as source_object_name
     FROM fields f
     JOIN objects o ON o.id = f.object_id
     WHERE f.type = 'relation' AND f.related_object_id = ${escapeSqlValue(objectId)}`
  );

  const result: ReverseRelation[] = [];

  const sourceObjectIds = reverseFields.map((rrf) => rrf.object_id);
  const sourceObjectsMap = await getObjectsByIds(db, sourceObjectIds);

  for (const rrf of reverseFields) {
    const sourceObj = sourceObjectsMap.get(rrf.object_id);
    if (!sourceObj) {
      continue;
    }

    const displayFieldName = resolveDisplayField(sourceObj);

    const refRows = await db.query<{
      source_entry_id: string;
      target_value: string;
    }>(
      `SELECT ef.entry_id as source_entry_id, ef.value as target_value
       FROM entry_fields ef
       WHERE ef.field_id = ${escapeSqlValue(rrf.id)}
       AND ef.value IS NOT NULL AND ef.value != ''`
    );

    if (refRows.length === 0) {
      continue;
    }

    const sourceEntryIds = [...new Set(refRows.map((r) => r.source_entry_id))];
    const idList = sourceEntryIds.map((id) => escapeSqlValue(id)).join(",");

    const displayRows = await db.query<{ entry_id: string; value: string }>(
      `SELECT ef.entry_id, ef.value
       FROM entry_fields ef
       JOIN fields f ON f.id = ef.field_id
       WHERE ef.entry_id IN (${idList})
       AND f.name = ${escapeSqlValue(displayFieldName)}
       AND f.object_id = ${escapeSqlValue(rrf.object_id)}`
    );

    const displayMap = new Map(
      displayRows.map((r) => [r.entry_id, r.value || r.entry_id])
    );

    const entriesMap: Record<string, Array<{ id: string; label: string }>> = {};
    for (const row of refRows) {
      const targetIds = parseRelationValue(row.target_value);
      for (const targetId of targetIds) {
        const arr = entriesMap[targetId] ?? [];
        arr.push({
          id: row.source_entry_id,
          label: displayMap.get(row.source_entry_id) ?? row.source_entry_id,
        });
        entriesMap[targetId] = arr;
      }
    }

    result.push({
      fieldName: rrf.name,
      sourceObjectName: rrf.source_object_name,
      sourceObjectId: rrf.object_id,
      displayField: displayFieldName,
      entries: entriesMap,
    });
  }

  return result;
}

export function parseRelationValue(value: string): string[] {
  if (!value) {
    return [];
  }

  const trimmed = value.trim();

  if (trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map(String);
    }
    return [String(parsed)];
  }

  if (trimmed.includes(",")) {
    return trimmed
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return [trimmed];
}
