export function buildAirtableRecordUrl(
  baseId: string,
  tableId: string,
  recordId: string
): string {
  return `https://airtable.com/${baseId}/${tableId}/${recordId}`;
}

export function buildAirtableTableUrl(baseId: string, tableId: string): string {
  return `https://airtable.com/${baseId}/${tableId}`;
}

export function buildAirtableBaseUrl(baseId: string): string {
  return `https://airtable.com/${baseId}`;
}

export function fieldValueToString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        if (typeof v === "object" && v !== null && "name" in v) {
          return (v as { name: string }).name;
        }
        return fieldValueToString(v);
      })
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if ("name" in obj && typeof obj.name === "string") {
      return obj.name;
    }
    if ("url" in obj && typeof obj.url === "string") {
      return obj.url;
    }
    if ("email" in obj && typeof obj.email === "string") {
      return obj.email;
    }
    return JSON.stringify(value);
  }
  return String(value);
}
