import type { FieldType } from "@openplane/types/services/workspace";

const FIELD_DISPLAY_NAMES: Record<FieldType, string> = {
  text: "Text",
  email: "Email",
  phone: "Phone",
  url: "URL",
  number: "Number",
  currency: "Currency",
  percent: "Percent",
  boolean: "Boolean",
  date: "Date",
  datetime: "Date & Time",
  enum: "Select",
  multi_enum: "Multi Select",
  relation: "Relation",
  user: "User",
  file: "File",
  richtext: "Rich Text",
};

export function getFieldDisplayName(type: FieldType): string {
  return FIELD_DISPLAY_NAMES[type];
}

export function formatFieldValue(value: unknown, type: FieldType): string {
  if (value === null || value === undefined) {
    return "—";
  }

  switch (type) {
    case "boolean":
      return value ? "Yes" : "No";
    case "currency":
      return typeof value === "number"
        ? new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(value)
        : String(value);
    case "percent":
      return typeof value === "number"
        ? `${(value * 100).toFixed(1)}%`
        : String(value);
    case "date":
      return value instanceof Date
        ? value.toLocaleDateString()
        : new Date(String(value)).toLocaleDateString();
    case "datetime":
      return value instanceof Date
        ? value.toLocaleString()
        : new Date(String(value)).toLocaleString();
    case "multi_enum":
      return Array.isArray(value) ? value.join(", ") : String(value);
    default:
      return String(value);
  }
}

export function isNumericField(type: FieldType): boolean {
  return type === "number" || type === "currency" || type === "percent";
}
