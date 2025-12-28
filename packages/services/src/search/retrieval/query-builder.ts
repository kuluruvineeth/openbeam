import type { SearchFilters } from "../types";

export function escapeYql(value: string): string {
  return value.replace(/(["\\])/g, "\\$1");
}

export function buildFilterClause(filters?: SearchFilters): string | null {
  if (!filters) {
    return null;
  }

  const clauses: string[] = [];

  const addContainsAny = (field: string, values?: string[]) => {
    if (!values?.length) {
      return;
    }
    const conditions = values.map((v) => `${field} contains "${escapeYql(v)}"`);
    clauses.push(`(${conditions.join(" or ")})`);
  };

  addContainsAny("connector_type", filters.connectorTypes);
  addContainsAny("document_type", filters.documentTypes);
  addContainsAny("source_id", filters.sourceIds);
  addContainsAny("author_id", filters.authorIds);
  addContainsAny("status", filters.statuses);
  addContainsAny("priority", filters.priorities);

  if (filters.labels?.length) {
    const labelClauses = filters.labels.map(
      (l) => `labels contains "${escapeYql(l)}"`
    );
    clauses.push(`(${labelClauses.join(" or ")})`);
  }

  if (filters.fromDate) {
    clauses.push(`created_at >= ${filters.fromDate}`);
  }

  if (filters.toDate) {
    clauses.push(`created_at <= ${filters.toDate}`);
  }

  return clauses.length > 0 ? clauses.join(" and ") : null;
}

export function buildAccessControlClause(accessControlIds?: string[]): string {
  if (!accessControlIds?.length) {
    return "is_public = true";
  }

  const aclClauses = accessControlIds.map(
    (id) => `access_control contains "${escapeYql(id)}"`
  );

  return `(is_public = true or (${aclClauses.join(" or ")}))`;
}
