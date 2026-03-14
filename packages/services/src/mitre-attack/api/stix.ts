import type {
  StixBaseObject,
  StixExternalReference,
  StixRelationship,
} from "@openbeam/types/services/connectors/mitre-attack";

export function filterStixObjects(
  objects: Record<string, unknown>[],
  type: string
): StixBaseObject[] {
  return objects.filter(
    (obj) => obj.type === type
  ) as unknown as StixBaseObject[];
}

export function buildRelationshipMap(
  relationships: StixRelationship[]
): Map<string, StixRelationship[]> {
  const map = new Map<string, StixRelationship[]>();

  for (const rel of relationships) {
    if (rel.revoked) {
      continue;
    }

    const existing = map.get(rel.source_ref);
    if (existing) {
      existing.push(rel);
    } else {
      map.set(rel.source_ref, [rel]);
    }
  }

  return map;
}

export function getExternalId(obj: StixBaseObject): string | undefined {
  return findMitreReference(obj.external_references)?.external_id;
}

export function getAttackUrl(obj: StixBaseObject): string | undefined {
  return findMitreReference(obj.external_references)?.url;
}

function findMitreReference(
  refs: StixExternalReference[] | undefined
): StixExternalReference | undefined {
  return refs?.find((ref) => ref.source_name === "mitre-attack");
}

export function isRevokedOrDeprecated(obj: Record<string, unknown>): boolean {
  return obj.revoked === true || obj.deprecated === true;
}
